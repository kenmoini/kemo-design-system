// A pure walker over a draft-07-style JSON Schema (a CRD's openAPIV3Schema, a converted OpenAPI
// definition, the bundled Deployment schema). It never throws and never loops: `$ref` chains carry
// a visited set, and every step down the path consumes one segment.

type Path = (string | number)[]
type Raw = Record<string, unknown>

export interface SchemaField {
  name: string
  /** A display type: `string`, `integer | string`, `object`; a `oneOf`/`anyOf` lists its alternatives' types. */
  type: string
  required: boolean
  description?: string
  enum?: unknown[]
  default?: unknown
  /** Objects and arrays, and references that lead nowhere known: the browser offers to open them. */
  drillable: boolean
}

export interface SchemaNode {
  path: Path
  title?: string
  description?: string
  /** `object`, `array`, `string`, `string | null`, …; `oneOf`/`anyOf` when the node is only alternatives. */
  type: string
  required: string[]
  enum?: unknown[]
  default?: unknown
  /** Own properties, plus a `*` field for an `additionalProperties` schema. */
  fields: SchemaField[]
  /** For an array with an `items` schema: the path of its items (`[...path, 0]`). */
  itemsPath?: Path
  /** For a `oneOf`/`anyOf` node: each alternative, resolved one level (no nested alternatives). */
  alternatives?: SchemaNode[]
}

const isRecord = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** `true` is the schema that allows anything; `false` and non-schemas are skipped. */
const asSchema = (value: unknown): Raw | undefined =>
  isRecord(value) ? value : value === true ? {} : undefined

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((v): v is string => typeof v === 'string') : []

function decodeToken(token: string): string {
  let decoded = token
  try {
    decoded = decodeURIComponent(token)
  } catch {
    // A malformed escape stays as written.
  }
  return decoded.replace(/~1/g, '/').replace(/~0/g, '~')
}

/** Resolves a local JSON pointer (`#`, `#/definitions/X`, `#/$defs/X/properties/y`); remote refs are not fetched. */
function pointer(root: Raw, ref: string): Raw | undefined {
  if (!ref.startsWith('#')) return undefined
  let current: unknown = root
  for (const token of ref.slice(1).split('/').slice(1)) {
    const key = decodeToken(token)
    current = Array.isArray(current)
      ? current[Number(key)]
      : isRecord(current) && Object.hasOwn(current, key)
        ? current[key]
        : undefined
  }
  return isRecord(current) ? current : undefined
}

/** `primary` wins on every keyword; `properties` and `required` are unions (primary's first). */
function merge(primary: Raw, secondary: Raw): Raw {
  const out: Raw = { ...secondary, ...primary }
  if (isRecord(primary.properties) || isRecord(secondary.properties)) {
    const own = isRecord(primary.properties) ? primary.properties : {}
    const other = isRecord(secondary.properties) ? secondary.properties : {}
    // fromEntries defines keys, so even a property named `__proto__` stays a property.
    out.properties = Object.fromEntries([
      ...Object.entries(own),
      ...Object.entries(other).filter(([name]) => !Object.hasOwn(own, name)),
    ])
  }
  const required = [...new Set([...strings(primary.required), ...strings(secondary.required)])]
  if (required.length > 0) out.required = required
  return out
}

/**
 * Inlines `$ref` (the referencing node's own keywords win over the target's) and merges `allOf`.
 * `seen` holds the targets on the current chain: meeting one again is a cycle, which keeps what the
 * referencing node says and stops there.
 */
function expand(root: Raw, node: Raw, seen: ReadonlySet<Raw>): Raw {
  let out = node
  if (typeof node.$ref === 'string') {
    const { $ref, ...siblings } = node
    const target = pointer(root, $ref)
    out =
      target && !seen.has(target)
        ? merge(siblings, expand(root, target, new Set(seen).add(target)))
        : siblings
  }
  if (Array.isArray(out.allOf)) {
    const { allOf, ...rest } = out
    out = allOf.reduce<Raw>((acc, part) => {
      const schema = asSchema(part)
      return schema && !seen.has(schema)
        ? merge(acc, expand(root, schema, new Set(seen).add(schema)))
        : acc
    }, rest)
  }
  return out
}

function typeOf(node: Raw): string {
  if (typeof node.type === 'string') return node.type
  const listed = strings(node.type)
  if (listed.length > 0) return listed.join(' | ')
  if (isRecord(node.properties) || isRecord(node.additionalProperties)) return 'object'
  if (node.items !== undefined) return 'array'
  if (Array.isArray(node.oneOf)) return 'oneOf'
  if (Array.isArray(node.anyOf)) return 'anyOf'
  return 'any'
}

const hasType = (type: string, wanted: string) => type.split(' | ').includes(wanted)

function alternativesOf(node: Raw, type: string): Raw[] | undefined {
  if (type !== 'oneOf' && type !== 'anyOf') return undefined
  const list = node[type]
  if (!Array.isArray(list)) return undefined
  return list.map(asSchema).filter((schema): schema is Raw => schema !== undefined)
}

/**
 * Whether a field opens, judged on its expanded schema: objects and arrays do. A `$ref` opens only
 * when it leads nowhere known (unresolved or cyclic, so `any`); one naming a scalar (`Time`,
 * `Quantity`) is a leaf. Tuple `items` (an array of schemas) are not browsed.
 */
function structural(raw: Raw, node: Raw, type: string): boolean {
  if (Array.isArray(node.items)) return false
  if (type === 'any') return typeof raw.$ref === 'string'
  return (
    hasType(type, 'object') ||
    hasType(type, 'array') ||
    isRecord(node.properties) ||
    isRecord(node.items)
  )
}

function lift(node: Raw) {
  const out: Pick<SchemaField, 'description' | 'enum' | 'default'> = {}
  if (typeof node.description === 'string') out.description = node.description
  if (Array.isArray(node.enum)) out.enum = node.enum
  if (node.default !== undefined) out.default = node.default
  return out
}

function toField(root: Raw, name: string, raw: Raw, required: boolean): SchemaField {
  const node = expand(root, raw, new Set())
  let type = typeOf(node)
  let drillable = structural(raw, node, type)
  const alternatives = alternativesOf(node, type)
  if (alternatives && alternatives.length > 0) {
    const expanded = alternatives.map((alt) => ({ alt, node: expand(root, alt, new Set()) }))
    type = [...new Set(expanded.map((e) => typeOf(e.node)))].join(' | ')
    drillable = expanded.some((e) => structural(e.alt, e.node, typeOf(e.node)))
  }
  return { name, type, required, ...lift(node), drillable }
}

function toNode(root: Raw, raw: Raw, path: Path, nested = false): SchemaNode {
  const node = expand(root, raw, new Set())
  const type = typeOf(node)
  const required = strings(node.required)
  const fields: SchemaField[] = []
  if (isRecord(node.properties)) {
    for (const [name, value] of Object.entries(node.properties)) {
      const schema = asSchema(value)
      if (schema) fields.push(toField(root, name, schema, required.includes(name)))
    }
  }
  if (isRecord(node.additionalProperties)) {
    fields.push(toField(root, '*', node.additionalProperties, false))
  }
  const out: SchemaNode = { path: [...path], type, required, fields, ...lift(node) }
  if (typeof node.title === 'string') out.title = node.title
  if (hasType(type, 'array') && isRecord(node.items)) out.itemsPath = [...path, 0]
  const alternatives = alternativesOf(node, type)
  if (alternatives && !nested) {
    out.alternatives = alternatives.map((alt) => toNode(root, alt, path, true))
  }
  return out
}

/**
 * One step down an expanded node: a number indexes the `items` schema; a string names a property, or
 * any key of `additionalProperties`.
 */
function stepDirect(node: Raw, segment: string | number): Raw | undefined {
  if (typeof segment === 'number') return isRecord(node.items) ? node.items : undefined
  // Own keys only: `__proto__` or `constructor` must not resolve through the prototype chain.
  if (isRecord(node.properties) && Object.hasOwn(node.properties, segment)) {
    const property = asSchema(node.properties[segment])
    if (property) return property
  }
  return isRecord(node.additionalProperties) ? node.additionalProperties : undefined
}

function step(root: Raw, node: Raw, segment: string | number): Raw | undefined {
  const direct = stepDirect(node, segment)
  if (direct) return direct
  // Through `oneOf`/`anyOf`, one level: the first alternative that knows the segment.
  for (const key of ['oneOf', 'anyOf'] as const) {
    const list = node[key]
    if (!Array.isArray(list)) continue
    for (const alt of list) {
      const schema = asSchema(alt)
      const found = schema && stepDirect(expand(root, schema, new Set()), segment)
      if (found) return found
    }
  }
  return undefined
}

/**
 * Walks `schema` from its root along `path` (object keys; numbers for array items) and describes the
 * node there, or returns `undefined` when the schema does not document that path.
 */
export function resolveNode(schema: object, path: Path): SchemaNode | undefined {
  if (!isRecord(schema)) return undefined
  let raw: Raw = schema
  for (const segment of path) {
    const next = step(schema, expand(schema, raw, new Set()), segment)
    if (!next) return undefined
    raw = next
  }
  return toNode(schema, raw, path)
}
