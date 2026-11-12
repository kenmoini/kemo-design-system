import { HighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language'
import { RangeSetBuilder, type Extension } from '@codemirror/state'
import {
  Decoration,
  EditorView,
  ViewPlugin,
  type DecorationSet,
  type ViewUpdate,
} from '@codemirror/view'
import { tags as t } from '@lezer/highlight'
import { token } from '../../../styled-system/tokens'

// Every colour is a Park token's CSS variable, so the light/dark switch on <html> recolours the
// editor without a second theme.
const v = token.var

const colors = {
  fg: v('colors.fg.default'),
  muted: v('colors.fg.muted'),
  subtle: v('colors.fg.subtle'),
  canvas: v('colors.canvas'),
  border: v('colors.border'),
  focus: v('colors.colorPalette.solid.bg'),
  gutter: v('colors.gray.surface.bg'),
  activeLine: v('colors.gray.a2'),
  fold: v('colors.gray.a3'),
  bracket: v('colors.gray.a4'),
  selection: v('colors.blue.a4'),
  string: v('colors.green.11'),
  number: v('colors.amber.11'),
  literal: v('colors.blue.11'),
  error: v('colors.red.9'),
  warning: v('colors.amber.9'),
}

const squiggle = (color: string) => ({
  backgroundImage: 'none',
  textDecoration: `underline wavy ${color}`,
  textDecorationSkipInk: 'none',
  textUnderlineOffset: '3px',
})

const marker = (color: string) => ({
  content: 'normal',
  width: '0.5em',
  height: '0.5em',
  margin: '0.35em 0.25em',
  borderRadius: '50%',
  backgroundColor: color,
})

const editorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: colors.fg,
    backgroundColor: colors.canvas,
    border: `1px solid ${colors.border}`,
    borderRadius: v('radii.l2'),
  },
  '&.cm-focused': {
    outline: `1px solid ${colors.focus}`,
    outlineOffset: '0',
    borderColor: colors.focus,
  },
  // Font size and line height come from the host (`textStyle: sm`), like the placeholder's.
  '.cm-scroller': { fontFamily: v('fonts.mono'), lineHeight: 'inherit' },
  '.cm-content': { caretColor: colors.fg },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: colors.fg },
  '&.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection':
    { backgroundColor: colors.selection },
  '.cm-activeLine': { backgroundColor: colors.activeLine },
  '.cm-gutters': {
    backgroundColor: colors.gutter,
    color: colors.subtle,
    borderRight: `1px solid ${colors.border}`,
    borderStartStartRadius: v('radii.l2'),
    borderEndStartRadius: v('radii.l2'),
  },
  '.cm-activeLineGutter': { backgroundColor: colors.activeLine, color: colors.fg },
  '.cm-foldGutter .cm-gutterElement': { color: colors.subtle, cursor: 'pointer' },
  '.cm-foldPlaceholder': {
    backgroundColor: colors.fold,
    border: 'none',
    color: colors.muted,
    padding: '0 0.25em',
  },
  '&.cm-focused .cm-matchingBracket': { backgroundColor: colors.bracket },
  '&.cm-focused .cm-nonmatchingBracket': { color: colors.error },
  '.cm-lintRange-error': squiggle(colors.error),
  '.cm-lintRange-warning, .cm-lintRange-info, .cm-lintRange-hint': squiggle(colors.warning),
  '.cm-lint-marker-error': marker(colors.error),
  '.cm-lint-marker-warning, .cm-lint-marker-info': marker(colors.warning),
  '.cm-tooltip': {
    backgroundColor: colors.canvas,
    color: colors.fg,
    border: `1px solid ${colors.border}`,
    borderRadius: v('radii.l2'),
    boxShadow: v('shadows.md'),
    overflow: 'hidden',
  },
  '.cm-tooltip.cm-tooltip-autocomplete > ul': { fontFamily: v('fonts.mono') },
  '.cm-tooltip.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: colors.selection,
    color: colors.fg,
  },
  '.cm-completionDetail': { color: colors.subtle },
  '.cm-diagnostic': { padding: '0.25em 0.5em' },
  '.cm-diagnostic-error': { borderLeft: `3px solid ${colors.error}` },
  '.cm-diagnostic-warning, .cm-diagnostic-info, .cm-diagnostic-hint': {
    borderLeft: `3px solid ${colors.warning}`,
  },
  '.cm-lintRange-active': { backgroundColor: v('colors.amber.a3') },
  // The problems panel (Mod-Shift-m).
  '.cm-panels': { backgroundColor: colors.gutter, color: colors.fg },
  '.cm-panels-top': { borderBottom: `1px solid ${colors.border}` },
  '.cm-panels-bottom': { borderTop: `1px solid ${colors.border}` },
  '.cm-panel.cm-panel-lint ul [aria-selected], .cm-panel.cm-panel-lint ul:focus [aria-selected]': {
    backgroundColor: colors.selection,
    color: colors.fg,
  },
  '.cm6-json-schema-hover': { maxWidth: '28rem', padding: '0.375em 0.5em' },
  '.cm6-json-schema-hover--code-wrapper': { marginTop: '0.25em' },
  '.cm6-json-schema-hover--code': { fontFamily: v('fonts.mono'), color: colors.muted },
  '.cm-yaml-number, .cm-yaml-number *': { color: colors.number },
  '.cm-yaml-literal, .cm-yaml-literal *': { color: colors.literal },
})

const highlightStyle = HighlightStyle.define([
  // Keys are `definition(propertyName)`, which a `propertyName` rule covers.
  { tag: t.propertyName, color: colors.fg },
  // Plain scalars are `content`; numbers, booleans and null are re-coloured by `scalarKinds`.
  { tag: [t.string, t.special(t.string), t.content], color: colors.string },
  { tag: [t.number, t.integer, t.float], color: colors.number },
  { tag: [t.bool, t.null, t.atom, t.keyword], color: colors.literal },
  { tag: t.comment, color: colors.subtle, fontStyle: 'italic' },
  { tag: [t.labelName, t.typeName, t.meta], color: colors.muted },
  { tag: [t.separator, t.punctuation, t.brace, t.squareBracket], color: colors.muted },
  { tag: t.invalid, color: colors.error },
])

// YAML 1.2 core schema, the one `yaml` resolves plain scalars with.
const NUMBER =
  /^(?:[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)(?:[eE][-+]?[0-9]+)?|0o[0-7]+|0x[0-9a-fA-F]+|[-+]?\.(?:inf|Inf|INF)|\.(?:nan|NaN|NAN))$/
const LITERAL = /^(?:true|True|TRUE|false|False|FALSE|null|Null|NULL|~)$/
const numberMark = Decoration.mark({ class: 'cm-yaml-number' })
const literalMark = Decoration.mark({ class: 'cm-yaml-literal' })

function scalarDecorations(view: EditorView): DecorationSet {
  const builder = new RangeSetBuilder<Decoration>()
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter(node) {
        if (node.name !== 'Literal' || node.node.parent?.name === 'Key') return
        const text = view.state.sliceDoc(node.from, node.to)
        const mark = NUMBER.test(text) ? numberMark : LITERAL.test(text) ? literalMark : undefined
        if (mark) builder.add(node.from, node.to, mark)
      },
    })
  }
  return builder.finish()
}

/** Colours plain scalars that resolve to numbers, booleans or null (lezer tags them all `content`). */
const scalarKinds = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet
    constructor(view: EditorView) {
      this.decorations = scalarDecorations(view)
    }
    update(update: ViewUpdate) {
      if (
        update.docChanged ||
        update.viewportChanged ||
        syntaxTree(update.startState) !== syntaxTree(update.state)
      ) {
        this.decorations = scalarDecorations(update.view)
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
)

/** The editor's Park-token theme: chrome, YAML highlighting and scalar kinds. */
export const yamlTheme: Extension = [editorTheme, syntaxHighlighting(highlightStyle), scalarKinds]
