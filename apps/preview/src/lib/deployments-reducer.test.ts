import { type DeploymentResource, deploymentStatus, toYaml } from '@kemo/ui'
import { describe, expect, it } from 'vitest'
import {
  CLOCK_TICK_MS,
  checkSave,
  type DeploymentsAction,
  type DeploymentsState,
  deploymentsReducer,
  heldRollouts,
  initialState,
  ROLLOUT_MS,
} from './deployments-reducer'
import { deployments, relatedFor, starterTemplate, withNamespace } from './mock-deployments'

const CHECKOUT = 'prod-us-east/checkout/checkout-api'
const BILLING = 'prod-us-east/billing/billing-worker'
const WEB = 'prod-us-east/checkout/web-frontend'

const RESTARTED_AT = 'kubectl.kubernetes.io/restartedAt'
const REVISION = 'deployment.kubernetes.io/revision'

const run = (state: DeploymentsState, ...actions: DeploymentsAction[]) =>
  actions.reduce(deploymentsReducer, state)
const resourceOf = (state: DeploymentsState, id: string) => state.items[id]!.resource
const restartedAt = (resource: DeploymentResource) =>
  resource.spec.template.metadata?.annotations?.[RESTARTED_AT]
const seconds = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 1000

describe('deploymentsReducer', () => {
  it('restarts twice: two restartedAt stamps, two rollouts', () => {
    const once = run(initialState, { type: 'restart', ids: [CHECKOUT] })
    const first = resourceOf(once, CHECKOUT)
    expect(deploymentStatus(first)).toBe('progressing')
    expect(first.status?.updatedReplicas).toBe(0)

    const done = run(once, { type: 'restartDone', ids: [CHECKOUT] })
    expect(deploymentStatus(resourceOf(done, CHECKOUT))).toBe('available')

    const twice = run(done, { type: 'restart', ids: [CHECKOUT] })
    const second = resourceOf(twice, CHECKOUT)
    expect(restartedAt(second)).toBeDefined()
    expect(restartedAt(second)).not.toBe(restartedAt(first))
    expect(deploymentStatus(second)).toBe('progressing')
    expect(second.status?.updatedReplicas).toBe(0)
    // A new pod template, so a new ReplicaSet.
    expect(relatedFor(second, 'prod-us-east').replicaSets[0]!.name).not.toBe(
      relatedFor(first, 'prod-us-east').replicaSets[0]!.name,
    )

    const end = run(twice, { type: 'restartDone', ids: [CHECKOUT] })
    expect(deploymentStatus(resourceOf(end, CHECKOUT))).toBe('available')
    const rollouts = end.events[CHECKOUT]!.filter(
      (event) => event.id.startsWith('ev-') && event.reason === 'ScalingReplicaSet',
    )
    expect(rollouts).toHaveLength(2)
  })

  it('moves the clock on with every change, and only then', () => {
    const steps: [DeploymentsAction, number][] = [
      [{ type: 'scale', id: CHECKOUT, replicas: 8 }, 1],
      [{ type: 'restart', ids: [CHECKOUT] }, 1],
      [{ type: 'restartDone', ids: [CHECKOUT] }, ROLLOUT_MS / 1000],
      [{ type: 'setPaused', ids: [CHECKOUT], paused: true }, 1],
      [{ type: 'saveYaml', id: WEB, text: toYaml(resourceOf(initialState, WEB)) }, 1],
      [{ type: 'create', cluster: 'prod-us-east', text: starterTemplate }, 1],
      [{ type: 'tick' }, CLOCK_TICK_MS / 1000],
      [{ type: 'setScope', scope: { clusters: ['prod-eu-west'], namespaces: [] } }, 0],
      [{ type: 'setDraft', id: CHECKOUT, text: 'draft' }, 0],
      // Nothing to change: the clock holds.
      [{ type: 'scale', id: WEB, replicas: 5 }, 0],
      [{ type: 'restartDone', ids: [CHECKOUT] }, 0],
    ]
    let state = initialState
    for (const [action, moved] of steps) {
      const next = deploymentsReducer(state, action)
      expect(seconds(state.now, next.now), action.type).toBe(moved)
      state = next
    }
  })

  it('restarts a paused Deployment when it is resumed', () => {
    const before = resourceOf(initialState, BILLING)
    const restarted = run(initialState, { type: 'restart', ids: [BILLING] })
    const held = resourceOf(restarted, BILLING)
    expect(deploymentStatus(held)).toBe('paused')
    expect(held.status?.updatedReplicas).toBe(0)
    // No rollout yet: no new revision, no ScalingReplicaSet event.
    expect(held.metadata.annotations?.[REVISION]).toBe(before.metadata.annotations?.[REVISION])
    expect(restarted.events[BILLING]).toEqual(initialState.events[BILLING])
    expect(heldRollouts(restarted, [BILLING])).toEqual([BILLING])

    const resumed = run(restarted, { type: 'setPaused', ids: [BILLING], paused: false })
    const rolling = resourceOf(resumed, BILLING)
    expect(deploymentStatus(rolling)).toBe('progressing')
    expect(Number(rolling.metadata.annotations?.[REVISION])).toBe(
      Number(before.metadata.annotations?.[REVISION]) + 1,
    )

    const done = resourceOf(run(resumed, { type: 'restartDone', ids: [BILLING] }), BILLING)
    expect(deploymentStatus(done)).toBe('available')
    expect(done.status?.updatedReplicas).toBe(2)
  })

  it('resumes a Deployment with nothing held straight to available', () => {
    expect(heldRollouts(initialState, [BILLING])).toEqual([])
    const resumed = run(initialState, { type: 'setPaused', ids: [BILLING], paused: false })
    expect(deploymentStatus(resourceOf(resumed, BILLING))).toBe('available')
  })

  it('scales with the missing replicas still missing, and flags a draft', () => {
    const state = run(
      initialState,
      { type: 'setDraft', id: CHECKOUT, text: 'edited' },
      { type: 'scale', id: CHECKOUT, replicas: 8 },
      { type: 'scale', id: WEB, replicas: 8 },
    )
    const checkout = resourceOf(state, CHECKOUT)
    expect([checkout.status?.readyReplicas, checkout.spec.replicas]).toEqual([8, 8])
    expect(state.items[CHECKOUT]!.serverChanged).toBe(true)
    // web-frontend was 3/5 mid-rollout: two still missing.
    expect(resourceOf(state, WEB).status?.readyReplicas).toBe(6)
  })

  it('clears the draft and the server-changed note when the draft is dropped (Reload)', () => {
    const flagged = run(
      initialState,
      { type: 'setDraft', id: CHECKOUT, text: 'edited' },
      { type: 'scale', id: CHECKOUT, replicas: 8 },
    )
    expect(flagged.items[CHECKOUT]!.serverChanged).toBe(true)
    const reloaded = run(flagged, { type: 'setDraft', id: CHECKOUT, text: undefined })
    expect(reloaded.items[CHECKOUT]!.draft).toBeUndefined()
    expect(reloaded.items[CHECKOUT]!.serverChanged).toBeUndefined()
  })

  it('saves YAML, rolling out a new pod template, and rejects what it cannot apply', () => {
    const yaml = toYaml(resourceOf(initialState, CHECKOUT))
    expect(checkSave(initialState, CHECKOUT, 'kind: [')).toMatchObject({
      error: expect.stringMatching(/^Line \d+: /),
    })
    expect(
      checkSave(initialState, CHECKOUT, yaml.replace('kind: Deployment', 'kind: Pod')),
    ).toEqual({ error: "kind, name and namespace can't change" })

    const replicas = checkSave(initialState, CHECKOUT, yaml.replace('replicas: 6', 'replicas: 8'))
    expect(replicas).toMatchObject({ rolloutStarts: false })
    const image = checkSave(initialState, CHECKOUT, yaml.replace(':2.14.0', ':2.15.0'))
    expect(image).toMatchObject({ rolloutStarts: true })

    const saved = run(
      initialState,
      { type: 'setDraft', id: CHECKOUT, text: 'edited' },
      { type: 'saveYaml', id: CHECKOUT, text: yaml.replace('replicas: 6', 'replicas: 8') },
    )
    const resource = resourceOf(saved, CHECKOUT)
    expect(resource.status?.readyReplicas).toBe(8)
    expect(resource.metadata.uid).toBe(resourceOf(initialState, CHECKOUT).metadata.uid)
    expect(saved.items[CHECKOUT]!.draft).toBe('edited')
  })

  it('creates an available Deployment once, in a namespace of its cluster', () => {
    const text = withNamespace(starterTemplate, 'billing')
    const created = run(initialState, { type: 'create', cluster: 'prod-us-east', text })
    const item = created.items['prod-us-east/billing/my-app']
    expect(item).toBeDefined()
    expect(deploymentStatus(item!.resource)).toBe('available')
    expect(item!.resource.metadata.creationTimestamp).toBe(created.now)
    expect(run(created, { type: 'create', cluster: 'prod-us-east', text })).toBe(created)
    expect(run(initialState, { type: 'create', cluster: 'prod-eu-west', text })).toBe(initialState)
  })
})

describe('mock Deployments', () => {
  const related = deployments.map(({ cluster, resource }) => ({
    cluster,
    resource,
    related: relatedFor(resource, cluster),
  }))

  it('has the status mix and the mockups’ replica counts', () => {
    const counts: Record<string, number> = {}
    for (const { resource } of deployments) {
      const status = deploymentStatus(resource)
      counts[status] = (counts[status] ?? 0) + 1
    }
    expect(counts).toEqual({ available: 38, progressing: 4, degraded: 2, paused: 1 })
    const auth = resourceOf(initialState, 'staging-us-east/auth/auth-service')
    expect([auth.status?.readyReplicas, auth.spec.replicas]).toEqual([2, 2])
  })

  it('finds Services by matching their selectors to the pod labels', () => {
    const checkout = resourceOf(initialState, CHECKOUT)
    expect(relatedFor(checkout, 'prod-us-east').services.map((s) => s.name)).toEqual([
      'checkout-api',
    ])
    const relabelled: DeploymentResource = {
      ...checkout,
      spec: {
        ...checkout.spec,
        template: { ...checkout.spec.template, metadata: { labels: { app: 'other' } } },
      },
    }
    const elsewhere = relatedFor(relabelled, 'prod-us-east')
    expect(elsewhere.services).toEqual([])
    expect(elsewhere.ingresses).toEqual([])
  })

  it('gives each Ingress one name per namespace and host', () => {
    const hosts = new Map<string, Set<string>>()
    for (const { cluster, resource, related: objects } of related) {
      for (const ingress of objects.ingresses) {
        const key = `${cluster}/${resource.metadata.namespace}/${ingress.name}`
        hosts.set(key, (hosts.get(key) ?? new Set()).add(ingress.host))
      }
    }
    expect(hosts.size).toBeGreaterThan(0)
    for (const [key, set] of hosts) expect([key, set.size]).toEqual([key, 1])
    const checkout = related.find(
      (r) => `${r.cluster}/checkout/${r.resource.metadata.name}` === CHECKOUT,
    )
    expect(checkout?.related.ingresses).toEqual([
      { name: 'checkout', host: 'checkout.acme.dev', path: '/api', service: 'checkout-api' },
    ])
  })

  it('names in its events only the pods it lists, with ids unique across clusters', () => {
    const ids = new Set<string>()
    let total = 0
    for (const { cluster, resource, related: objects } of related) {
      const id = `${cluster}/${resource.metadata.namespace}/${resource.metadata.name}`
      const events = initialState.events[id]!
      expect(events.length).toBeGreaterThanOrEqual(8)
      expect(events.length).toBeLessThanOrEqual(14)
      const pods = objects.pods.map((pod) => pod.name)
      for (const event of events) {
        ids.add(event.id)
        total++
        if (event.involvedObject.kind === 'Pod') expect(pods).toContain(event.involvedObject.name)
      }
    }
    expect(ids.size).toBe(total)
  })
})
