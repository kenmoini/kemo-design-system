'use client'
import {
  type DeploymentSummary,
  DeploymentsListPage,
  type ScopeValue,
  scopedNamespaces,
  summarize,
} from '@kemo/ui'
import NextLink from 'next/link'
import {
  createContext,
  type Dispatch,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import { ConsoleFrame } from '@/components/console/console-frame'
import {
  checkCreate,
  checkSave,
  type DeploymentItem,
  type DeploymentsAction,
  type DeploymentsState,
  deploymentsReducer,
  initialState,
} from '@/lib/deployments-reducer'
import { clusters } from '@/lib/mock-deployments'

/** Where the list's scope is kept between visits. */
const SCOPE_KEY = 'kemo.deployments.scope'
/** How long a restart's rollout runs before every pod is replaced. */
const ROLLOUT_MS = 3000
/** How long the mock "API" takes to save or create. */
const SAVE_MS = 300

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** The scope saved by an earlier visit, keeping only the clusters and namespaces that exist. */
function storedScope(): ScopeValue | undefined {
  try {
    const raw = window.localStorage.getItem(SCOPE_KEY)
    if (!raw) return undefined
    const saved = JSON.parse(raw) as Partial<Record<keyof ScopeValue, unknown>>
    const strings = (list: unknown) =>
      Array.isArray(list) ? list.filter((x): x is string => typeof x === 'string') : []
    const chosen = strings(saved.clusters).filter((id) => clusters.some((c) => c.id === id))
    const offered = scopedNamespaces(clusters, chosen)
    return {
      clusters: chosen,
      namespaces: strings(saved.namespaces).filter((ns) => offered.includes(ns)),
    }
  } catch {
    // Storage blocked or the saved value unreadable: start from "All".
    return undefined
  }
}

/** Whether the scope covers `item`; `[]` means "All". */
export function inScope(item: DeploymentItem, scope: ScopeValue): boolean {
  return (
    (scope.clusters.length === 0 || scope.clusters.includes(item.cluster)) &&
    (scope.namespaces.length === 0 || scope.namespaces.includes(item.resource.metadata.namespace))
  )
}

interface DeploymentsDemoValue {
  state: DeploymentsState
  dispatch: Dispatch<DeploymentsAction>
  /** Change the scope and remember it for the next visit. */
  setScope: (scope: ScopeValue) => void
  /** Restart `ids`; their rollouts finish after `ROLLOUT_MS`. */
  restart: (ids: string[]) => void
  /** Pause or resume `ids`; a rollout a pause stopped carries on and finishes on resume. */
  setPaused: (ids: string[], paused: boolean) => void
  /** The YAML tab's Save: rejects with what is wrong, so the tab shows it. */
  saveYaml: (id: string, text: string) => Promise<void>
  /** Create mode's Create: resolves to the new Deployment's id. */
  create: (cluster: string, text: string) => Promise<string>
}

const DeploymentsDemoContext = createContext<DeploymentsDemoValue | null>(null)

export function useDeploymentsDemo(): DeploymentsDemoValue {
  const value = useContext(DeploymentsDemoContext)
  if (!value) throw new Error('The Deployments demo needs DeploymentsDemoShell (app/deployments).')
  return value
}

/**
 * The shell of every `/deployments/*` route: the console frame and the demo's in-memory state,
 * kept while the list, the detail tabs and the create page change underneath, so a YAML draft
 * survives a trip to another tab or page. Also owns the rollout timers and the saved scope.
 */
export function DeploymentsDemoShell({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(deploymentsReducer, initialState)
  // The latest state, for the saves that check it after their mock delay.
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  }, [state])

  // The server render (and the first client render) use "All"; the saved scope follows.
  useEffect(() => {
    const saved = storedScope()
    if (saved) dispatch({ type: 'setScope', scope: saved })
  }, [])

  // Every rollout's finishing timer, cleared if the demo goes away first.
  const timers = useRef(new Set<number>())
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
      pending.clear()
    }
  }, [])
  const finishRollout = (ids: string[]) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      dispatch({ type: 'restartDone', ids })
    }, ROLLOUT_MS)
    timers.current.add(timer)
  }

  const value: DeploymentsDemoValue = {
    state,
    dispatch,
    setScope: (scope) => {
      dispatch({ type: 'setScope', scope })
      try {
        window.localStorage.setItem(SCOPE_KEY, JSON.stringify(scope))
      } catch {
        // Storage blocked: the scope holds for this visit only.
      }
    },
    restart: (ids) => {
      dispatch({ type: 'restart', ids })
      finishRollout(ids)
    },
    setPaused: (ids, paused) => {
      dispatch({ type: 'setPaused', ids, paused })
      if (!paused) finishRollout(ids)
    },
    saveYaml: async (id, text) => {
      await wait(SAVE_MS)
      const checked = checkSave(latest.current, id, text)
      if ('error' in checked) throw new Error(checked.error)
      dispatch({ type: 'saveYaml', id, text })
      // A new pod template rolls out like a restart.
      if (checked.rollout) finishRollout([id])
    },
    create: async (cluster, text) => {
      await wait(SAVE_MS)
      const checked = checkCreate(latest.current, cluster, text)
      if ('error' in checked) throw new Error(checked.error)
      dispatch({ type: 'create', cluster, text })
      return checked.id
    },
  }

  return (
    <DeploymentsDemoContext.Provider value={value}>
      <ConsoleFrame active="deployments">{children}</ConsoleFrame>
    </DeploymentsDemoContext.Provider>
  )
}

/** A row's detail page. */
const detailHref = (row: DeploymentSummary) =>
  `/deployments/${row.cluster}/${row.namespace}/${row.name}`

/** The list (`/deployments`): the Deployments in the scope, every action wired to the state. */
export function DeploymentsDemo() {
  const { state, dispatch, setScope, restart, setPaused } = useDeploymentsDemo()
  const rows = useMemo(
    () =>
      Object.values(state.items)
        .filter((item) => inScope(item, state.scope))
        .map((item) => summarize(item.resource, item.cluster)),
    [state.items, state.scope],
  )

  return (
    <DeploymentsListPage
      scope={state.scope}
      onScopeChange={setScope}
      clusters={clusters}
      rows={rows}
      now={state.now}
      detailHref={detailHref}
      createHref="/deployments/new"
      linkComponent={NextLink}
      onScale={(id, replicas) => dispatch({ type: 'scale', id, replicas })}
      onRestart={restart}
      onSetPaused={setPaused}
      onDelete={(ids) => dispatch({ type: 'delete', ids })}
    />
  )
}
