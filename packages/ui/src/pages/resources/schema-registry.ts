import { deploymentSchema } from '../deployments/schema/deployment-schema'

/** One JSON Schema per kind, keyed `${apiVersion}/${kind}` (e.g. `apps/v1/Deployment`). */
export type SchemaRegistry = Record<string, object>

export function schemaFor(
  registry: SchemaRegistry,
  apiVersion: string,
  kind: string,
): object | undefined {
  return registry[`${apiVersion}/${kind}`]
}

/** The schemas this package bundles: the trimmed `apps/v1` Deployment. */
export const defaultSchemaRegistry: SchemaRegistry = { 'apps/v1/Deployment': deploymentSchema }
