// Everything CodeMirror lives behind this module: `yaml-editor.tsx` loads it with `import()`, so the
// package barrel never pulls CodeMirror into a bundle statically.
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  type CompletionContext,
  type CompletionResult,
} from '@codemirror/autocomplete'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { yaml, yamlLanguage } from '@codemirror/lang-yaml'
import { bracketMatching, foldGutter, foldKeymap, indentUnit } from '@codemirror/language'
import {
  forceLinting,
  forEachDiagnostic,
  lintGutter,
  linter,
  lintKeymap,
  setDiagnosticsEffect,
  type Diagnostic,
} from '@codemirror/lint'
import { Annotation, Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  hoverTooltip,
  keymap,
  lineNumbers,
} from '@codemirror/view'
import { handleRefresh, stateExtensions, updateSchema } from 'codemirror-json-schema'
import { yamlCompletion, yamlSchemaHover, yamlSchemaLinter } from 'codemirror-json-schema/yaml'
import { offsetForPath, parseYaml, pathAtOffset } from '../../lib/kubernetes'
import { yamlTheme } from './theme'
import type { YamlProblem } from './types'

export { yamlTheme }

type Path = (string | number)[]
type Schema = Parameters<typeof updateSchema>[1]

export interface CreateEditorOptions {
  parent: HTMLElement
  doc: string
  /** Any JSON Schema object (draft-07 style); lint, hover and completion follow it. */
  schema?: object
  readOnly?: boolean
  ariaLabel: string
  /** User edits only: `setDoc` does not report back. */
  onChange?: (text: string) => void
  /** After every lint run: YAML syntax errors, or schema violations when the YAML parses. */
  onProblems?: (problems: YamlProblem[]) => void
  /** The key path under the cursor, at most once per 50 ms burst and only when it changes. */
  onCursorPath?: (path: Path) => void
  /** Mod-s inside the editor (always captured, so the browser never opens "Save page"). */
  onSave?: () => void
}

/** The live editor `createEditor` returns (and `YamlEditor`'s `onReady` hands out). */
export interface YamlEditorInstance {
  view: EditorView
  /** Applies an outside text (a reload, a server change): only the changed span is replaced, so
   * the cursor keeps its place. Echoes of the editor's own `onChange` texts are ignored. Never
   * calls `onChange`. */
  setDoc(text: string): void
  setReadOnly(readOnly: boolean): void
  setAriaLabel(ariaLabel: string): void
  setSchema(schema: object | undefined): void
  /** Puts the cursor on the key at `path` and focuses the editor; `false` if the path is absent. */
  moveToPath(path: Path): boolean
  /** Puts the cursor at `offset` (clamped to the text), scrolls it into view and focuses the editor:
   * a problem's `from`, say. */
  moveToOffset(offset: number): void
  destroy(): void
}

const LINT_DELAY = 500
const CURSOR_DEBOUNCE = 50
/** How many unacknowledged `onChange` texts to remember (a host that never echoes stays bounded). */
const MAX_PENDING_ECHOES = 50

/** Marks programmatic replacements so the update listener does not echo them to `onChange`. */
const external = Annotation.define<boolean>()

function syntaxDiagnostics(state: EditorState): Diagnostic[] {
  const { errors } = parseYaml(state.doc.toString())
  return errors.map(({ message, line, col }) => {
    const at = state.doc.line(Math.min(Math.max(line, 1), state.doc.lines))
    const from = Math.min(at.from + Math.max(col - 1, 0), at.to)
    // `yaml` messages end with "at line L, column C:" and a code frame; the line is reported apart.
    const text = message.split('\n')[0]!.replace(/ at line \d+, column \d+:?$/, '')
    return { from, to: at.to, severity: 'error', message: text, source: 'YAML' }
  })
}

// codemirror-json-schema 0.8 answers `[]` instead of `null` when the state has no schema, which
// `@codemirror/autocomplete` reads as a result without options and throws on.
const schemaCompletion = (() => {
  const source = yamlCompletion()
  return (context: CompletionContext): CompletionResult | null => {
    const result = source(context)
    return Array.isArray(result) ? null : result
  }
})()

/** The edit that turns `from` into `to`, trimmed to the span between their common prefix and suffix. */
function minimalChange(from: string, to: string) {
  const max = Math.min(from.length, to.length)
  let start = 0
  while (start < max && from.charCodeAt(start) === to.charCodeAt(start)) start++
  let end = 0
  while (
    end < max - start &&
    from.charCodeAt(from.length - 1 - end) === to.charCodeAt(to.length - 1 - end)
  ) {
    end++
  }
  return { from: start, to: from.length - end, insert: to.slice(start, to.length - end) }
}

function toProblems(state: EditorState): YamlProblem[] {
  const problems: YamlProblem[] = []
  forEachDiagnostic(state, (d, from, to) => {
    problems.push({
      from,
      to,
      line: state.doc.lineAt(from).number,
      // Schema messages are Markdown (`code` spans) for the tooltip; problems are plain text.
      message: d.message.replaceAll('`', ''),
      severity: d.severity === 'error' ? 'error' : 'warning',
    })
  })
  return problems
}

function access(readOnly: boolean, ariaLabel: string): Extension {
  return [
    EditorState.readOnly.of(readOnly),
    EditorView.contentAttributes.of({
      'aria-label': ariaLabel,
      role: 'textbox',
      'aria-multiline': 'true',
      ...(readOnly ? { 'aria-readonly': 'true' } : {}),
    }),
  ]
}

export function createEditor(options: CreateEditorOptions): YamlEditorInstance {
  const { parent, doc, onChange, onProblems, onCursorPath, onSave } = options
  let readOnly = options.readOnly ?? false
  let ariaLabel = options.ariaLabel
  let schema = options.schema
  let destroyed = false
  const accessCompartment = new Compartment()
  // Texts sent through `onChange` that the host has not passed back as `value` yet. A host that
  // re-renders a beat late passes one of these: it is our own past, not an outside change.
  const pendingEchoes: string[] = []

  let cursorTimer: ReturnType<typeof setTimeout> | undefined
  let lastPath: string | undefined
  const reportCursorPath = () => {
    cursorTimer = undefined
    const path = pathAtOffset(view.state.doc.toString(), view.state.selection.main.head)
    const key = JSON.stringify(path)
    if (key === lastPath) return
    lastPath = key
    onCursorPath?.(path)
  }

  const schemaLint = yamlSchemaLinter()

  const view: EditorView = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        foldGutter(),
        history(),
        drawSelection(),
        highlightActiveLine(),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        indentUnit.of('  '),
        keymap.of([
          // Captured even without `onSave`: the browser's "Save page" is never wanted from here.
          {
            key: 'Mod-s',
            run: () => {
              onSave?.()
              return true
            },
          },
          // `autocompletion()` binds Escape at highest precedence, so an open popup closes first.
          {
            key: 'Escape',
            run: (v) => {
              v.contentDOM.blur()
              return true
            },
          },
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...historyKeymap,
          ...foldKeymap,
          // F8: next problem; Mod-Shift-m: the problems panel.
          ...lintKeymap,
          indentWithTab,
        ]),
        yaml(),
        // The schema lives in a state field, so `setSchema` swaps it without rebuilding the editor;
        // with no schema the three features stay silent.
        stateExtensions(schema as Schema),
        yamlLanguage.data.of({ autocomplete: schemaCompletion }),
        hoverTooltip(yamlSchemaHover()),
        // One source: syntax errors when the YAML does not parse, otherwise the schema violations
        // (the schema linter skips documents that do not parse).
        linter(
          (v) => {
            const syntax = syntaxDiagnostics(v.state)
            return syntax.length > 0 ? syntax : schemaLint(v)
          },
          { delay: LINT_DELAY, needsRefresh: handleRefresh },
        ),
        lintGutter(),
        accessCompartment.of(access(readOnly, ariaLabel)),
        EditorView.updateListener.of((update) => {
          if (
            update.transactions.some((tr) => tr.effects.some((e) => e.is(setDiagnosticsEffect)))
          ) {
            onProblems?.(toProblems(update.state))
          }
          if (update.docChanged && !update.transactions.some((tr) => tr.annotation(external))) {
            const text = update.state.doc.toString()
            pendingEchoes.push(text)
            if (pendingEchoes.length > MAX_PENDING_ECHOES) pendingEchoes.shift()
            onChange?.(text)
          }
          if (onCursorPath && (update.selectionSet || update.docChanged)) {
            clearTimeout(cursorTimer)
            cursorTimer = setTimeout(reportCursorPath, CURSOR_DEBOUNCE)
          }
        }),
        yamlTheme,
      ],
    }),
  })
  // Report the first problems now instead of after the lint delay.
  forceLinting(view)

  const reconfigureAccess = () =>
    view.dispatch({ effects: accessCompartment.reconfigure(access(readOnly, ariaLabel)) })

  return {
    view,
    setDoc(text) {
      if (destroyed) return
      const echo = pendingEchoes.lastIndexOf(text)
      if (echo !== -1) {
        pendingEchoes.splice(0, echo + 1)
        return
      }
      const current = view.state.doc.toString()
      if (text === current) return
      pendingEchoes.length = 0
      // Replacing only the changed span lets CodeMirror map the selection through it.
      view.dispatch({ changes: minimalChange(current, text), annotations: external.of(true) })
    },
    setReadOnly(next) {
      if (destroyed || next === readOnly) return
      readOnly = next
      reconfigureAccess()
    },
    setAriaLabel(next) {
      if (destroyed || next === ariaLabel) return
      ariaLabel = next
      reconfigureAccess()
    },
    setSchema(next) {
      if (destroyed || next === schema) return
      schema = next
      updateSchema(view, next as Schema)
    },
    moveToPath(path) {
      if (destroyed) return false
      const anchor = offsetForPath(view.state.doc.toString(), path)
      if (anchor === undefined) return false
      view.dispatch({ selection: { anchor }, scrollIntoView: true })
      view.focus()
      return true
    },
    moveToOffset(offset) {
      if (destroyed) return
      const anchor = Math.min(Math.max(Math.trunc(offset) || 0, 0), view.state.doc.length)
      view.dispatch({ selection: { anchor }, scrollIntoView: true })
      view.focus()
    },
    destroy() {
      if (destroyed) return
      destroyed = true
      clearTimeout(cursorTimer)
      view.destroy()
    },
  }
}
