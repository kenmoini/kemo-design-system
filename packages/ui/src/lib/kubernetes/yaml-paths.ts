import YAML, { isMap, isPair, isSeq, type Node, type Pair } from 'yaml'

type Path = (string | number)[]

function rangeOf(node: unknown): [number, number, number] | undefined {
  return (node as Node | null | undefined)?.range ?? undefined
}

function keyName(pair: Pair): string | undefined {
  const key = pair.key as { value?: unknown } | null
  return key && key.value !== undefined && key.value !== null ? String(key.value) : undefined
}

function pairSpan(pair: Pair): [number, number] | undefined {
  const k = rangeOf(pair.key)
  if (!k) return undefined
  const v = rangeOf(pair.value)
  return [k[0], Math.max(k[1], v ? v[2] : k[1])]
}

function walk(node: unknown, offset: number, path: Path): Path {
  if (isMap(node)) {
    for (const item of node.items) {
      const span = pairSpan(item)
      const name = keyName(item)
      if (!span || name === undefined || offset < span[0] || offset > span[1]) continue
      const here = [...path, name]
      const k = rangeOf(item.key)!
      if (offset <= k[1]) return here
      return walk(item.value, offset, here)
    }
  } else if (isSeq(node)) {
    for (const [index, item] of node.items.entries()) {
      const r = rangeOf(item)
      if (r && offset >= r[0] && offset <= r[2]) return walk(item, offset, [...path, index])
    }
  }
  return path
}

/** The key path of the deepest node containing `offset`; `[]` outside any entry. */
export function pathAtOffset(text: string, offset: number): Path {
  const doc = YAML.parseDocument(text)
  return walk(doc.contents, offset, [])
}

/** The start of the key (map entries) or the item (sequences) at `path`; `undefined` if missing. */
export function offsetForPath(text: string, path: Path): number | undefined {
  const doc = YAML.parseDocument(text)
  let node: unknown = doc.contents
  let start: number | undefined
  for (const step of path) {
    if (isMap(node)) {
      const pair = node.items.find((p) => isPair(p) && keyName(p) === String(step))
      if (!pair) return undefined
      start = rangeOf(pair.key)?.[0]
      node = pair.value
    } else if (isSeq(node) && typeof step === 'number') {
      const item = node.items[step]
      if (item === undefined) return undefined
      start = rangeOf(item)?.[0]
      node = item
    } else {
      return undefined
    }
  }
  return path.length > 0 ? start : undefined
}
