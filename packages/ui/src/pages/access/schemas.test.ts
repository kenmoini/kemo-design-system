import { describe, expect, it } from 'vitest'
import { permissionDefaults, permissionSchema } from './schemas'

const parse = (name: string) =>
  permissionSchema.safeParse({
    ...permissionDefaults,
    name,
    resource: 'deployments',
    action: 'read',
  })

describe('permissionSchema name', () => {
  it('accepts resource.action, with hyphens inside either part', () => {
    expect(parse('deployments.create').success).toBe(true)
    expect(parse('deployments.read-only').success).toBe(true)
    expect(parse('service-accounts.read').success).toBe(true)
  })

  it('rejects spaces, stray hyphens and a missing action', () => {
    expect(parse('deployments. create').success).toBe(false)
    expect(parse('deployments.read only').success).toBe(false)
    expect(parse('-deployments.read').success).toBe(false)
    expect(parse('deployments.read-').success).toBe(false)
    expect(parse('deployments').success).toBe(false)
  })
})
