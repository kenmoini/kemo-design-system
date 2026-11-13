import { createSchemaRegistry, type SchemaRegistry } from '../resources'
import { deploymentSchema } from './schema/deployment-schema'

/** The schemas this package bundles: the trimmed `apps/v1` Deployment. */
export const defaultSchemaRegistry: SchemaRegistry = {
  ...createSchemaRegistry(),
  'apps/v1/Deployment': deploymentSchema,
}
