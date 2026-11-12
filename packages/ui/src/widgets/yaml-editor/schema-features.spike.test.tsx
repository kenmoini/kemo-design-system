// Spike, kept as a test: proves codemirror-json-schema 0.8's YAML lint, hover and completion in a bare
// EditorView, with the same per-feature exports `extensions.ts` composes. If an upgrade breaks one of
// these, the editor's schema features are broken the same way.
import {
  CompletionContext,
  type CompletionResult,
  type CompletionSource,
} from '@codemirror/autocomplete'
import { yaml, yamlLanguage } from '@codemirror/lang-yaml'
import {
  diagnosticCount,
  forceLinting,
  forEachDiagnostic,
  linter,
  type Diagnostic,
} from '@codemirror/lint'
import { EditorState } from '@codemirror/state'
import { EditorView, hoverTooltip } from '@codemirror/view'
import { handleRefresh, stateExtensions } from 'codemirror-json-schema'
import { yamlCompletion, yamlSchemaHover, yamlSchemaLinter } from 'codemirror-json-schema/yaml'
import { afterEach, describe, expect, it, vi } from 'vitest'

const schema = {
  type: 'object',
  properties: {
    kind: { enum: ['A', 'B'] },
    spec: {
      type: 'object',
      properties: {
        replicas: { type: 'integer', description: 'How many' },
      },
      required: ['replicas'],
    },
  },
}

let view: EditorView | undefined
afterEach(() => {
  view?.destroy()
  view = undefined
})

function mount(doc: string) {
  const parent = document.createElement('div')
  document.body.append(parent)
  view = new EditorView({
    parent,
    state: EditorState.create({
      doc,
      extensions: [
        yaml(),
        linter(yamlSchemaLinter(), { needsRefresh: handleRefresh }),
        yamlLanguage.data.of({ autocomplete: yamlCompletion() }),
        hoverTooltip(yamlSchemaHover()),
        stateExtensions(schema as never),
      ],
    }),
  })
  return view
}

async function completionLabels(v: EditorView, doc: string, before: string) {
  v.dispatch({ changes: { from: 0, to: v.state.doc.length, insert: doc } })
  const pos = before.length
  const sources = v.state.languageDataAt<CompletionSource>('autocomplete', pos)
  const results = await Promise.all(
    sources.map((source) => source(new CompletionContext(v.state, pos, true))),
  )
  return results.flatMap((r: CompletionResult | null) => r?.options.map((o) => o.label) ?? [])
}

describe('codemirror-json-schema 0.8 on YAML (spike)', () => {
  it('lints the enum violation and the missing required key', async () => {
    const v = mount('kind: C\nspec: {}')
    forceLinting(v)
    await vi.waitFor(() => expect(diagnosticCount(v.state)).toBe(2))
    const found: Diagnostic[] = []
    forEachDiagnostic(v.state, (d) => found.push(d))
    expect(found.map(({ from, to, message }) => ({ from, to, message }))).toEqual([
      { from: 6, to: 7, message: 'Expected given value `C` in `kind` to be one of `["A","B"]`' },
      { from: 14, to: 16, message: 'The required property `replicas` is missing at `spec`' },
    ])
  })

  it('registers a completion source that offers the schema keys', async () => {
    const v = mount('')
    // A key prefix inside `spec`, in flow and block style, and at the root.
    expect(await completionLabels(v, 'kind: A\nspec: { r }', 'kind: A\nspec: { r')).toEqual([
      'replicas',
    ])
    expect(await completionLabels(v, 'spec:\n  x: 1\n  r', 'spec:\n  x: 1\n  r')).toEqual([
      'replicas',
    ])
    expect(await completionLabels(v, 'kind: A\ns', 'kind: A\ns')).toEqual(['spec'])
    // Known gap: the first bare word under `spec:` parses as `spec`'s scalar value, not a key, and an
    // empty line has no node to complete, so neither offers anything.
    expect(await completionLabels(v, 'spec:\n  r', 'spec:\n  r')).toEqual([])
    expect(await completionLabels(v, 'spec:\n  ', 'spec:\n  ')).toEqual([])
  })

  it('answers [] rather than null without a schema (extensions.ts wraps the source for this)', () => {
    const state = EditorState.create({ doc: 'k', extensions: [yaml(), stateExtensions()] })
    expect(yamlCompletion()(new CompletionContext(state, 1, true))).toEqual([])
  })

  it('hovers a key with its schema description and type', async () => {
    const v = mount('kind: A\nspec:\n  replicas: 2\n')
    const tip = await yamlSchemaHover()(v, v.state.doc.toString().indexOf('replicas') + 2, 1)
    expect(tip).not.toBeNull()
    const dom = tip!.create(v).dom
    expect(dom.textContent).toContain('How many')
    expect(dom.textContent).toContain('integer')
  })
})
