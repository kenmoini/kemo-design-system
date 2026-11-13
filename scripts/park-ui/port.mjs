import path from 'node:path'

const toPosix = (p) => p.split(path.sep).join('/')

/** Collapse the checkbox recipe's `control: { control: {…} }` double nesting. */
export function collapseCheckboxControl(source) {
  const outerRe = /control:\s*\{\s*control:\s*\{/
  let out = source
  for (let m = outerRe.exec(out); m; m = outerRe.exec(out)) {
    const outerOpen = m.index + m[0].indexOf('{')
    const innerOpen = m.index + m[0].lastIndexOf('{')
    const innerClose = matchingBrace(out, innerOpen)
    const outerClose = matchingBrace(out, outerOpen)
    if (
      innerClose < 0 ||
      outerClose < 0 ||
      out.slice(innerClose + 1, outerClose).replace(/[\s,]/g, '') !== ''
    )
      break
    const inner = out
      .slice(innerOpen + 1, innerClose)
      .split('\n')
      .map((l) => l.replace(/^ {2}/, ''))
      .join('\n')
    out = `${out.slice(0, m.index)}control: {${inner}}${out.slice(outerClose + 1)}`
  }
  return out
}

function matchingBrace(source, open) {
  let depth = 0
  for (let i = open; i < source.length; i++) {
    if (source[i] === '{') depth++
    else if (source[i] === '}' && --depth === 0) return i
  }
  return -1
}

/** Track our hand-written `PasswordInput` in the input recipe's `jsx` list. Idempotent. */
export function trackPasswordInput(source) {
  return source.replace(/jsx:\s*\[([^\]]*)\]/, (match, items) =>
    /(['"])PasswordInput\1/.test(items) ? match : `jsx: [${items.trim()}, 'PasswordInput']`,
  )
}

/** Render `Card.Footer` as a div (Park: h3) so footer buttons stay out of a heading. Idempotent. */
export function cardFooterAsDiv(source) {
  return source.replace(/(withContext\(\s*ark\.)h3(\s*,\s*(['"])footer\3\s*\))/, '$1div$2')
}

/** Use a token this theme has for the field's required asterisk (`colorPalette.solid` is not one). Idempotent. */
export function requiredIndicatorColor(source) {
  return source.replace(
    /(requiredIndicator:\s*\{\s*color:\s*)(['"])colorPalette\.solid\2/,
    "$1'colorPalette.solid.bg'",
  )
}

/** Let the skeleton's `circle` radius win over the `loading` radius (variant order is not reliable). Idempotent. */
export function skeletonCircleRadius(source) {
  if (/compoundVariants/.test(source)) return source
  return source.replace(
    /(\n\s*)defaultVariants:/,
    "$1compoundVariants: [{ loading: true, circle: true, css: { borderRadius: 'full' } }],$1defaultVariants:",
  )
}

/** Apply the Panda v1 -> v2 transforms to one registry file. Idempotent. */
export function portSource(source, filePath, uiRoot) {
  let rel = toPosix(path.relative(path.dirname(filePath), uiRoot))
  if (!rel.startsWith('.')) rel = rel ? `./${rel}` : '.'
  let out = source.replace(/\bcreateStyleContext\b/g, 'createSlotRecipeContext')
  out = out.replace(
    /(import\s+type\s*\{[^}]*\}\s*from\s*)(['"])@pandacss\/dev\2/g,
    "$1'@pandacss/types'",
  )
  out = out.replace(/(from\s*)(['"])styled-system\//g, `$1$2${rel}/styled-system/`)
  if (path.basename(filePath).startsWith('checkbox')) out = collapseCheckboxControl(out)
  if (path.basename(filePath) === 'input.ts') out = trackPasswordInput(out)
  if (path.basename(filePath) === 'card.tsx') out = cardFooterAsDiv(out)
  if (path.basename(filePath) === 'field.ts') out = requiredIndicatorColor(out)
  if (path.basename(filePath) === 'skeleton.ts') out = skeletonCircleRadius(out)
  return out
}

/** Leftover Panda v1 patterns, as human-readable messages. */
export function checkPorted(source) {
  const problems = []
  if (/\bcreateStyleContext\b/.test(source))
    problems.push("uses 'createStyleContext' (expected createSlotRecipeContext)")
  if (/from\s*['"]styled-system\//.test(source))
    problems.push("has bare 'styled-system/' import (expected relative path)")
  if (/import\s+type\s*\{[^}]*\}\s*from\s*['"]@pandacss\/dev['"]/.test(source))
    problems.push("has type import from '@pandacss/dev' (expected '@pandacss/types')")
  return problems
}

export function detectRecipeKind(source) {
  return /defineSlotRecipe\(/.test(source) || /^\s*slots:/m.test(source) ? 'slotRecipe' : 'recipe'
}

const importedName = (line) => /import\s*\{\s*(\w+)\s*\}/.exec(line)?.[1]

function addImport(source, importLine) {
  return source.split('\n').some((l) => l.trim() === importLine.trim())
    ? source
    : `${importLine}\n${source}`
}

function addKey(source, constName, key) {
  const re = new RegExp(`(export const ${constName}\\s*=\\s*\\{)([^}]*)(\\})`)
  const m = re.exec(source)
  if (!m) throw new Error(`Could not find 'export const ${constName} = {…}'`)
  const keys = new Set(
    m[2]
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean),
  )
  keys.add(key)
  const body = [...keys]
    .sort()
    .map((k) => `  ${k},\n`)
    .join('')
  return source.replace(re, `$1\n${body}$3`)
}

export function registerRecipe(indexSource, importLine, kind) {
  const name = importedName(importLine)
  if (!name) throw new Error(`Cannot read identifier from import line: ${importLine}`)
  return addKey(
    addImport(indexSource, importLine),
    kind === 'slotRecipe' ? 'slotRecipes' : 'recipes',
    name,
  )
}

/** Export statements in `text`, each kept whole (a multi-line `export {…} from` is one statement). */
function exportStatements(text) {
  return [...text.matchAll(/\bexport\b[\s\S]*?\bfrom\s*(['"])[^'"]+\1;?/g)].map((m) => m[0].trim())
}

// Formatting-insensitive identity of a statement: whitespace collapsed, trailing comma dropped.
const statementKey = (s) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/,\s*\}/, ' }')
    .replace(/\{\s*/, '{ ')
    .replace(/;$/, '')

/** Add the export statement(s) in `exportText` to a barrel, once each, sorted by module path. */
export function appendExport(indexSource, exportText) {
  const target = (s) => /from\s*['"]([^'"]+)['"]/.exec(s)?.[1] ?? s
  const statements = new Map()
  for (const s of [...exportStatements(indexSource), ...exportStatements(exportText)])
    if (!statements.has(statementKey(s))) statements.set(statementKey(s), s)
  return `${[...statements.values()].sort((a, b) => target(a).localeCompare(target(b))).join('\n')}\n`
}

export function appendColor(barrelSource, name) {
  return addKey(addImport(barrelSource, `import { ${name} } from './${name}'`), 'colors', name)
}

export function findMissingPalettes(recipeSources, available) {
  const have = new Set(available)
  const missing = new Set()
  for (const src of recipeSources)
    for (const m of src.matchAll(/colorPalette:\s*(['"])([\w-]+)\1/g))
      if (!have.has(m[2])) missing.add(m[2])
  return [...missing].sort()
}
