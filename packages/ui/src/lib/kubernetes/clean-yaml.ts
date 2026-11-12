import YAML from 'yaml'
import type { K8sMeta } from './types'

const LAST_APPLIED = 'kubectl.kubernetes.io/last-applied-configuration'

/** A deep copy without the server-managed metadata fields and `status`. */
export function cleanResource<T extends { metadata: K8sMeta; status?: unknown }>(r: T): T {
  const copy = structuredClone(r) as T & { metadata: Partial<K8sMeta> }
  const meta = copy.metadata
  delete meta.uid
  delete meta.resourceVersion
  delete meta.generation
  delete meta.creationTimestamp
  delete meta.managedFields
  delete (meta as { selfLink?: string }).selfLink
  if (meta.annotations) {
    delete meta.annotations[LAST_APPLIED]
    if (Object.keys(meta.annotations).length === 0) delete meta.annotations
  }
  delete copy.status
  return copy
}

export function toYaml(obj: unknown): string {
  return YAML.stringify(obj, { indent: 2, lineWidth: 0 })
}

export function cleanYaml<T extends { metadata: K8sMeta; status?: unknown }>(r: T): string {
  return toYaml(cleanResource(r))
}

export interface YamlError {
  message: string
  line: number
  col: number
}

/** `value` is `undefined` when there are errors. Lines and columns are 1-based. */
export function parseYaml<T = unknown>(text: string): { value: T; errors: YamlError[] } {
  const doc = YAML.parseDocument(text)
  if (doc.errors.length > 0) {
    const errors = doc.errors.map((e) => ({
      message: e.message,
      line: e.linePos?.[0].line ?? 1,
      col: e.linePos?.[0].col ?? 1,
    }))
    return { value: undefined as T, errors }
  }
  return { value: doc.toJS() as T, errors: [] }
}
