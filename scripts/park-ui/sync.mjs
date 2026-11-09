#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseArgs } from 'node:util'
import {
  appendColor,
  appendExport,
  checkPorted,
  detectRecipeKind,
  findMissingPalettes,
  portSource,
  registerRecipe,
} from './port.mjs'
import { resolveItems, targetPath, writeIfUnchanged } from './registry.mjs'

const UI_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../packages/ui')
const SRC = path.join(UI_ROOT, 'src')
const INIT_IDS = ['__init', 'neutral', 'red', 'green', 'blue', 'orange']
const USAGE = `Usage:
  node scripts/park-ui/sync.mjs init [--force]
  node scripts/park-ui/sync.mjs add <id...> [--force] [--with-colors]
  node scripts/park-ui/sync.mjs port`

const BARRELS = {
  ui: { file: path.join(SRC, 'components/ui/index.ts'), seed: '' },
  colors: { file: path.join(SRC, 'theme/colors/index.ts'), seed: 'export const colors = {}\n' },
  recipes: {
    file: path.join(SRC, 'theme/recipes/index.ts'),
    seed: 'export const recipes = {}\nexport const slotRecipes = {}\n',
  },
}

function resolvePaths() {
  const { aliases } = JSON.parse(fs.readFileSync(path.join(UI_ROOT, 'components.json'), 'utf8'))
  const abs = (alias) => path.join(SRC, alias.replace(/^~\//, ''))
  return {
    ui: abs(aliases.ui),
    recipes: abs(aliases.recipes),
    theme: abs(aliases.theme),
    components: abs(aliases.components),
  }
}

const rel = (p) => path.relative(path.resolve(UI_ROOT, '../..'), p)
const counts = { written: 0, unchanged: 0, skipped: 0 }

function report(status, file) {
  counts[status]++
  console.log(`${status.padEnd(9)} ${rel(file)}`)
}

function readOr(file, seed) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : seed
}

function updateBarrel(barrel, update) {
  const current = readOr(barrel.file, barrel.seed)
  report(writeIfUnchanged(barrel.file, update(current), { force: true }), barrel.file)
}

// Registry `exports`/`imports` are a string (or array); normalise to non-empty lines.
const lines = (v) =>
  [v ?? []]
    .flat()
    .flatMap((s) => s.split('\n'))
    .filter((l) => l.trim())

function applyItems(items, { force }) {
  const paths = resolvePaths()
  const exportLines = []
  const colorNames = []
  const recipeEntries = []
  for (const item of items) {
    const deps = [...(item.dependencies ?? []), ...(item.devDependencies ?? [])]
    if (deps.length) console.log(`note      ${item.name} needs packages: ${deps.join(', ')}`)
    for (const file of item.files ?? []) {
      const target = targetPath(file, paths)
      const content = portSource(file.content, target, UI_ROOT)
      if (file.type === 'registry:recipe' && target === BARRELS.recipes.file) {
        // __init's recipes index is only a seed; never clobber registered recipes.
        if (fs.existsSync(target)) report('unchanged', target)
        else report(writeIfUnchanged(target, content, { force }), target)
        continue
      }
      report(writeIfUnchanged(target, content, { force }), target)
      if (file.type === 'registry:ui') exportLines.push(...lines(file.exports))
      if (file.type === 'registry:color') colorNames.push(path.basename(target, '.ts'))
      if (file.type === 'registry:recipe')
        for (const line of lines(file.imports))
          recipeEntries.push([line, detectRecipeKind(content)])
    }
  }
  if (exportLines.length) updateBarrel(BARRELS.ui, (s) => exportLines.reduce(appendExport, s))
  if (colorNames.length) updateBarrel(BARRELS.colors, (s) => colorNames.reduce(appendColor, s))
  if (recipeEntries.length)
    updateBarrel(BARRELS.recipes, (s) =>
      recipeEntries.reduce((acc, [line, kind]) => registerRecipe(acc, line, kind), s),
    )
}

function walk(dir, ext) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir, { recursive: true })
    .filter((f) => f.endsWith(ext))
    .map((f) => path.join(dir, f))
}

function portedFiles() {
  return [...walk(path.join(SRC, 'components/ui'), '.tsx'), ...walk(path.join(SRC, 'theme'), '.ts')]
}

function runPort() {
  for (const file of portedFiles()) {
    const before = fs.readFileSync(file, 'utf8')
    const after = portSource(before, file, UI_ROOT)
    if (after !== before) {
      fs.writeFileSync(file, after)
      console.log(`ported    ${rel(file)}`)
    }
  }
}

function availablePalettes() {
  const barrel = readOr(BARRELS.colors.file, BARRELS.colors.seed)
  const body = /export const colors\s*=\s*\{([^}]*)\}/.exec(barrel)?.[1] ?? ''
  return [
    'gray',
    ...body
      .split(',')
      .map((k) => k.trim().split(':')[0].trim())
      .filter(Boolean),
  ]
}

function missingPalettes() {
  const recipes = walk(path.join(SRC, 'theme/recipes'), '.ts').filter(
    (f) => path.basename(f) !== 'index.ts',
  )
  return findMissingPalettes(
    recipes.map((f) => fs.readFileSync(f, 'utf8')),
    availablePalettes(),
  )
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      force: { type: 'boolean', default: false },
      'with-colors': { type: 'boolean', default: false },
    },
  })
  const [command, ...ids] = positionals
  const force = values.force
  if (command === 'init') {
    applyItems(await resolveItems(INIT_IDS), { force })
  } else if (command === 'add') {
    if (!ids.length) throw new Error(`'add' needs at least one item id.\n${USAGE}`)
    applyItems(await resolveItems(ids), { force })
  } else if (command !== 'port') {
    throw new Error(USAGE)
  }

  runPort()

  let missing = missingPalettes()
  if (missing.length && values['with-colors']) {
    console.log(`fetching missing palettes: ${missing.join(', ')}`)
    applyItems(await resolveItems(missing), { force })
    runPort()
    missing = missingPalettes()
  }

  const problems = []
  for (const file of portedFiles())
    for (const msg of checkPorted(fs.readFileSync(file, 'utf8')))
      problems.push(`${rel(file)}: ${msg}`)
  for (const name of missing)
    problems.push(`missing color palette '${name}' (re-run with --with-colors or 'add ${name}')`)

  console.log(
    `\nsummary: ${counts.written} written, ${counts.unchanged} unchanged, ${counts.skipped} skipped`,
  )
  if (problems.length) {
    console.error(`\n${problems.length} problem(s):`)
    for (const p of problems) console.error(`  - ${p}`)
    process.exit(1)
  }
}

main().catch((err) => {
  console.error(err.message)
  process.exit(1)
})
