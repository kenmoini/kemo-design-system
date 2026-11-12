'use client'
import { Portal } from '@ark-ui/react/portal'
import { TriangleAlert } from 'lucide-react'
import { type ReactNode, useEffect, useRef, useState } from 'react'
import { Box, Grid, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Button, CloseButton, Drawer, Heading, Text, Tooltip } from '../../components/ui'
import { MEDIA_LG, useMediaQuery } from '../../layouts/app-shell'
import {
  ActionMenu,
  SchemaBrowser,
  YamlEditor,
  type YamlEditorInstance,
  type YamlProblem,
} from '../../widgets'
import { ConfirmDialog } from '../access/confirm-dialog'
import { errorMessage, FormError, useRefocusAfter } from '../access/forms/form-fields'
import { downloadText } from './download'
import { ShortcutsDialog } from './shortcuts-dialog'
import type { ResourceYamlTabProps } from './types'

type Path = (string | number)[]

/** The editor fills the tab (min 32rem); the `lg` schema panel beside it matches it. */
const EDITOR_HEIGHT = 'max(32rem, calc(100dvh - 22rem))'

/** "web.yaml" → "web.clean.yaml". */
const cleanFileName = (fileName: string) => `${fileName.replace(/\.ya?ml$/i, '')}.clean.yaml`

function sameProblems(a: YamlProblem[], b: YamlProblem[]): boolean {
  return (
    a.length === b.length &&
    a.every((p, i) => {
      const q = b[i]!
      return (
        p.from === q.from &&
        p.to === q.to &&
        p.line === q.line &&
        p.message === q.message &&
        p.severity === q.severity
      )
    })
  )
}

/**
 * The YAML of any resource in a CodeMirror editor: Save (blocked while the text has a problem),
 * Reload (asks before discarding edits), Download (as is, or clean), a status line, the problems
 * under the editor, and a schema browser that follows the cursor (a panel beside the editor on
 * `lg`, a modal Drawer below). The host owns the draft, so edits survive tab and route changes.
 */
export function ResourceYamlTab({
  yamlText,
  draft,
  onDraftChange,
  schema,
  onSave,
  onReload,
  fileName,
  cleanText,
  mode = 'edit',
  createControls,
  serverChanged = false,
}: ResourceYamlTabProps) {
  const isLg = useMediaQuery(MEDIA_LG)
  const [problems, setProblems] = useState<YamlProblem[]>([])
  const [schemaOpen, setSchemaOpen] = useState(false)
  // The browser's path: the cursor's, until the reader drills elsewhere (the next move resets it).
  const [browserPath, setBrowserPath] = useState<Path>([])
  const cursorPath = useRef<Path>([])
  const [confirmReload, setConfirmReload] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  // Save checks the editor's text itself, so it waits for CodeMirror.
  const [editorReady, setEditorReady] = useState(false)
  const editor = useRef<YamlEditorInstance | null>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  const schemaToggleRef = useRef<HTMLButtonElement>(null)
  // A field picked in the modal Drawer closes it and hands focus to the editor at that key.
  const focusEditorOnClose = useRef(false)
  useRefocusAfter(saveRef, saving)

  const create = mode === 'create'
  const text = draft ?? yamlText
  const dirty = draft !== undefined && draft !== yamlText
  const ready = create ? text.trim().length > 0 : dirty
  const blocked = ready && problems.length > 0
  const schemaPanel = schema !== undefined && schemaOpen && isLg

  // The newest text: edits land here at once, ahead of the host's re-render.
  const latestText = useRef(text)
  useEffect(() => {
    latestText.current = text
  }, [text])

  const showProblems = (next: YamlProblem[]) =>
    setProblems((prev) => (sameProblems(prev, next) ? prev : next))

  const save = async () => {
    const instance = editor.current
    if (!ready || saving || !instance) return
    // The linter runs half a second after an edit: check the text being sent, not the last run.
    const now = instance.problemsNow()
    if (now.length > 0) {
      showProblems(now)
      return
    }
    const saved = instance.view.state.doc.toString()
    setSaving(true)
    setSaveError(null)
    try {
      await onSave(saved)
      // Edits made while the save ran stay as the draft.
      if (latestText.current === saved) onDraftChange(undefined)
    } catch (cause) {
      setSaveError(errorMessage(cause))
    } finally {
      setSaving(false)
    }
  }

  const reload = () => {
    setSaveError(null)
    if (dirty) {
      setConfirmReload(true)
      return
    }
    if (draft !== undefined) onDraftChange(undefined)
    onReload?.()
  }

  const discard = () => {
    setSaveError(null)
    onDraftChange(undefined)
    onReload?.()
  }

  const toggleSchema = () => {
    if (!schemaOpen) setBrowserPath(cursorPath.current)
    setSchemaOpen(!schemaOpen)
  }

  const closeSchemaPanel = () => {
    setSchemaOpen(false)
    schemaToggleRef.current?.focus()
  }

  // Moves the editor to the field's key when the text has it; below `lg` the modal Drawer then
  // closes so the editor can take focus there.
  const selectField = (path: Path) => {
    const moved = editor.current?.moveToPath(path) ?? false
    if (moved && !isLg) {
      focusEditorOnClose.current = true
      setSchemaOpen(false)
    }
  }

  const browser = schema ? (
    <SchemaBrowser
      schema={schema}
      path={browserPath}
      onPathChange={setBrowserPath}
      onSelectField={selectField}
      headingLevel={3}
    />
  ) : null

  const status: { key: string; tone?: 'amber' | 'red'; text: ReactNode }[] = []
  if (dirty) {
    status.push({
      key: 'dirty',
      tone: 'amber',
      text: (
        <>
          <span aria-hidden="true">● </span>Unsaved changes
        </>
      ),
    })
  } else if (!create) {
    status.push({ key: 'saved', text: 'Saved' })
  }
  if (problems.length > 0) {
    const n = problems.length
    status.push({ key: 'problems', tone: 'red', text: `${n} problem${n === 1 ? '' : 's'}` })
  }
  if (serverChanged) {
    status.push({ key: 'server', tone: 'amber', text: 'Server copy changed · Reload to see it' })
  }

  return (
    <Stack gap="3">
      <HStack justify="space-between" gap="3" flexWrap="wrap">
        <HStack gap="2" flexWrap="wrap">
          <Tooltip content="Fix the problems first" disabled={!blocked}>
            <Button
              ref={saveRef}
              variant="solid"
              size="sm"
              disabled={!ready || !editorReady}
              aria-disabled={blocked || undefined}
              loading={saving}
              onClick={() => void save()}
            >
              {create ? 'Create' : 'Save'}
            </Button>
          </Tooltip>
          <Button variant="outline" size="sm" onClick={reload}>
            Reload
          </Button>
          <ActionMenu
            trigger="button"
            buttonLabel="Download"
            items={[
              {
                id: 'download',
                label: 'Download YAML',
                onSelect: () => downloadText(fileName, text),
              },
              {
                id: 'download-clean',
                label: 'Download clean YAML',
                onSelect: () => downloadText(cleanFileName(fileName), cleanText()),
              },
            ]}
          />
          <Text role="status" textStyle="sm" color="fg.muted">
            {status.map((part, index) => (
              <span key={part.key}>
                {index > 0 ? ' · ' : null}
                <styled.span
                  color={
                    part.tone === 'red' ? 'red.11' : part.tone === 'amber' ? 'amber.11' : undefined
                  }
                >
                  {part.text}
                </styled.span>
              </span>
            ))}
          </Text>
        </HStack>
        <HStack gap="2">
          {schema ? (
            <Button
              ref={schemaToggleRef}
              variant={schemaOpen ? 'subtle' : 'outline'}
              size="sm"
              aria-pressed={schemaOpen}
              onClick={toggleSchema}
            >
              Schema
            </Button>
          ) : null}
          <Button variant="plain" size="sm" onClick={() => setShortcutsOpen(true)}>
            Shortcuts
          </Button>
        </HStack>
      </HStack>

      <FormError message={saveError} />
      {create && createControls ? createControls : null}

      <Grid
        gridTemplateColumns={schemaPanel ? 'minmax(0, 1fr) 22rem' : 'minmax(0, 1fr)'}
        gap="4"
        alignItems="start"
      >
        <Stack gap="3" minW="0">
          <YamlEditor
            value={text}
            onChange={(next) => {
              latestText.current = next
              setSaveError(null)
              onDraftChange(next === yamlText ? undefined : next)
            }}
            schema={schema}
            onProblems={showProblems}
            onCursorPath={(path) => {
              cursorPath.current = path
              if (schemaOpen) setBrowserPath(path)
            }}
            onSave={() => void save()}
            height={EDITOR_HEIGHT}
            ariaLabel={fileName}
            onReady={(instance) => {
              editor.current = instance
              setEditorReady(true)
            }}
          />

          {problems.length > 0 ? (
            // `listStyle: none` drops the implicit list role in Safari/VoiceOver; set it back.
            <styled.ul
              role="list"
              aria-label="Problems"
              listStyle="none"
              display="flex"
              flexDirection="column"
              gap="0.5"
              maxH="40"
              overflowY="auto"
            >
              {problems.map((problem, index) => (
                <li key={`${problem.from}:${index}`}>
                  <Button
                    variant="plain"
                    size="xs"
                    h="auto"
                    minH="6"
                    py="1"
                    px="1"
                    whiteSpace="normal"
                    textAlign="start"
                    fontWeight="normal"
                    color={problem.severity === 'error' ? 'red.11' : 'amber.11'}
                    onClick={() => editor.current?.moveToOffset(problem.from)}
                  >
                    <TriangleAlert />
                    {`Line ${problem.line} · ${problem.message}`}
                  </Button>
                </li>
              ))}
            </styled.ul>
          ) : null}
        </Stack>

        {/* On `lg` the browser sits beside the editor, outside any dialog: Escape stays with the
            editor and both stay usable. It scrolls on its own. */}
        {schemaPanel ? (
          <styled.aside
            role="complementary"
            aria-label="Schema"
            display="flex"
            flexDirection="column"
            gap="3"
            minH="0"
            p="4"
            borderWidth="1px"
            borderColor="border"
            borderRadius="l2"
            style={{ height: EDITOR_HEIGHT }}
          >
            <HStack justify="space-between" gap="2">
              <Heading as="h2" textStyle="md" fontWeight="semibold">
                Schema
              </Heading>
              <CloseButton size="xs" aria-label="Close schema" onClick={closeSchemaPanel} />
            </HStack>
            <Box flex="1" minH="0">
              {browser}
            </Box>
          </styled.aside>
        ) : null}
      </Grid>

      <ConfirmDialog
        open={confirmReload}
        onOpenChange={setConfirmReload}
        title="Discard your changes?"
        description="Reload replaces your edits with the server copy."
        confirmLabel="Discard"
        onConfirm={discard}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />

      {/* Below `lg` the browser is a modal Drawer over the editor. */}
      {schema && !isLg ? (
        <Drawer.Root
          open={schemaOpen}
          onOpenChange={(details) => setSchemaOpen(details.open)}
          placement="end"
          finalFocusEl={() => {
            if (!focusEditorOnClose.current) return null
            focusEditorOnClose.current = false
            return editor.current?.view.contentDOM ?? null
          }}
        >
          <Portal>
            <Drawer.Backdrop />
            <Drawer.Positioner>
              <Drawer.Content maxW="22rem">
                <Drawer.Header>
                  <Drawer.Title>Schema</Drawer.Title>
                </Drawer.Header>
                <Drawer.CloseTrigger asChild>
                  <CloseButton size="sm" />
                </Drawer.CloseTrigger>
                <Drawer.Body alignItems="stretch" minH="0" pt="0">
                  {browser}
                </Drawer.Body>
              </Drawer.Content>
            </Drawer.Positioner>
          </Portal>
        </Drawer.Root>
      ) : null}
    </Stack>
  )
}
