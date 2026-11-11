'use client'
import {
  AccessAudit,
  AccessGroupsTab,
  AccessOAuthAppsTab,
  AccessOidc,
  AccessOverview,
  AccessPage,
  AccessPermissionsTab,
  AccessRolesTab,
  AccessServiceAccountsTab,
  AccessSettings,
  type AccessTabId,
  accessTabs,
  AccessUsersTab,
  type AuditEvent,
  Button,
  EntityDialog,
  type EventStreamEvent,
  type OidcProviderValues,
  Text,
} from '@kemo/ui'
import NextLink from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'
import {
  createContext,
  type Dispatch,
  type FocusEvent,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react'
import { Box, HStack, Stack } from '../../../styled-system/jsx'
import { ConsoleFrame } from '@/components/console/console-frame'
import {
  type AccessAction,
  type AccessState,
  accessReducer,
  initialAccessState,
  nextProviderId,
  syncableProviderIds,
  withGroupMembers,
  withPermissionRoles,
  withRoleMembers,
} from '@/lib/access-reducer'
import {
  auditEventRotation,
  auditEvents,
  overviewStats,
  resources,
  scopeOptions,
  signIns,
  toOption,
} from '@/lib/mock-access'
import { useLiveEvents } from '@/lib/use-live-events'

/** How long the mock "network" calls take (saves, test event, test email). */
const DELAY_MS = 500
/** How long a provider sync runs before it finishes. */
const SYNC_MS = 2000

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

/** "HH:MM:SS" for `seconds` after midnight. */
function clock(seconds: number): string {
  const part = (n: number) => String(n).padStart(2, '0')
  return `${part(Math.floor(seconds / 3600) % 24)}:${part(Math.floor(seconds / 60) % 60)}:${part(seconds % 60)}`
}
/** The last delivery the demo starts with: 14:02:11, when the newest audit event arrived. */
const FIRST_DELIVERY = 14 * 3600 + 2 * 60 + 11

const tabHref = (tab: AccessTabId) => (tab === 'overview' ? '/access' : `/access/${tab}`)

/** How many of the newest calls the Overview shows (the Audit tab shows the whole stream). */
const OVERVIEW_CALLS = 6

/**
 * An audit event as an Overview stream item: one line ("POST /api/v1/deployments · priya.shah ·
 * 201", the actor without the email domain), toned the way the Audit tab tones it.
 */
function toApiCall(event: AuditEvent): EventStreamEvent {
  const tone =
    event.status >= 500
      ? 'critical'
      : event.status >= 400
        ? 'warning'
        : event.kind === 'admin'
          ? 'good'
          : 'info'
  return {
    id: event.id,
    time: event.time,
    tone,
    text: `${event.method} ${event.path} · ${event.actor.split('@')[0]} · ${event.status}`,
  }
}

interface AccessDemoContextValue {
  state: AccessState
  dispatch: Dispatch<AccessAction>
  /** The API audit stream, newest first; it ticks while the Overview or Audit tab shows. */
  stream: AuditEvent[]
  /** Whether the stream is ticking (not paused by a reader). */
  live: boolean
  /** Pause the stream while the pointer or focus is inside a tab that shows it (WCAG 2.2.2). */
  setReaderPaused: (paused: boolean) => void
  lastDeliveryAt: string
  sendTestEvent: () => Promise<void>
  /** Start a sync on `ids` (or every provider) and finish it after `SYNC_MS`. */
  syncProviders: (ids?: string[]) => void
  /** "Add provider": create it and finish its first sync. */
  createProvider: (values: OidcProviderValues) => void
  /** Show the token or secret the last rotation issued. */
  reveal: () => void
}

const AccessDemoContext = createContext<AccessDemoContextValue | null>(null)

function useAccessDemo(): AccessDemoContextValue {
  const value = useContext(AccessDemoContext)
  if (!value) throw new Error('AccessDemo needs the AccessDemoShell around it (app/access/layout).')
  return value
}

/**
 * The Access page's shell for every `/access/*` route: the console frame, the tab strip (the URL's
 * tab is current) and the demo's in-memory state, kept while the tabs change underneath. Also
 * owns the timers (syncs), the live audit stream and the dialog that shows a rotated secret.
 */
export function AccessDemoShell({ children }: Readonly<{ children: ReactNode }>) {
  const segment = useSelectedLayoutSegment()
  const tab = accessTabs.find((t) => t.id === segment)?.id ?? 'overview'
  const [state, dispatch] = useReducer(accessReducer, initialAccessState)

  // The stream ticks on the two tabs that show it, unless a reader is inside them. A reader's pause
  // ends with the tab (adjusted during render rather than in an effect).
  const [readerPaused, setReaderPaused] = useState(false)
  const [shownTab, setShownTab] = useState(tab)
  if (tab !== shownTab) {
    setShownTab(tab)
    setReaderPaused(false)
  }
  const streaming = tab === 'overview' || tab === 'audit'
  const stream = useLiveEvents(auditEvents, {
    rotation: auditEventRotation,
    max: 20,
    paused: !streaming || readerPaused,
  })

  // Every sync's finishing timer, cleared if the demo goes away first.
  const timers = useRef(new Set<number>())
  useEffect(() => {
    const pending = timers.current
    return () => {
      for (const timer of pending) window.clearTimeout(timer)
    }
  }, [])
  const finishSync = (ids: string[]) => {
    const timer = window.setTimeout(() => {
      timers.current.delete(timer)
      dispatch({ type: 'providerSyncDone', ids })
    }, SYNC_MS)
    timers.current.add(timer)
  }

  // "Send test event": every third call fails, the others move the last delivery on.
  const testCalls = useRef(0)
  const [deliveries, setDeliveries] = useState(0)
  const sendTestEvent = async () => {
    testCalls.current += 1
    const call = testCalls.current
    await wait(DELAY_MS)
    if (call % 3 === 0) throw new Error('Could not reach splunk.acme.dev:8088')
    setDeliveries((count) => count + 1)
  }

  const [revealOpen, setRevealOpen] = useState(false)
  const revealed = state.revealed

  const value: AccessDemoContextValue = {
    state,
    dispatch,
    stream,
    live: !readerPaused,
    setReaderPaused,
    lastDeliveryAt: clock(FIRST_DELIVERY + deliveries * 9),
    sendTestEvent,
    syncProviders: (ids) => {
      const started = syncableProviderIds(state.providers, ids)
      if (started.length === 0) return
      dispatch({ type: 'providerSyncStart', ids: started })
      finishSync(started)
    },
    createProvider: (values) => {
      const id = nextProviderId(state)
      dispatch({ type: 'providerCreate', values })
      finishSync([id])
    },
    reveal: () => setRevealOpen(true),
  }

  return (
    <AccessDemoContext.Provider value={value}>
      <ConsoleFrame active="access">
        <AccessPage activeTab={tab} tabHref={tabHref} linkComponent={NextLink}>
          {children}
        </AccessPage>
      </ConsoleFrame>
      <EntityDialog
        open={revealOpen && revealed !== null}
        onOpenChange={setRevealOpen}
        size="sm"
        title={revealed?.kind === 'secret' ? 'New client secret' : 'New token'}
        description={
          revealed
            ? `${revealed.name}: copy it now. It won't be shown again, and the old one has stopped working.`
            : undefined
        }
      >
        <Stack gap="4">
          <Text
            fontFamily="mono"
            textStyle="sm"
            wordBreak="break-all"
            bg="gray.subtle.bg"
            borderRadius="l2"
            px="3"
            py="2"
          >
            {revealed?.value}
          </Text>
          <HStack justify="flex-end">
            <Button variant="solid" onClick={() => setRevealOpen(false)}>
              Close
            </Button>
          </HStack>
        </Stack>
      </EntityDialog>
    </AccessDemoContext.Provider>
  )
}

/** Pauses the live stream while the pointer or keyboard focus is inside its children. */
function LiveRegionPause({ children }: Readonly<{ children: ReactNode }>) {
  const { setReaderPaused } = useAccessDemo()
  return (
    <Box
      onPointerEnter={() => setReaderPaused(true)}
      onPointerLeave={() => setReaderPaused(false)}
      onFocus={() => setReaderPaused(true)}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        // Focus within: only a move out of the tab resumes the stream.
        const next = event.relatedTarget
        if (!(next instanceof Node && event.currentTarget.contains(next))) setReaderPaused(false)
      }}
    >
      {children}
    </Box>
  )
}

/** One tab's content, wired to the shell's state. The `[[...tab]]` page renders it. */
export function AccessDemo({ tab }: Readonly<{ tab: AccessTabId }>) {
  const demo = useAccessDemo()
  const { state, dispatch } = demo

  const roleOptions = useMemo(() => state.roles.map(toOption), [state.roles])
  const groupOptions = useMemo(() => state.groups.map(toOption), [state.groups])
  const groups = useMemo(
    () => withGroupMembers(state.groups, state.users),
    [state.groups, state.users],
  )
  const roles = useMemo(() => withRoleMembers(state.roles, state.users), [state.roles, state.users])
  const permissions = useMemo(
    () => withPermissionRoles(state.permissions, state.roles),
    [state.permissions, state.roles],
  )
  const stats = useMemo(() => {
    const internalUsers = state.users.filter((user) => user.source === 'internal').length
    return overviewStats({
      internalUsers,
      groups: state.groups.length,
      oidcUsers: state.users.length - internalUsers,
    })
  }, [state.users, state.groups])
  const apiCalls = useMemo(() => demo.stream.slice(0, OVERVIEW_CALLS).map(toApiCall), [demo.stream])

  switch (tab) {
    case 'overview':
      return (
        <LiveRegionPause>
          <AccessOverview stats={stats} signIns={signIns} apiCalls={apiCalls} live={demo.live} />
        </LiveRegionPause>
      )
    case 'users':
      return (
        <AccessUsersTab
          rows={state.users}
          roles={roleOptions}
          groups={groupOptions}
          onCreate={(values) => dispatch({ type: 'create', entity: 'users', values })}
          onUpdate={(id, values) => dispatch({ type: 'update', entity: 'users', id, values })}
          onSetStatus={(ids, status) =>
            dispatch({ type: 'setStatus', entity: 'users', ids, status })
          }
          onDelete={(ids) => dispatch({ type: 'delete', entity: 'users', ids })}
          onAddToGroup={(ids, groupId) => dispatch({ type: 'addToGroup', ids, groupId })}
          onAssignRole={(ids, roleId) =>
            dispatch({ type: 'assignRole', entity: 'users', ids, roleId })
          }
        />
      )
    case 'groups':
      return (
        <AccessGroupsTab
          rows={groups}
          roles={roleOptions}
          onCreate={(values) => dispatch({ type: 'create', entity: 'groups', values })}
          onUpdate={(id, values) => dispatch({ type: 'update', entity: 'groups', id, values })}
          onSetStatus={(ids, status) =>
            dispatch({ type: 'setStatus', entity: 'groups', ids, status })
          }
          onDelete={(ids) => dispatch({ type: 'delete', entity: 'groups', ids })}
          onAssignRole={(ids, roleId) =>
            dispatch({ type: 'assignRole', entity: 'groups', ids, roleId })
          }
        />
      )
    case 'roles':
      return (
        <AccessRolesTab
          rows={roles}
          permissions={state.permissions}
          onCreate={(values) => dispatch({ type: 'create', entity: 'roles', values })}
          onUpdate={(id, values) => dispatch({ type: 'update', entity: 'roles', id, values })}
          onSetStatus={(ids, status) =>
            dispatch({ type: 'setStatus', entity: 'roles', ids, status })
          }
          onDelete={(ids) => dispatch({ type: 'delete', entity: 'roles', ids })}
        />
      )
    case 'permissions':
      return (
        <AccessPermissionsTab
          rows={permissions}
          resources={resources}
          onCreate={(values) => dispatch({ type: 'create', entity: 'permissions', values })}
          onUpdate={(id, values) => dispatch({ type: 'update', entity: 'permissions', id, values })}
          onDelete={(ids) => dispatch({ type: 'delete', entity: 'permissions', ids })}
        />
      )
    case 'audit':
      return (
        <LiveRegionPause>
          <AccessAudit
            forwarding={state.forwarding}
            onSaveForwarding={async (values) => {
              await wait(DELAY_MS)
              dispatch({ type: 'saveForwarding', values })
            }}
            onSendTest={demo.sendTestEvent}
            lastDeliveryAt={demo.lastDeliveryAt}
            events={demo.stream}
            live={demo.live}
          />
        </LiveRegionPause>
      )
    case 'oidc':
      return (
        <AccessOidc
          providers={state.providers}
          onCreate={demo.createProvider}
          onUpdate={(id, values) => dispatch({ type: 'providerUpdate', id, values })}
          onSyncNow={(id) => demo.syncProviders([id])}
          onSyncAll={() => demo.syncProviders()}
          onSetEnabled={(id, enabled) => dispatch({ type: 'providerSetEnabled', id, enabled })}
          onRemove={(id) => dispatch({ type: 'providerRemove', id })}
        />
      )
    case 'service-accounts':
      return (
        <AccessServiceAccountsTab
          rows={state.serviceAccounts}
          roles={roleOptions}
          onCreate={(values) => dispatch({ type: 'create', entity: 'serviceAccounts', values })}
          onUpdate={(id, values) =>
            dispatch({ type: 'update', entity: 'serviceAccounts', id, values })
          }
          onSetStatus={(ids, status) =>
            dispatch({ type: 'setStatus', entity: 'serviceAccounts', ids, status })
          }
          onDelete={(ids) => dispatch({ type: 'delete', entity: 'serviceAccounts', ids })}
          onRotateToken={(id) => {
            dispatch({ type: 'rotateToken', id })
            demo.reveal()
          }}
        />
      )
    case 'oauth-apps':
      return (
        <AccessOAuthAppsTab
          rows={state.oauthApps}
          scopes={scopeOptions}
          onCreate={(values) => dispatch({ type: 'create', entity: 'oauthApps', values })}
          onUpdate={(id, values) => dispatch({ type: 'update', entity: 'oauthApps', id, values })}
          onSetStatus={(ids, status) =>
            dispatch({ type: 'setStatus', entity: 'oauthApps', ids, status })
          }
          onDelete={(ids) => dispatch({ type: 'delete', entity: 'oauthApps', ids })}
          onRotateSecret={(id) => {
            dispatch({ type: 'rotateSecret', id })
            demo.reveal()
          }}
        />
      )
    case 'settings':
      return (
        <AccessSettings
          values={state.settings}
          onSave={async (values) => {
            await wait(DELAY_MS)
            dispatch({ type: 'saveSettings', values })
          }}
          onSendTestEmail={() => wait(DELAY_MS)}
        />
      )
  }
}
