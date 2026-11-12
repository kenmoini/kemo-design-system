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
  pausedCondition,
  progressed,
  progressingCondition,
  replicaSetName,
  shiftTime,
  uidFor,
} from './mock-deployments'

// The Deployments demo's in-memory state. Every change goes through `deploymentsReducer`, so it
// stays pure and deterministic: new ids come from `nextId` and times from the demo clock, `now`.
// The clock never reads the wall clock: every change moves it on (a second for an action, the
// rollout's length when a rollout finishes, four seconds per live event), and the shell's `tick`
// moves it half a minute at a time while the page is open, so the ages move too.

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
  /** Stamp `restartedAt` on the pod template: a rollout starts, unless paused (see `restartDone`). */
  | { type: 'restart'; ids: string[] }
  /** The rollouts of `ids` finish: every replica updated, ready and available. */
  | { type: 'restartDone'; ids: string[] }
  /** Pause or resume; a resume carries on a rollout the pause held (see `restartDone`). */
  | { type: 'setPaused'; ids: string[]; paused: boolean }
  | { type: 'delete'; ids: string[] }
  | { type: 'setDraft'; id: string; text?: string }
  | { type: 'saveYaml'; id: string; text: string }
  | { type: 'create'; cluster: string; text: string }
  /** The live stream: `event` happens now (a repeat counts once more). */
  | { type: 'eventTick'; id: string; event: EventTemplate }
  /** Time passes: the clock moves on by `CLOCK_TICK_MS`. */
  | { type: 'tick' }

/** How far the clock moves with each change. */
const STEP_MS = 1000
/** How long a rollout runs; the clock moves on by as much when it finishes. */
export const ROLLOUT_MS = 3000
/** How far the clock moves with each live event. */
export const LIVE_TICK_MS = 4000
/** How far the clock moves with each `tick`, and how often the shell sends one. */
export const CLOCK_TICK_MS = 30_000
/** How many events a Deployment keeps. */
const MAX_EVENTS = 50

const RESTARTED_AT = 'kubectl.kubernetes.io/restartedAt'
const REVISION = 'deployment.kubernetes.io/revision'

const idOf = (cluster: string, resource: DeploymentResource) =>
  `${cluster}/${resource.metadata.namespace}/${resource.metadata.name}`

export const initialState: DeploymentsState = {
  scope: { clusters: [], namespaces: [] },
  items: Object.fromEntries(
    deployments.map(({ cluster, resource }) => [idOf(cluster, resource), { cluster, resource }]),
  ),
  events: Object.fromEntries(
    deployments.map(({ cluster, resource }) => [
      idOf(cluster, resource),
      eventsFor(resource, cluster),
    ]),
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
 * The status after the spec changes from `old` to `next`, and whether a rollout starts.
 *
 * The replicas that were missing stay missing. A new pod template has nothing updated yet, paused
 * or not; it rolls out unless paused, and a resume carries on what a pause held. Pausing reports
 * DeploymentPaused; a rollout reports ReplicaSetUpdated, or NewReplicaSetAvailable once nothing is
 * left to update.
 */
function statusAfter(
  old: DeploymentResource,
  next: DeploymentResource,
  generation: number,
  at: string,
): { status: DeploymentResource['status']; rolloutStarts: boolean } {
  const status = old.status ?? {}
  const before = old.spec.replicas ?? 1
  const replicas = next.spec.replicas ?? 1
  const follow = (count: number | undefined) =>
    Math.max(0, replicas - Math.max(0, before - (count ?? 0)))
  const templateChanged = !same(old.spec.template, next.spec.template)
  const updated = templateChanged ? 0 : follow(status.updatedReplicas)
  const paused = !!next.spec.paused
  const resumed = !!old.spec.paused && !paused
  const rolloutStarts = !paused && (templateChanged || resumed) && updated < replicas

  const rs = replicaSetName(next)
  const progressing = paused
    ? old.spec.paused
      ? undefined
      : pausedCondition(at)
    : rolloutStarts
      ? progressingCondition(rs, at)
      : resumed || templateChanged
        ? progressed(rs, at)
        : undefined
  const conditions = (status.conditions ?? []).map((condition) =>
    progressing && condition.type === 'Progressing' ? progressing : condition,
  )
  return {
    status: {
      ...status,
      replicas,
      updatedReplicas: updated,
      readyReplicas: follow(status.readyReplicas),
      availableReplicas: follow(status.availableReplicas),
      observedGeneration: generation,
      conditions,
    },
    rolloutStarts,
  }
}

/**
 * `old` replaced by `next` (same kind, name and namespace), the way the API server applies it.
 * The revision goes up when a rollout starts.
 */
function applySpec(old: DeploymentResource, next: DeploymentResource, at: string) {
  const generation = (old.metadata.generation ?? 1) + (same(old.spec, next.spec) ? 0 : 1)
  const { status, rolloutStarts } = statusAfter(old, next, generation, at)
  const annotations = { ...next.metadata.annotations }
  if (rolloutStarts && annotations[REVISION]) {
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
    status,
  }
  return { resource, rolloutStarts }
}

/**
 * Save: what the YAML tab's Save applies to Deployment `id`, and whether a rollout starts, or why
 * it can't. Kind, name and namespace can't change; status and the server's metadata fields are the
 * server's.
 */
export function checkSave(
  state: DeploymentsState,
  id: string,
  text: string,
): Checked<{ resource: DeploymentResource; rolloutStarts: boolean }> {
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
  return applySpec(old, value as unknown as DeploymentResource, step(state))
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
  const at = step(state)
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

/** The clock one step on: the time a change happens. */
const step = (state: DeploymentsState) => shiftTime(state.now, STEP_MS)

/**
 * `items` with `update` applied to each of `ids` that exists (a dirty draft hears about a change),
 * or `undefined` when nothing changed.
 */
function updateItems(
  items: DeploymentsState['items'],
  ids: string[],
  update: (resource: DeploymentResource, id: string) => DeploymentResource,
): DeploymentsState['items'] | undefined {
  const next = { ...items }
  let changed = false
  for (const id of ids) {
    const item = next[id]
    if (!item) continue
    const resource = update(item.resource, id)
    if (resource === item.resource) continue
    changed = true
    next[id] = {
      ...item,
      resource,
      ...(item.draft !== undefined ? { serverChanged: true } : {}),
    }
  }
  return changed ? next : undefined
}

/** `events` with an event for each entry, stamped `at`. */
function withEvents(
  state: DeploymentsState,
  entries: { id: string; event: EventTemplate }[],
  at: string,
): Pick<DeploymentsState, 'events' | 'nextId'> {
  let nextId = state.nextId
  const events = { ...state.events }
  for (const { id, event } of entries) {
    const stamped = { ...event, id: `ev-${nextId++}`, firstSeen: at, lastSeen: at }
    events[id] = [stamped, ...(events[id] ?? [])].slice(0, MAX_EVENTS)
  }
  return { events, nextId }
}

const scalingEvent = (resource: DeploymentResource, message: string): EventTemplate => ({
  type: 'Normal',
  reason: 'ScalingReplicaSet',
  message,
  involvedObject: { kind: 'Deployment', name: resource.metadata.name },
  count: 1,
  source: 'deployment-controller',
})

const scaledEvent = (resource: DeploymentResource, from: number, to: number) =>
  scalingEvent(
    resource,
    `Scaled ${to > from ? 'up' : 'down'} replica set ${replicaSetName(resource)} to ${to} from ${from}`,
  )

/** The resource with `patch` applied to its spec, through `applySpec`. */
const patchSpec = (
  resource: DeploymentResource,
  patch: (spec: DeploymentResource['spec']) => DeploymentResource['spec'],
  at: string,
) => applySpec(resource, { ...resource, spec: patch(resource.spec) }, at)

/** The pod template stamped with a restart at `at`: a new template, so a new ReplicaSet. */
const restartedSpec =
  (at: string) =>
  (spec: DeploymentResource['spec']): DeploymentResource['spec'] => ({
    ...spec,
    template: {
      ...spec.template,
      metadata: {
        ...spec.template.metadata,
        annotations: { ...spec.template.metadata?.annotations, [RESTARTED_AT]: at },
      },
    },
  })

/** The finished rollout: every replica updated, ready and available; unchanged when paused or
 * when there is nothing to finish. */
function finishRollout(resource: DeploymentResource, at: string): DeploymentResource {
  const status = resource.status ?? {}
  const replicas = resource.spec.replicas ?? 1
  if (resource.spec.paused) return resource
  const complete = (status.conditions ?? []).some(
    (c) => c.type === 'Progressing' && c.reason === 'NewReplicaSetAvailable',
  )
  if (complete && status.updatedReplicas === replicas) return resource
  // An Available condition that held keeps the time it became true.
  const available = status.conditions?.find((c) => c.type === 'Available' && c.status === 'True')
  return {
    ...resource,
    metadata: { ...resource.metadata, resourceVersion: bump(resource.metadata.resourceVersion) },
    status: {
      ...status,
      replicas,
      updatedReplicas: replicas,
      readyReplicas: replicas,
      availableReplicas: replicas,
      conditions: [available ?? availableCondition(at), progressed(replicaSetName(resource), at)],
    },
  }
}

/** Which of `ids` would start a rollout on resume: the ones a pause held mid-rollout. */
export function heldRollouts(state: DeploymentsState, ids: string[]): string[] {
  return ids.filter((id) => {
    const resource = state.items[id]?.resource
    const replicas = resource?.spec.replicas ?? 1
    return !!resource?.spec.paused && (resource.status?.updatedReplicas ?? 0) < replicas
  })
}

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
      const at = step(state)
      const items = updateItems(
        state.items,
        [action.id],
        (resource) =>
          patchSpec(resource, (spec) => ({ ...spec, replicas: action.replicas }), at).resource,
      )
      if (!items) return state
      const scaled = items[action.id]!.resource
      return {
        ...state,
        now: at,
        items,
        ...withEvents(
          state,
          [{ id: action.id, event: scaledEvent(scaled, from, action.replicas) }],
          at,
        ),
      }
    }

    case 'restart': {
      // Each restart is a step on the clock, so its stamp (and its pod template) is always new.
      const at = step(state)
      const started: string[] = []
      const items = updateItems(state.items, action.ids, (resource, id) => {
        const { resource: next, rolloutStarts } = patchSpec(resource, restartedSpec(at), at)
        if (rolloutStarts) started.push(id)
        return next
      })
      if (!items) return state
      return {
        ...state,
        now: at,
        items,
        ...withEvents(
          state,
          started.map((id) => {
            const resource = items[id]!.resource
            const message = `Scaled up replica set ${replicaSetName(resource)} to 1`
            return { id, event: scalingEvent(resource, message) }
          }),
          at,
        ),
      }
    }

    case 'restartDone': {
      const at = shiftTime(state.now, ROLLOUT_MS)
      const items = updateItems(state.items, action.ids, (resource) => finishRollout(resource, at))
      return items ? { ...state, now: at, items } : state
    }

    case 'setPaused': {
      const at = step(state)
      const items = updateItems(state.items, action.ids, (resource) => {
        if (!!resource.spec.paused === action.paused) return resource
        const spec = without(resource.spec, ['paused'])
        return patchSpec(resource, () => (action.paused ? { ...spec, paused: true } : spec), at)
          .resource
      })
      return items ? { ...state, now: at, items } : state
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
        now: step(state),
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
      const at = step(state)
      const replicas = resource.spec.replicas ?? 1
      return {
        ...state,
        now: at,
        items: { ...state.items, [id]: { cluster: action.cluster, resource } },
        ...withEvents(
          { ...state, nextId: state.nextId + 1 },
          [{ id, event: scaledEvent(resource, 0, replicas) }],
          at,
        ),
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

    case 'tick':
      return { ...state, now: shiftTime(state.now, CLOCK_TICK_MS) }
  }
}
