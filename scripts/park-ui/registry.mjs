import fs from 'node:fs'
import path from 'node:path'

export const REGISTRY_BASE = 'https://park-ui.com/registry/react'

export async function fetchItem(id, fetchFn = fetch) {
  const url = `${REGISTRY_BASE}/${id}.json`
  const res = await fetchFn(url)
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`)
  return res.json()
}

/** Fetch ids plus transitive registryDependencies, deduped, first-seen order. */
export async function resolveItems(ids, fetchFn = fetch) {
  const seen = new Map()
  const visit = async (id) => {
    if (seen.has(id)) return
    seen.set(id, null)
    const item = await fetchItem(id, fetchFn)
    seen.set(id, item)
    for (const dep of item.registryDependencies ?? []) await visit(dep)
  }
  for (const id of ids) await visit(id)
  return [...seen.values()]
}

/** Map a registry file to its repo-relative destination. Paths come from components.json aliases. */
export function targetPath(file, paths) {
  switch (file.type) {
    case 'registry:ui':
      return path.posix.join(paths.ui, file.path)
    case 'registry:recipe':
      return path.posix.join(paths.recipes, file.path)
    case 'registry:theme':
      return path.posix.join(paths.theme, file.path)
    case 'registry:color':
      // Registry paths are already `colors/<name>.ts`; tolerate a bare `<name>.ts`.
      return path.posix.join(
        paths.theme,
        file.path.startsWith('colors/') ? file.path : `colors/${file.path}`,
      )
    case 'registry:component':
    case 'registry:block':
      return path.posix.join(paths.components, file.path)
    default:
      throw new Error(`Unsupported registry file type: ${file.type} (${file.path})`)
  }
}

export function writeIfUnchanged(filePath, content, { force = false, logger = console } = {}) {
  if (fs.existsSync(filePath)) {
    if (fs.readFileSync(filePath, 'utf8') === content) return 'unchanged'
    if (!force) {
      logger.log(
        `  hint: ${filePath} differs from the registry version; re-run with --force to overwrite`,
      )
      return 'skipped'
    }
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content)
  return 'written'
}
