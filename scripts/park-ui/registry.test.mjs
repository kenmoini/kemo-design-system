import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { test } from 'node:test'
import { resolveItems, targetPath, writeIfUnchanged } from './registry.mjs'

const paths = {
  ui: 'packages/ui/src/components/ui',
  recipes: 'packages/ui/src/theme/recipes',
  theme: 'packages/ui/src/theme',
  components: 'packages/ui/src/components',
}

test('targetPath maps each registry type', () => {
  assert.equal(
    targetPath({ type: 'registry:ui', path: 'button.tsx' }, paths),
    'packages/ui/src/components/ui/button.tsx',
  )
  assert.equal(
    targetPath({ type: 'registry:recipe', path: 'card.ts' }, paths),
    'packages/ui/src/theme/recipes/card.ts',
  )
  assert.equal(
    targetPath({ type: 'registry:theme', path: 'tokens/colors.ts' }, paths),
    'packages/ui/src/theme/tokens/colors.ts',
  )
  assert.equal(
    targetPath({ type: 'registry:color', path: 'colors/neutral.ts' }, paths),
    'packages/ui/src/theme/colors/neutral.ts',
  )
  assert.equal(
    targetPath({ type: 'registry:color', path: 'neutral.ts' }, paths),
    'packages/ui/src/theme/colors/neutral.ts',
  )
  assert.equal(
    targetPath({ type: 'registry:component', path: 'x.tsx' }, paths),
    'packages/ui/src/components/x.tsx',
  )
  assert.equal(
    targetPath({ type: 'registry:block', path: 'y.tsx' }, paths),
    'packages/ui/src/components/y.tsx',
  )
  assert.throws(() => targetPath({ type: 'registry:nope', path: 'z' }, paths), /Unsupported/)
})

test('writeIfUnchanged skips differing files, forces, and detects identical', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'park-ui-'))
  const file = path.join(dir, 'nested', 'a.ts')
  const quiet = { log() {} }
  assert.equal(writeIfUnchanged(file, 'one', { force: false, logger: quiet }), 'written')
  assert.equal(writeIfUnchanged(file, 'one', { force: false, logger: quiet }), 'unchanged')
  assert.equal(writeIfUnchanged(file, 'two', { force: false, logger: quiet }), 'skipped')
  assert.equal(fs.readFileSync(file, 'utf8'), 'one')
  assert.equal(writeIfUnchanged(file, 'two', { force: true, logger: quiet }), 'written')
  assert.equal(fs.readFileSync(file, 'utf8'), 'two')
  fs.rmSync(dir, { recursive: true })
})

test('resolveItems resolves transitive dependencies in first-seen order with injected fetch', async () => {
  const db = {
    a: { name: 'a', registryDependencies: ['b', 'c'] },
    b: { name: 'b', registryDependencies: ['c'] },
    c: { name: 'c' },
  }
  const fetchFn = async (url) => ({
    ok: true,
    status: 200,
    json: async () => db[path.basename(url, '.json')],
  })
  const items = await resolveItems(['a', 'b'], fetchFn)
  assert.deepEqual(
    items.map((i) => i.name),
    ['a', 'b', 'c'],
  )
})
