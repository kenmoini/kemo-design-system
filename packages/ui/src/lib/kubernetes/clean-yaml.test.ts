import { describe, expect, it } from 'vitest'
import { cleanResource, cleanYaml, parseYaml, toYaml } from './clean-yaml'

const resource = {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'web',
    namespace: 'prod',
    uid: 'abc',
    resourceVersion: '12',
    generation: 4,
    creationTimestamp: '2026-01-01T00:00:00Z',
    selfLink: '/apis/x',
    managedFields: [{ manager: 'kubectl' }],
    labels: { app: 'web' },
    annotations: {
      'kubectl.kubernetes.io/last-applied-configuration': '{}',
      'team/owner': 'platform',
    },
  },
  spec: { replicas: 2 },
  status: { replicas: 2 },
}

describe('cleanResource without metadata', () => {
  it('does not throw and still drops status', () => {
    const out = cleanResource({ kind: 'Widget', status: { ok: true } } as never)
    expect(out).toEqual({ kind: 'Widget' })
  })
})

describe('cleanYaml', () => {
  it('strips only the server-managed fields', () => {
    const out = cleanYaml(resource)
    for (const gone of [
      'uid',
      'resourceVersion',
      'generation',
      'creationTimestamp',
      'managedFields',
      'selfLink',
      'last-applied-configuration',
      'status',
    ]) {
      expect(out).not.toContain(gone)
    }
    expect(out).toContain('labels:')
    expect(out).toContain('team/owner: platform')
    const keys = out.split('\n').filter((l) => /^[a-z]/i.test(l))
    expect(keys.map((l) => l.split(':')[0])).toEqual(['apiVersion', 'kind', 'metadata', 'spec'])
    expect(out).toContain('\n  name: web')
    expect(resource.status).toBeDefined()
  })
})

describe('toYaml / parseYaml', () => {
  it('round-trips', () => {
    const value = { a: 1, b: { c: ['x', 'y'] } }
    expect(parseYaml(toYaml(value))).toEqual({ value, errors: [] })
  })

  it('reports a line and column for bad indentation', () => {
    const { value, errors } = parseYaml('a:\n  b: 1\n c: 2\n')
    expect(value).toBeUndefined()
    expect(errors.length).toBeGreaterThan(0)
    expect(errors[0]).toMatchObject({ line: expect.any(Number), col: expect.any(Number) })
    expect(errors[0]!.line).toBeGreaterThanOrEqual(1)
  })
})
