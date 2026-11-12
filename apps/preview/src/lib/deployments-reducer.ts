import {
  type DeploymentResource,
  type K8sEvent,
  type K8sMeta,
  parseYaml,
  type ScopeValue,
} from '@kemo/ui'
import {
  availableCondition,
  clusters,
  deployments,
  type EventTemplate,
  eventsFor,
  now,
  progressed,
  progressingCondition,
  replicaSetName,
  shiftTime,
  uidFor,
} from './mock-deployments'

// The Deployments demo's in-memory state. Every change goes through `deploymentsReducer`, so it
// stays pure and deterministic: new ids come from `nextId` and times from the demo clock (`now`,
// moved on by each live event), never the wall clock.

export interface DeploymentItem {
  cluster: string
  /** The server copy. */
  resource: DeploymentResource
  /** The YAML tab's unsaved edit; kept across tab and route changes. */
  draft?: string
  /** The server copy changed under the draft (a scale, a restart, the rollout finishing). */
  serverChanged?: boolean
}

export interface DeploymentsState {
  /** The list's scope; `[]` means "All". The layout persists it in `localStorage`. */
  scope: ScopeValue
  /** By id, `{cluster}/{namespace}/{name}`. */
  items: Record<string, DeploymentItem>
  /** Each Deployment's events (and its children's), by its id. */
  events: Record<string, K8sEvent[]>
  /** The demo clock. */
  now: string
  nextId: number
}

export type DeploymentsAction =
  | { type: 'setScope'; scope: ScopeValue }
  | { type: 'scale'; id: string; replicas: number }
  /** Stamp `restartedAt` on the pod template: a rollout starts (see `restartDone`). */
  | { type: 'restart'; ids: string[] }
  /** The rollouts of `ids` finish: every replica updated, ready and available. */
  | { type: 'restartDone'; ids: string[] }
  | { type: 'setPaused'; ids: string[]; paused: boolean }
  | { type: 'delete'; ids: string[] }
  | { type: 'setDraft'; id: string; text?: string }
  | { type: 'saveYaml'; id: string; text: string }
  | { type: 'create'; cluster: string; text: string }
  /** The live stream: `event` happens now (a repeat counts once more). */
  | { type: 'eventTick'; id: string; event: EventTemplate }

/** How far the demo clock moves with each live event. */
export const LIVE_TICK_MS = 4000
/** How many events a Deployment keeps. */
const MAX_EVENTS = 50

const RESTARTED_AT = 'kubectl.kubernetes.io/restartedAt'
const REVISION = 'deployment.kubernetes.io/revision'

export const idOf = (cluster: string, resource: DeploymentResource) =>
  `${cluster}/${resource.metadata.namespace}/${resource.metadata.name}`

export const initialState: DeploymentsState = {
  scope: { clusters: [], namespaces: [] },
  items: Object.fromEntries(
    deployments.map(({ cluster, resource }) => [idOf(cluster, resource), { cluster, resource }]),
  ),
  events: Object.fromEntries(
    deployments.map(({ cluster, resource }) => [idOf(cluster, resource), eventsFor(resource)]),
  ),
  now,
  nextId: 1,
}

// --- Checks ------------------------------------------------------------------------------------

type Checked<T> = T | { error: string }

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** The YAML as an object, or what is wrong with it (the first parse error). */
function parseObject(text: string): Checked<{ value: Record<string, unknown> }> {
  const { value, errors } = parseYaml(text)
  const first = errors[0]
  if (first) return { error: `Line ${first.line}: ${first.message.split('\n')[0]}` }
  if (!isObject(value)) return { error: 'The YAML must describe one Deployment.' }
  return { value }
}

/** What the pages read without checking, checked: a host never trusts typed-in YAML. */
function shapeProblem(value: Record<string, unknown>): string | undefined {
  const metadata = value.metadata
  if (!isObject(metadata) || typeof metadata.name !== 'string' || !metadata.name) {
    return 'metadata.name is required.'
  }
  if (typeof metadata.namespace !== 'string' || !metadata.namespace) {
    return 'metadata.namespace is required.'
  }
  const spec = value.spec
  if (!isObject(spec) || !isObject(spec.selector)) return 'spec.selector is required.'
  if (
    spec.replicas !== undefined &&
    (!Number.isInteger(spec.replicas) || Number(spec.replicas) < 0)
  )
    return 'spec.replicas must be a whole number.'
  const template = spec.template
  const pod = isObject(template) ? template.spec : undefined
  const containers = isObject(pod) ? pod.containers : undefined
  if (!isObject(pod) || !Array.isArray(containers) || containers.length === 0) {
    return 'spec.template.spec.containers needs at least one container.'
  }
  for (const container of containers) {
    if (!isObject(container) || typeof container.name !== 'string') {
      return 'Every container needs a name.'
    }
    if (typeof container.image !== 'string') return `Container ${container.name} needs an image.`
    for (const list of ['env', 'envFrom', 'ports', 'volumeMounts']) {
      if (container[list] !== undefined && !Array.isArray(container[list])) {
        return `${container.name}: ${list} must be a list.`
      }
    }
  }
  if (pod.volumes !== undefined && !Array.isArray(pod.volumes)) return 'volumes must be a list.'
  return undefined
}

const bump = (resourceVersion: string | undefined) => String(Number(resourceVersion ?? 0) + 1)
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b)

/** A copy of `value` without `keys`. */
function without<T extends object, K extends keyof T>(value: T, keys: K[]): Omit<T, K> {
  const copy = { ...value }
  for (const key of keys) delete copy[key]
  return copy
}

/**
 * `next`'s metadata with the server's fields set (they can't be edited) and in the server's order:
 * name, namespace, uid, resourceVersion, generation, creationTimestamp, then the rest as typed.
 */
function serverMetadata(next: K8sMeta, server: Partial<K8sMeta>): K8sMeta {
  const rest = without(next, [
    'name',
    'namespace',
    'uid',
    'resourceVersion',
    'generation',
    'creationTimestamp',
  ])
  return { name: next.name, namespace: next.namespace, ...server, ...rest }
}

/**
 * The status after the spec changes from `old` to `next`: the replicas that were missing stay
 * missing, and a new pod template (unless paused) starts a rollout, nothing updated yet.
 */
function statusAfter(
  old: DeploymentResource,
  next: DeploymentResource,
  generation: number,
  at: string,
): DeploymentResource['status'] {
  const status = old.status ?? {}
  const before = old.spec.replicas ?? 1
  const replicas = next.spec.replicas ?? 1
  const follow = (count: number | undefined) =>
    Math.max(0, replicas - Math.max(0, before - (count ?? 0)))
  const rollout = !next.spec.paused && !same(old.spec.template, next.spec.template)
  const conditions = (status.conditions ?? []).map((condition) =>
    rollout && condition.type === 'Progressing'
      ? progressingCondition(replicaSetName(next), at)
      : condition,
  )
  return {
    ...status,
    replicas,
    updatedReplicas: rollout ? 0 : follow(status.updatedReplicas),
    readyReplicas: follow(status.readyReplicas),
    availableReplicas: follow(status.availableReplicas),
    observedGeneration: generation,
    conditions,
  }
}

/** `old` replaced by `next` (same kind, name and namespace), the way the API server applies it. */
function applySpec(old: DeploymentResource, next: DeploymentResource, at: string) {
  const generation = (old.metadata.generation ?? 1) + (same(old.spec, next.spec) ? 0 : 1)
  const rollout = !next.spec.paused && !same(old.spec.template, next.spec.template)
  const annotations = { ...next.metadata.annotations }
  if (!same(old.spec.template, next.spec.template) && annotations[REVISION]) {
    annotations[REVISION] = String(Number(annotations[REVISION]) + 1)
  }
  const resource: DeploymentResource = {
    ...next,
    metadata: serverMetadata(
      { ...next.metadata, ...(next.metadata.annotations ? { annotations } : {}) },
      {
        uid: old.metadata.uid,
        resourceVersion: bump(old.metadata.resourceVersion),
        generation,
        creationTimestamp: old.metadata.creationTimestamp,
      },
    ),
    status: statusAfter(old, next, generation, at),
  }
  return { resource, rollout }
}

/**
 * Save: what the YAML tab's Save applies to Deployment `id`, or why it can't. Kind, name and
 * namespace can't change; status and the server's metadata fields are the server's.
 */
export function checkSave(
  state: DeploymentsState,
  id: string,
  text: string,
): Checked<{ resource: DeploymentResource; rollout: boolean }> {
  const item = state.items[id]
  if (!item) return { error: 'This Deployment no longer exists.' }
  const parsed = parseObject(text)
  if ('error' in parsed) return parsed
  const { value } = parsed
  const old = item.resource
  const metadata = isObject(value.metadata) ? value.metadata : {}
  if (
    value.apiVersion !== old.apiVersion ||
    value.kind !== old.kind ||
    metadata.name !== old.metadata.name ||
    metadata.namespace !== old.metadata.namespace
  ) {
    return { error: "kind, name and namespace can't change" }
  }
  const problem = shapeProblem(value)
  if (problem) return { error: problem }
  return applySpec(old, value as unknown as DeploymentResource, state.now)
}

/** Create: the new Deployment in `cluster` and its id, or why it can't be created. */
export function checkCreate(
  state: DeploymentsState,
  cluster: string,
  text: string,
): Checked<{ id: string; resource: DeploymentResource }> {
  const option = clusters.find((c) => c.id === cluster)
  if (!option) return { error: 'Choose a cluster.' }
  const parsed = parseObject(text)
  if ('error' in parsed) return parsed
  const { value } = parsed
  if (value.apiVersion !== 'apps/v1' || value.kind !== 'Deployment') {
    return { error: 'Only apps/v1 Deployments can be created here.' }
  }
  const problem = shapeProblem(value)
  if (problem) return { error: problem }
  const next = value as unknown as DeploymentResource
  const { name, namespace } = next.metadata
  if (!option.namespaces.includes(namespace)) {
    return { error: `${namespace} isn't a namespace of ${cluster}.` }
  }
  const id = idOf(cluster, next)
  if (state.items[id]) return { error: `${name} already exists in ${cluster} · ${namespace}.` }

  const replicas = next.spec.replicas ?? 1
  const at = state.now
  const resource: DeploymentResource = {
    ...next,
    metadata: serverMetadata(next.metadata, {
      uid: uidFor(`${id}#${state.nextId}`),
      resourceVersion: '1',
      generation: 1,
      creationTimestamp: at,
    }),
    status: {
      replicas,
      updatedReplicas: replicas,
      readyReplicas: replicas,
      availableReplicas: replicas,
      observedGeneration: 1,
      conditions: [availableCondition(at), progressed(replicaSetName(next), at)],
    },
  }
  return { id, resource }
}

// --- Reducer -----------------------------------------------------------------------------------

/** `items` with `update` applied to each of `ids` that exists; a dirty draft hears about it. */
function updateItems(
  items: DeploymentsState['items'],
  ids: string[],
  update: (resource: DeploymentResource) => DeploymentResource,
): DeploymentsState['items'] {
  const next = { ...items }
  for (const id of ids) {
    const item = next[id]
    if (!item) continue
    const resource = update(item.resource)
    if (resource === item.resource) continue
    next[id] = {
      ...item,
      resource,
      ...(item.draft !== undefined ? { serverChanged: true } : {}),
    }
  }
  return next
}

/** `events` with a new Deployment event for each of `ids`, stamped now. */
function withEvents(
  state: DeploymentsState,
  entries: { id: string; event: EventTemplate }[],
): Pick<DeploymentsState, 'events' | 'nextId'> {
  let nextId = state.nextId
  const events = { ...state.events }
  for (const { id, event } of entries) {
    const stamped = { ...event, id: `ev-${nextId++}`, firstSeen: state.now, lastSeen: state.now }
    events[id] = [stamped, ...(events[id] ?? [])].slice(0, MAX_EVENTS)
  }
  return { events, nextId }
}

const scaledEvent = (resource: DeploymentResource, from: number, to: number): EventTemplate => ({
  type: 'Normal',
  reason: 'ScalingReplicaSet',
  message: `Scaled ${to > from ? 'up' : 'down'} replica set ${replicaSetName(resource)} to ${to} from ${from}`,
  involvedObject: { kind: 'Deployment', name: resource.metadata.name },
  count: 1,
  source: 'deployment-controller',
})

/** The resource with `patch` applied to its spec, through `applySpec`. */
const patchSpec = (
  resource: DeploymentResource,
  patch: (spec: DeploymentResource['spec']) => DeploymentResource['spec'],
  at: string,
) => applySpec(resource, { ...resource, spec: patch(resource.spec) }, at).resource

export function deploymentsReducer(
  state: DeploymentsState,
  action: DeploymentsAction,
): DeploymentsState {
  switch (action.type) {
    case 'setScope':
      return { ...state, scope: action.scope }

    case 'scale': {
      const item = state.items[action.id]
      const from = item?.resource.spec.replicas ?? 1
      if (!item || from === action.replicas) return state
      const items = updateItems(state.items, [action.id], (resource) =>
        patchSpec(resource, (spec) => ({ ...spec, replicas: action.replicas }), state.now),
      )
      const scaled = items[action.id]!.resource
      return {
        ...state,
        items,
        ...withEvents(state, [
          { id: action.id, event: scaledEvent(scaled, from, action.replicas) },
        ]),
      }
    }

    case 'restart': {
      const items = updateItems(state.items, action.ids, (resource) =>
        patchSpec(
          resource,
          (spec) => ({
            ...spec,
            template: {
              ...spec.template,
              metadata: {
                ...spec.template.metadata,
                annotations: { ...spec.template.metadata?.annotations, [RESTARTED_AT]: state.now },
              },
            },
          }),
          state.now,
        ),
      )
      // A paused Deployment takes the new template but doesn't roll it out until resumed.
      const started = action.ids.filter((id) => {
        const item = items[id]
        return item !== undefined && !item.resource.spec.paused
      })
      return {
        ...state,
        items,
        ...withEvents(
          state,
          started.map((id) => {
            const resource = items[id]!.resource
            return {
              id,
              event: {
                ...scaledEvent(resource, 0, 1),
                message: `Scaled up replica set ${replicaSetName(resource)} to 1`,
              },
            }
          }),
        ),
      }
    }

    case 'restartDone':
      return {
        ...state,
        items: updateItems(state.items, action.ids, (resource) => {
          const status = resource.status ?? {}
          const replicas = resource.spec.replicas ?? 1
          if (resource.spec.paused) return resource
          const complete = (status.conditions ?? []).some(
            (c) => c.type === 'Progressing' && c.reason === 'NewReplicaSetAvailable',
          )
          if (complete && status.updatedReplicas === replicas) return resource
          // An Available condition that held keeps the time it became true.
          const available = status.conditions?.find(
            (c) => c.type === 'Available' && c.status === 'True',
          )
          return {
            ...resource,
            metadata: {
              ...resource.metadata,
              resourceVersion: bump(resource.metadata.resourceVersion),
            },
            status: {
              ...status,
              replicas,
              updatedReplicas: replicas,
              readyReplicas: replicas,
              availableReplicas: replicas,
              conditions: [
                available ?? availableCondition(state.now),
                progressed(replicaSetName(resource), state.now),
              ],
            },
          }
        }),
      }

    case 'setPaused':
      return {
        ...state,
        items: updateItems(state.items, action.ids, (resource) => {
          if (!!resource.spec.paused === action.paused) return resource
          const spec = without(resource.spec, ['paused'])
          const next = patchSpec(
            resource,
            () => (action.paused ? { ...spec, paused: true } : spec),
            state.now,
          )
          const status = next.status ?? {}
          const replicas = next.spec.replicas ?? 1
          const rs = replicaSetName(next)
          const progressing = action.paused
            ? {
                type: 'Progressing' as const,
                status: 'Unknown' as const,
                reason: 'DeploymentPaused',
                message: 'Deployment is paused',
                lastTransitionTime: state.now,
              }
            : (status.updatedReplicas ?? 0) < replicas
              ? progressingCondition(rs, state.now)
              : progressed(rs, state.now)
          return {
            ...next,
            status: {
              ...status,
              conditions: (status.conditions ?? []).map((c) =>
                c.type === 'Progressing' ? progressing : c,
              ),
            },
          }
        }),
      }

    case 'delete': {
      const items = { ...state.items }
      const events = { ...state.events }
      for (const id of action.ids) {
        delete items[id]
        delete events[id]
      }
      return { ...state, items, events }
    }

    case 'setDraft': {
      const item = state.items[action.id]
      if (!item || item.draft === action.text) return state
      const rest = without(item, ['draft', 'serverChanged'])
      const { serverChanged } = item
      return {
        ...state,
        items: {
          ...state.items,
          // Discarding the draft (Reload, undo, a save) also clears the "server changed" note.
          [action.id]:
            action.text === undefined
              ? rest
              : { ...rest, draft: action.text, ...(serverChanged ? { serverChanged } : {}) },
        },
      }
    }

    case 'saveYaml': {
      const item = state.items[action.id]
      const checked = checkSave(state, action.id, action.text)
      if (!item || 'error' in checked) return state
      const rest = without(item, ['draft', 'serverChanged'])
      const { draft } = item
      return {
        ...state,
        items: {
          ...state.items,
          // Edits typed while the save ran stay as the draft.
          [action.id]: {
            ...rest,
            resource: checked.resource,
            ...(draft !== undefined && draft !== action.text ? { draft } : {}),
          },
        },
      }
    }

    case 'create': {
      const checked = checkCreate(state, action.cluster, action.text)
      if ('error' in checked) return state
      const { id, resource } = checked
      const replicas = resource.spec.replicas ?? 1
      return {
        ...state,
        items: { ...state.items, [id]: { cluster: action.cluster, resource } },
        ...withEvents({ ...state, nextId: state.nextId + 1 }, [
          { id, event: scaledEvent(resource, 0, replicas) },
        ]),
      }
    }

    case 'eventTick': {
      if (!state.items[action.id]) return state
      const at = shiftTime(state.now, LIVE_TICK_MS)
      const list = state.events[action.id] ?? []
      const { event } = action
      const index = list.findIndex(
        (e) =>
          e.type === event.type &&
          e.reason === event.reason &&
          e.message === event.message &&
          e.involvedObject.kind === event.involvedObject.kind &&
          e.involvedObject.name === event.involvedObject.name,
      )
      const repeat = list[index]
      const events = repeat
        ? [
            { ...repeat, count: repeat.count + 1, lastSeen: at },
            ...list.filter((e) => e !== repeat),
          ]
        : [{ ...event, id: `live-${state.nextId}`, firstSeen: at, lastSeen: at }, ...list].slice(
            0,
            MAX_EVENTS,
          )
      return {
        ...state,
        now: at,
        events: { ...state.events, [action.id]: events },
        nextId: repeat ? state.nextId : state.nextId + 1,
      }
    }
  }
}
