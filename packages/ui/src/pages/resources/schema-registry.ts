/** One JSON Schema per kind, keyed `${apiVersion}/${kind}` (e.g. `apps/v1/Deployment`). */
export type SchemaRegistry = Record<string, object>

/** An empty registry; a kind's module (or the host) adds its schemas. */
export function createSchemaRegistry(): SchemaRegistry {
  return {}
}

export function schemaFor(
  registry: SchemaRegistry,
  apiVersion: string,
  kind: string,
): object | undefined {
  return registry[`${apiVersion}/${kind}`]
}
