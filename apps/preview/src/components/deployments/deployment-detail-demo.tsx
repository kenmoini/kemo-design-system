'use client'
import {
  type DeploymentResource,
  DeploymentDetailPage,
  type DeploymentTab,
  defaultSchemaRegistry,
  deploymentSchema,
  schemaFor,
  summarize,
  toYaml,
} from '@kemo/ui'
import NextLink from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { useDeploymentsDemo } from '@/components/deployments/deployments-demo'
import { type DeploymentItem, LIVE_TICK_MS } from '@/lib/deployments-reducer'
import { eventRotation, relatedFor } from '@/lib/mock-deployments'

/** The YAML tab's schema: the registry's entry for the kind (the bundled one). */
const schema = schemaFor(defaultSchemaRegistry, 'apps/v1', 'Deployment') ?? deploymentSchema

const EMPTY: never[] = []

/** The live events table `ResourceEventsTab` draws: the pointer or focus on it pauses its rows. */
const EVENTS_REGION = '[role="region"][aria-label="Events"]'

const noSubscription = () => () => {}
/** False on the server and while hydrating, true after: the browser's state is only known then. */
const useHydrated = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  )

export interface DeploymentDetailDemoProps {
  cluster: string
  namespace: string
  name: string
  tab: DeploymentTab
}

/**
 * One Deployment's page (`/deployments/{cluster}/{namespace}/{name}[/yaml|/events]`), wired to the
 * layout's state: the YAML draft lives there, so it outlasts the tab; the events tick while the
 * Events tab shows.
 *
 * A name the state doesn't have is a 404, decided here in the browser: the server knows only the
 * seeded Deployments, not the ones created in this visit. Next renders a route it didn't prerender
 * once, in full, and keeps the result for every later request (the page and the payload a client
 * navigation fetches), so a 404 there would also answer the navigation to a Deployment just
 * created. The server render of an unknown name is therefore empty, and the browser shows the 404
 * page once it has hydrated.
 */
export function DeploymentDetailDemo(props: DeploymentDetailDemoProps) {
  const { state } = useDeploymentsDemo()
  const hydrated = useHydrated()
  const current = state.items[`${props.cluster}/${props.namespace}/${props.name}`]

  // After a delete the page keeps its last copy until the router has left for the list.
  const [last, setLast] = useState<DeploymentItem | undefined>(current)
  if (current && current !== last) setLast(current)
  const item = current ?? last
  if (!item) {
    if (hydrated) notFound()
    return null
  }

  return <DeploymentDetail {...props} item={item} deleted={current === undefined} />
}

function DeploymentDetail({
  cluster,
  namespace,
  name,
  tab,
  item,
  deleted,
}: DeploymentDetailDemoProps & { item: DeploymentItem; deleted: boolean }) {
  const { state, dispatch, restart, setPaused, saveYaml, setReaderPaused, swapShown } =
    useDeploymentsDemo()
  const router = useRouter()
  const id = `${cluster}/${namespace}/${name}`
  const { resource } = item
  const yamlText = useMemo(() => toYaml(resource), [resource])
  const summary = useMemo(() => summarize(resource, cluster), [resource, cluster])
  const related = useMemo(() => relatedFor(resource, cluster), [resource, cluster])
  const base = `/deployments/${id}`
  const tabHref = useCallback(
    (next: DeploymentTab) => (next === 'overview' ? base : `${base}/${next}`),
    [base],
  )

  // While a reader is on the live events their rows hold still; so do the stream and the clock,
  // or the ages of the rows held would change under them.
  const reading = useReaderOnEvents(tab === 'events')
  useLiveEvents(id, resource, tab === 'events' && !deleted && !reading)
  useEffect(() => {
    setReaderPaused(reading)
    return () => setReaderPaused(false)
  }, [reading, setReaderPaused])

  // Next remounts the page when the tab changes, which drops focus on the body: a reader who
  // switched tabs (or pressed Edit YAML) lands on the tab that is now current instead.
  useEffect(() => {
    const previous = swapShown({ id, tab })
    const focus = document.activeElement
    if (previous?.id !== id || previous.tab === tab || (focus && focus !== document.body)) return
    document
      .querySelector<HTMLElement>('main [role="tab"][aria-selected="true"]')
      ?.focus({ preventScroll: true })
  }, [id, tab, swapShown])

  return (
    <DeploymentDetailPage
      deployment={resource}
      cluster={cluster}
      summary={summary}
      related={related}
      events={state.events[id] ?? EMPTY}
      liveEvents
      tab={tab}
      tabHref={tabHref}
      listHref="/deployments"
      linkComponent={NextLink}
      now={state.now}
      schema={schema}
      yamlText={yamlText}
      draft={item.draft}
      onDraftChange={(text) => dispatch({ type: 'setDraft', id, text })}
      onSaveYaml={(text) => saveYaml(id, text)}
      serverChanged={item.serverChanged}
      onScale={(target, replicas) => dispatch({ type: 'scale', id: target, replicas })}
      onRestart={restart}
      onSetPaused={setPaused}
      onDelete={(ids) => {
        dispatch({ type: 'delete', ids })
        router.push('/deployments')
      }}
    />
  )
}

/**
 * Whether the pointer or focus is on the live events table while `active`. `DeploymentDetailPage`
 * doesn't pass on the table's own pause, so the page watches for it: pointer and focus moves
 * into and out of the table's region.
 */
function useReaderOnEvents(active: boolean): boolean {
  const [pointer, setPointer] = useState(false)
  const [focus, setFocus] = useState(false)
  useEffect(() => {
    if (!active) return
    const inRegion = (target: EventTarget | null) =>
      target instanceof Element && target.closest(EVENTS_REGION) !== null
    const over = (event: PointerEvent) => setPointer(inRegion(event.target))
    // Leaving the window: no element is entered.
    const out = (event: PointerEvent) => {
      if (event.relatedTarget === null) setPointer(false)
    }
    const focusIn = (event: FocusEvent) => setFocus(inRegion(event.target))
    const focusOut = (event: FocusEvent) => {
      if (!inRegion(event.relatedTarget)) setFocus(false)
    }
    document.addEventListener('pointerover', over)
    document.addEventListener('pointerout', out)
    document.addEventListener('focusin', focusIn)
    document.addEventListener('focusout', focusOut)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('pointerout', out)
      document.removeEventListener('focusin', focusIn)
      document.removeEventListener('focusout', focusOut)
    }
  }, [active])
  return active && (pointer || focus)
}

/**
 * The mock event stream: while `live`, every `LIVE_TICK_MS` the next event of the Deployment's
 * rotation happens (a repeat counts once more), and the demo clock moves on with it.
 */
function useLiveEvents(id: string, resource: DeploymentResource, live: boolean) {
  const { dispatch } = useDeploymentsDemo()
  // The rotation names the current pods, so it reads the latest resource at each tick.
  const latest = useRef(resource)
  useEffect(() => {
    latest.current = resource
  }, [resource])
  const ticks = useRef(0)

  useEffect(() => {
    if (!live) return
    const timer = window.setInterval(() => {
      const rotation = eventRotation(latest.current)
      const event = rotation[ticks.current++ % rotation.length]
      if (event) dispatch({ type: 'eventTick', id, event })
    }, LIVE_TICK_MS)
    return () => window.clearInterval(timer)
  }, [id, live, dispatch])
}
