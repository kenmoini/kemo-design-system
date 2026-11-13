import { describe, expect, it } from 'vitest'
import { deploymentStatus, summarize } from './status'
import type { DeploymentResource } from './types'

function deployment(overrides: Partial<DeploymentResource> = {}): DeploymentResource {
  return {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: { name: 'web', namespace: 'prod', labels: { app: 'web' } },
    spec: {
      replicas: 3,
      selector: { matchLabels: { app: 'web' } },
      template: { spec: { containers: [{ name: 'web', image: 'web:1.0' }] } },
    },
    status: { replicas: 3, updatedReplicas: 3, readyReplicas: 3, availableReplicas: 3 },
    ...overrides,
  }
}

describe('deploymentStatus', () => {
  it('is paused when spec.paused', () => {
    const d = deployment()
    d.spec.paused = true
    expect(deploymentStatus(d)).toBe('paused')
  })

  it('is degraded when Available is False', () => {
    const d = deployment({
      status: { conditions: [{ type: 'Available', status: 'False' }] },
    })
    expect(deploymentStatus(d)).toBe('degraded')
  })

  it('is degraded when ReplicaFailure is True', () => {
    const d = deployment({
      status: { conditions: [{ type: 'ReplicaFailure', status: 'True' }] },
    })
    expect(deploymentStatus(d)).toBe('degraded')
  })

  it('is progressing while a rollout is under way', () => {
    const d = deployment({
      status: {
        conditions: [{ type: 'Progressing', status: 'True', reason: 'ReplicaSetUpdated' }],
      },
    })
    expect(deploymentStatus(d)).toBe('progressing')
  })

  it('is progressing when updatedReplicas < replicas', () => {
    const d = deployment({ status: { replicas: 3, updatedReplicas: 1 } })
    expect(deploymentStatus(d)).toBe('progressing')
  })

  it('is scaled to zero when spec.replicas is 0, with or without a status', () => {
    const d = deployment({ status: undefined })
    d.spec.replicas = 0
    expect(deploymentStatus(d)).toBe('scaled-to-zero')
    d.status = { replicas: 0, updatedReplicas: 0 }
    expect(deploymentStatus(d)).toBe('scaled-to-zero')
  })

  it('is available when all is well', () => {
    const d = deployment({
      status: {
        updatedReplicas: 3,
        conditions: [
          { type: 'Available', status: 'True' },
          { type: 'Progressing', status: 'True', reason: 'NewReplicaSetAvailable' },
        ],
      },
    })
    expect(deploymentStatus(d)).toBe('available')
  })
})

describe('summarize', () => {
  it('builds the list row', () => {
    const d = deployment()
    d.metadata.creationTimestamp = '2026-01-01T00:00:00Z'
    expect(summarize(d, 'c1')).toEqual({
      id: 'c1/prod/web',
      cluster: 'c1',
      namespace: 'prod',
      name: 'web',
      status: 'available',
      ready: 3,
      desired: 3,
      updated: 3,
      available: 3,
      labels: { app: 'web' },
      images: ['web:1.0'],
      createdAt: '2026-01-01T00:00:00Z',
      paused: false,
    })
  })
})
