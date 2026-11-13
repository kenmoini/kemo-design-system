'use client'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { css } from '../../../styled-system/css'
import type { YamlEditorInstance } from './extensions'
import type { YamlProblem } from './types'

export interface YamlEditorProps {
  value: string
  /** User edits (typing, paste, undo); not called when `value` itself changes. */
  onChange?: (text: string) => void
  /** Any JSON Schema object (draft-07 style): lint, hover docs and key completion follow it. Keep
   * it stable (a module constant or memoized): a new object re-lints the document. */
  schema?: object
  readOnly?: boolean
  /** After every lint run: YAML syntax errors, or the schema violations once the YAML parses. */
  onProblems?: (problems: YamlProblem[]) => void
  /** The key path under the cursor (debounced; only when it changes). */
  onCursorPath?: (path: (string | number)[]) => void
  /** Mod-s inside the editor. */
  onSave?: () => void
  /** CSS height of the editor and of its server-rendered placeholder. Default `32rem`. */
  height?: string
  /** Names the editable content for assistive tech. */
  ariaLabel: string
  /** Called once CodeMirror has mounted, with the live editor (its `view` is the `EditorView`). */
  onReady?: (editor: YamlEditorInstance) => void
}

const placeholderClass = css({
  h: 'full',
  m: '0',
  p: '3',
  fontFamily: 'mono',
  textStyle: 'sm',
  color: 'fg.default',
  bg: 'canvas',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'l2',
  overflow: 'auto',
  whiteSpace: 'pre',
})

// The CodeMirror theme draws the frame; the host gives it the placeholder's height and text style.
const hostClass = css({ h: 'full', textStyle: 'sm' })

/** A CodeMirror 6 YAML editor on Park tokens, with schema lint, hover and completion. CodeMirror
 * loads on mount; until then (and on the server) the text renders in a `pre` of the same height. */
export function YamlEditor({
  value,
  onChange,
  schema,
  readOnly = false,
  onProblems,
  onCursorPath,
  onSave,
  height = '32rem',
  ariaLabel,
  onReady,
}: YamlEditorProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [editor, setEditor] = useState<YamlEditorInstance | null>(null)
  // The editor is built once, from the props current when CodeMirror arrives; its callbacks read
  // the latest props through `callbacks`.
  const latest = useRef({ value, schema, readOnly, ariaLabel })
  const callbacks = useRef({ onChange, onProblems, onCursorPath, onSave, onReady })
  useEffect(() => {
    latest.current = { value, schema, readOnly, ariaLabel }
    callbacks.current = { onChange, onProblems, onCursorPath, onSave, onReady }
  })

  useEffect(() => {
    let cancelled = false
    let instance: YamlEditorInstance | undefined
    import('./extensions')
      .then(({ createEditor }) => {
        if (cancelled || !hostRef.current) return
        const initial = latest.current
        instance = createEditor({
          parent: hostRef.current,
          doc: initial.value,
          schema: initial.schema,
          readOnly: initial.readOnly,
          ariaLabel: initial.ariaLabel,
          onChange: (text) => callbacks.current.onChange?.(text),
          onProblems: (problems) => callbacks.current.onProblems?.(problems),
          onCursorPath: (path) => callbacks.current.onCursorPath?.(path),
          onSave: () => callbacks.current.onSave?.(),
        })
        setEditor(instance)
        callbacks.current.onReady?.(instance)
      })
      // The text stays readable in the placeholder; say why it never became an editor.
      .catch((error: unknown) => console.error('YamlEditor: CodeMirror failed to load', error))
    return () => {
      cancelled = true
      if (instance) {
        instance.destroy()
        // A re-run (Fast Refresh, StrictMode) must not reach the destroyed view.
        setEditor(null)
      }
    }
  }, [])

  // Synced in the commit, before the browser can deliver another keystroke: a passive effect could
  // apply a value one keystroke old over newer typing.
  useLayoutEffect(() => editor?.setDoc(value), [editor, value])
  useEffect(() => editor?.setReadOnly(readOnly), [editor, readOnly])
  useEffect(() => editor?.setAriaLabel(ariaLabel), [editor, ariaLabel])
  useEffect(() => editor?.setSchema(schema), [editor, schema])

  return (
    <div style={{ height }}>
      {editor ? null : <pre className={placeholderClass}>{value}</pre>}
      <div ref={hostRef} className={hostClass} hidden={!editor} />
    </div>
  )
}
