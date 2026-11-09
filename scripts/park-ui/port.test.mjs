import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  appendColor,
  appendExport,
  cardFooterAsDiv,
  checkPorted,
  collapseCheckboxControl,
  detectRecipeKind,
  findMissingPalettes,
  portSource,
  registerRecipe,
  trackPasswordInput,
} from './port.mjs'

const UI_ROOT = 'packages/ui'
const CARD = 'packages/ui/src/components/ui/card.tsx'
const CARD_SRC = `'use client'
import { createStyleContext, styled } from 'styled-system/jsx'
import type { HTMLStyledProps } from 'styled-system/jsx'
import { card } from 'styled-system/recipes'

const { withProvider, withContext } = createStyleContext(card)
`

const CHECKBOX_SNIPPET = `variant: {
  solid: {
    control: {
      control: {
        borderColor: 'border',
        _checked: {
          bg: 'colorPalette.solid.bg',
        },
      },
    },
  },
  surface: {
    control: {
      bg: 'x',
    },
  },
}`

test('portSource rewrites styled-system imports and createStyleContext', () => {
  const out = portSource(CARD_SRC, CARD, UI_ROOT)
  assert.match(
    out,
    /import \{ createSlotRecipeContext, styled \} from '\.\.\/\.\.\/\.\.\/styled-system\/jsx'/,
  )
  assert.match(out, /import type \{ HTMLStyledProps \} from '\.\.\/\.\.\/\.\.\/styled-system\/jsx'/)
  assert.match(out, /from '\.\.\/\.\.\/\.\.\/styled-system\/recipes'/)
  assert.match(out, /createSlotRecipeContext\(card\)/)
  assert.deepEqual(checkPorted(out), [])
})

test('portSource rewrites type imports from @pandacss/dev', () => {
  const src = `import type { RecipeConfig } from '@pandacss/dev'\n`
  assert.equal(
    portSource(src, 'packages/ui/src/theme/recipes/x.ts', UI_ROOT),
    `import type { RecipeConfig } from '@pandacss/types'\n`,
  )
})

test('portSource is idempotent', () => {
  const once = portSource(CARD_SRC, CARD, UI_ROOT)
  assert.equal(portSource(once, CARD, UI_ROOT), once)
})

test('portSource leaves value imports from @pandacss/dev untouched', () => {
  const src = `import { defineRecipe } from '@pandacss/dev'\n`
  assert.equal(portSource(src, 'packages/ui/src/theme/recipes/x.ts', UI_ROOT), src)
})

test('portSource computes relative paths per file depth', () => {
  const out = portSource(
    `import { css } from 'styled-system/css'\n`,
    'packages/ui/src/theme/recipes/x.ts',
    UI_ROOT,
  )
  assert.equal(out, `import { css } from '../../../styled-system/css'\n`)
})

test('collapseCheckboxControl collapses double nesting to one level', () => {
  const out = collapseCheckboxControl(CHECKBOX_SNIPPET)
  assert.doesNotMatch(out, /control:\s*\{\s*control:/)
  assert.equal(out.match(/control:/g).length, 2)
  assert.match(out, /solid: \{\n\s+control: \{\n\s+borderColor: 'border'/)
  assert.match(out, /surface: \{\n\s+control: \{\n\s+bg: 'x'/)
  assert.equal(collapseCheckboxControl(out), out)
})

test('checkPorted flags each violation and passes clean input', () => {
  assert.equal(checkPorted(`createStyleContext(a)`).length, 1)
  assert.equal(checkPorted(`import { css } from 'styled-system/css'`).length, 1)
  assert.equal(checkPorted(`import type { RecipeConfig } from '@pandacss/dev'`).length, 1)
  assert.equal(
    checkPorted(
      `import { createStyleContext } from 'styled-system/jsx'\nimport type { A } from '@pandacss/dev'`,
    ).length,
    3,
  )
  assert.deepEqual(
    checkPorted(`import { defineRecipe } from '@pandacss/dev'\ncreateSlotRecipeContext(a)`),
    [],
  )
})

test('detectRecipeKind distinguishes recipe and slot recipe', () => {
  assert.equal(detectRecipeKind(`export const a = defineRecipe({ className: 'a' })`), 'recipe')
  assert.equal(detectRecipeKind(`export const a = defineSlotRecipe({ slots: [] })`), 'slotRecipe')
  assert.equal(detectRecipeKind(`export const a = {\n  slots: ['x'],\n}`), 'slotRecipe')
})

test('registerRecipe adds import and key once across calls', () => {
  let src = `export const recipes = {}\nexport const slotRecipes = {}\n`
  const line = `import { button } from './button'`
  src = registerRecipe(src, line, 'recipe')
  src = registerRecipe(src, line, 'recipe')
  src = registerRecipe(src, `import { card } from './card'`, 'slotRecipe')
  src = registerRecipe(src, `import { card } from './card'`, 'slotRecipe')
  src = registerRecipe(src, `import { badge } from './badge'`, 'recipe')
  assert.equal(src.match(/import \{ button \}/g).length, 1)
  assert.equal(src.match(/import \{ card \}/g).length, 1)
  assert.match(src, /export const recipes = \{[^}]*\bbutton\b[^}]*\}/)
  assert.match(src, /export const recipes = \{[^}]*\bbadge\b[^}]*\}/)
  assert.match(src, /export const slotRecipes = \{[^}]*\bcard\b[^}]*\}/)
  assert.doesNotMatch(src.match(/export const recipes = \{[^}]*\}/)[0], /card/)
  assert.equal(registerRecipe(src, line, 'recipe'), src)
})

test('appendExport appends once and sorts', () => {
  let src = ''
  src = appendExport(src, `export * as Card from './card'`)
  src = appendExport(src, `export { Button } from './button'`)
  src = appendExport(src, `export * as Card from './card'`)
  assert.equal(src, `export { Button } from './button'\nexport * as Card from './card'\n`)
})

test('appendExport keeps multi-line export statements whole', () => {
  // Shape of Park UI's skeleton registry item `exports` string.
  const skeleton = `export {
  Skeleton,
  SkeletonCircle,
  type SkeletonCircleProps,
  type SkeletonProps,
  SkeletonText,
  type SkeletonTextProps,
} from './skeleton'`
  let src = appendExport('', `export { Span, type SpanProps } from './span'`)
  src = appendExport(src, skeleton)
  src = appendExport(src, `export * as Alert from './alert'`)
  assert.equal(
    src,
    `export * as Alert from './alert'\n${skeleton}\nexport { Span, type SpanProps } from './span'\n`,
  )
  // Re-adding the statement, also wrapped differently, is a no-op.
  assert.equal(appendExport(src, skeleton), src)
  assert.equal(appendExport(src, skeleton.replace(/\s+/g, ' ')), src)
})

test('appendExport accepts text holding several statements', () => {
  const src = appendExport(
    '',
    `export { B } from './b'\nexport {\n  A,\n  type AProps,\n} from './a'\n`,
  )
  assert.equal(src, `export {\n  A,\n  type AProps,\n} from './a'\nexport { B } from './b'\n`)
})

test('appendColor adds import and key once', () => {
  let src = `export const colors = {}\n`
  src = appendColor(src, 'red')
  src = appendColor(src, 'red')
  src = appendColor(src, 'blue')
  assert.equal(src.match(/import \{ red \} from '\.\/red'/g).length, 1)
  assert.match(src, /export const colors = \{[^}]*\bred\b[^}]*\}/)
  assert.match(src, /export const colors = \{[^}]*\bblue\b[^}]*\}/)
  assert.equal(appendColor(src, 'blue'), src)
})

test('findMissingPalettes returns unavailable palette names', () => {
  assert.deepEqual(
    findMissingPalettes([`colorPalette: 'blue'`, `colorPalette: 'gray'`], ['gray']),
    ['blue'],
  )
  assert.deepEqual(
    findMissingPalettes(
      [`colorPalette: "red", bg: 'colorPalette.solid.bg', colorPalette: 'red'`],
      [],
    ),
    ['red'],
  )
})

test('portSource tracks PasswordInput in the input recipe only, once', () => {
  const src = `export const input = {\n  jsx: ['Input', 'Field.Input'],\n}\n`
  const file = 'packages/ui/src/theme/recipes/input.ts'
  const out = portSource(src, file, UI_ROOT)
  assert.match(out, /jsx: \['Input', 'Field\.Input', 'PasswordInput'\]/)
  assert.equal(portSource(out, file, UI_ROOT), out)
  assert.equal(trackPasswordInput(out), out)
  assert.equal(portSource(src, 'packages/ui/src/theme/recipes/badge.ts', UI_ROOT), src)
})

test('portSource renders Card.Footer as a div in card.tsx only, once', () => {
  const src = `export const Footer = withContext(ark.h3, 'footer')
export const Title = withContext(ark.h3, 'title')
`
  const out = portSource(src, CARD, UI_ROOT)
  assert.match(out, /export const Footer = withContext\(ark\.div, 'footer'\)/)
  assert.match(out, /export const Title = withContext\(ark\.h3, 'title'\)/)
  assert.equal(portSource(out, CARD, UI_ROOT), out)
  assert.equal(cardFooterAsDiv(out), out)
  const other = 'packages/ui/src/components/ui/dialog.tsx'
  assert.equal(portSource(src, other, UI_ROOT), src)
})
