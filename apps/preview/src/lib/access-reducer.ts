import type {
  AccessGroup,
  AccessPermission,
  AccessRole,
  AccessSettingsValues,
  AccessUser,
  AuditForwardingValues,
  EntityStatus,
  GroupValues,
  OAuthApp,
  OAuthAppValues,
  OidcProvider,
  OidcProviderEditValues,
  OidcProviderValues,
  PermissionValues,
  RoleValues,
  ServiceAccount,
  ServiceAccountValues,
  UserValues,
} from '@kemo/ui'
import {
  DEMO_NOW,
  demoTime,
  forwardingDefaults,
  groups,
  oauthApps,
  oidcProviders,
  permissions,
  providerSecrets,
  roles,
  serviceAccounts,
  settingsDefaults,
  users,
} from './mock-access'

// The Access demo's in-memory state. Every change goes through `accessReducer`, so it stays pure
// and deterministic: new ids and secrets come from `nextId`, and times from `DEMO_NOW`.

/** A token or client secret a rotation just issued; the demo shows it once in a dialog. */
export interface RevealedSecret {
  kind: 'token' | 'secret'
  /** The service account's or app's name. */
  name: string
  value: string
}

export interface AccessState {
  users: AccessUser[]
  groups: AccessGroup[]
  roles: AccessRole[]
  permissions: AccessPermission[]
  serviceAccounts: ServiceAccount[]
  oauthApps: OAuthApp[]
  providers: OidcProvider[]
  forwarding: AuditForwardingValues
  settings: AccessSettingsValues
  /** Token lifetimes in days by service account id: form-only, so `rotateToken` reads them here. */
  tokenLifetimes: Record<string, number>
  /** Client secrets by provider id; a `rejected` one makes every sync end in an error. */
  providerSecrets: Record<string, { value: string; rejected: boolean }>
  revealed: RevealedSecret | null
  /** The next new row's number (ids, client ids and secrets derive from it). */
  nextId: number
}

export const initialAccessState: AccessState = {
  users,
  groups,
  roles,
  permissions,
  serviceAccounts,
  oauthApps,
  providers: oidcProviders,
  forwarding: forwardingDefaults,
  settings: settingsDefaults,
  tokenLifetimes: {},
  providerSecrets,
  revealed: null,
  nextId: 1000,
}

type Values = {
  users: UserValues
  groups: GroupValues
  roles: RoleValues
  permissions: PermissionValues
  serviceAccounts: ServiceAccountValues
  oauthApps: OAuthAppValues
}

export type EntityKind = keyof Values

/** The entities with an Active/Disabled status. */
export type StatusEntity = Exclude<EntityKind, 'permissions'>

type CreateAction = {
  [K in EntityKind]: { type: 'create'; entity: K; values: Values[K] }
}[EntityKind]
type UpdateAction = {
  [K in EntityKind]: { type: 'update'; entity: K; id: string; values: Values[K] }
}[EntityKind]

export type AccessAction =
  | CreateAction
  | UpdateAction
  | { type: 'setStatus'; entity: StatusEntity; ids: string[]; status: EntityStatus }
  | { type: 'delete'; entity: EntityKind; ids: string[] }
  | { type: 'addToGroup'; ids: string[]; groupId: string }
  | { type: 'assignRole'; entity: 'users' | 'groups'; ids: string[]; roleId: string }
  | { type: 'rotateToken'; id: string }
  | { type: 'rotateSecret'; id: string }
  | { type: 'providerCreate'; values: OidcProviderValues }
  | { type: 'providerUpdate'; id: string; values: OidcProviderEditValues }
  | { type: 'providerRemove'; id: string }
  | { type: 'providerSetEnabled'; id: string; enabled: boolean }
  | { type: 'providerSyncStart'; ids: string[] }
  | { type: 'providerSyncDone'; ids: string[] }
  | { type: 'saveForwarding'; values: AuditForwardingValues }
  | { type: 'saveSettings'; values: AccessSettingsValues }

const ALPHABET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** A fixed-length random-looking string from a seed (mulberry32), the same on every run. */
export function demoSecret(seed: number, length = 32): string {
  let state = seed * 2654435761
  let out = ''
  for (let i = 0; i < length; i++) {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    const value = (t ^ (t >>> 14)) >>> 0
    out += ALPHABET[value % ALPHABET.length]
  }
  return out
}

const without = <T>(list: T[], remove: Set<T>) => list.filter((item) => !remove.has(item))
const withItem = <T>(list: T[], item: T) => (list.includes(item) ? list : [...list, item])

/** Every row whose id is in `ids` through `change`; the rest as they are. */
function patch<T extends { id: string }>(rows: T[], ids: string[], change: (row: T) => T): T[] {
  const set = new Set(ids)
  return rows.map((row) => (set.has(row.id) ? change(row) : row))
}

/** A user's fields from the form; `sendInvite` is form-only (the demo sends no email). */
function userFields({ name, email, role, source, groups }: UserValues) {
  return { name, email, role, source, groups }
}

function create(state: AccessState, action: CreateAction): AccessState {
  const n = state.nextId
  const next = { ...state, nextId: n + 1 }
  switch (action.entity) {
    case 'users': {
      const user: AccessUser = {
        id: `u-${n}`,
        ...userFields(action.values),
        status: 'active',
        createdAt: DEMO_NOW,
      }
      return { ...next, users: [...state.users, user] }
    }
    case 'groups': {
      const group: AccessGroup = {
        id: `g-${n}`,
        ...action.values,
        members: 0,
        source: 'internal',
        status: 'active',
      }
      return { ...next, groups: [...state.groups, group] }
    }
    case 'roles': {
      const role: AccessRole = {
        id: `r-${n}`,
        ...action.values,
        members: 0,
        builtIn: false,
        status: 'active',
      }
      return { ...next, roles: [...state.roles, role] }
    }
    case 'permissions': {
      const permission: AccessPermission = { id: `perm-${n}`, ...action.values, roles: 0 }
      return { ...next, permissions: [...state.permissions, permission] }
    }
    case 'serviceAccounts': {
      const { tokenLifetimeDays, ...values } = action.values
      const account: ServiceAccount = {
        id: `sa-${n}`,
        ...values,
        tokenExpiresAt: demoTime({ days: tokenLifetimeDays }),
        status: 'active',
      }
      return {
        ...next,
        serviceAccounts: [...state.serviceAccounts, account],
        tokenLifetimes: { ...state.tokenLifetimes, [account.id]: tokenLifetimeDays },
      }
    }
    case 'oauthApps': {
      const app: OAuthApp = {
        id: `app-${n}`,
        ...action.values,
        clientId: `kemo_${demoSecret(n, 10).toLowerCase()}`,
        owner: 'Ken Moini',
        status: 'active',
        createdAt: DEMO_NOW,
      }
      return { ...next, oauthApps: [...state.oauthApps, app] }
    }
  }
}

function update(state: AccessState, action: UpdateAction): AccessState {
  const ids = [action.id]
  switch (action.entity) {
    case 'users': {
      const values = userFields(action.values)
      return { ...state, users: patch(state.users, ids, (user) => ({ ...user, ...values })) }
    }
    case 'groups':
      return { ...state, groups: patch(state.groups, ids, (row) => ({ ...row, ...action.values })) }
    case 'roles':
      return { ...state, roles: patch(state.roles, ids, (row) => ({ ...row, ...action.values })) }
    case 'permissions':
      return {
        ...state,
        permissions: patch(state.permissions, ids, (row) => ({ ...row, ...action.values })),
      }
    case 'serviceAccounts': {
      // The lifetime applies from the next rotation; the current token keeps its expiry.
      const { tokenLifetimeDays, ...values } = action.values
      return {
        ...state,
        serviceAccounts: patch(state.serviceAccounts, ids, (row) => ({ ...row, ...values })),
        tokenLifetimes: { ...state.tokenLifetimes, [action.id]: tokenLifetimeDays },
      }
    }
    case 'oauthApps':
      return {
        ...state,
        oauthApps: patch(state.oauthApps, ids, (row) => ({ ...row, ...action.values })),
      }
  }
}

function remove(state: AccessState, entity: EntityKind, ids: string[]): AccessState {
  const gone = new Set(ids)
  const keep = <T extends { id: string }>(rows: T[]) => rows.filter((row) => !gone.has(row.id))
  switch (entity) {
    case 'users':
      return { ...state, users: keep(state.users) }
    case 'groups':
      // Members leave the deleted groups.
      return {
        ...state,
        groups: keep(state.groups),
        users: state.users.map((user) => ({ ...user, groups: without(user.groups, gone) })),
      }
    case 'roles': {
      // Built-in roles are never deleted (the tab skips them), so Viewer is always there: the
      // deleted roles' users and service accounts fall back to it, and groups drop them.
      const fallback = (role: string) => (gone.has(role) ? 'r-viewer' : role)
      return {
        ...state,
        roles: keep(state.roles),
        users: state.users.map((user) => ({ ...user, role: fallback(user.role) })),
        serviceAccounts: state.serviceAccounts.map((account) => ({
          ...account,
          role: fallback(account.role),
        })),
        groups: state.groups.map((group) => ({ ...group, roles: without(group.roles, gone) })),
      }
    }
    case 'permissions':
      return {
        ...state,
        permissions: keep(state.permissions),
        roles: state.roles.map((role) => ({
          ...role,
          permissions: without(role.permissions, gone),
        })),
      }
    case 'serviceAccounts':
      return { ...state, serviceAccounts: keep(state.serviceAccounts) }
    case 'oauthApps':
      return { ...state, oauthApps: keep(state.oauthApps) }
  }
}

export function accessReducer(state: AccessState, action: AccessAction): AccessState {
  switch (action.type) {
    case 'create':
      return create(state, action)
    case 'update':
      return update(state, action)
    case 'setStatus': {
      const set = <T extends { id: string; status: EntityStatus }>(rows: T[]) =>
        patch(rows, action.ids, (row) => ({ ...row, status: action.status }))
      switch (action.entity) {
        case 'users':
          return { ...state, users: set(state.users) }
        case 'groups':
          return { ...state, groups: set(state.groups) }
        case 'roles':
          // Built-in roles stay active (the tab skips them; this keeps the rule here too).
          return {
            ...state,
            roles: patch(state.roles, action.ids, (role) =>
              role.builtIn ? role : { ...role, status: action.status },
            ),
          }
        case 'serviceAccounts':
          return { ...state, serviceAccounts: set(state.serviceAccounts) }
        case 'oauthApps':
          return { ...state, oauthApps: set(state.oauthApps) }
      }
      return state
    }
    case 'delete':
      return remove(state, action.entity, action.ids)
    case 'addToGroup':
      return {
        ...state,
        users: patch(state.users, action.ids, (user) => ({
          ...user,
          groups: withItem(user.groups, action.groupId),
        })),
      }
    case 'assignRole':
      return action.entity === 'users'
        ? {
            ...state,
            users: patch(state.users, action.ids, (user) => ({ ...user, role: action.roleId })),
          }
        : {
            ...state,
            groups: patch(state.groups, action.ids, (group) => ({
              ...group,
              roles: withItem(group.roles, action.roleId),
            })),
          }
    case 'rotateToken': {
      const account = state.serviceAccounts.find((row) => row.id === action.id)
      if (!account) return state
      const days = state.tokenLifetimes[account.id] ?? 90
      const n = state.nextId
      return {
        ...state,
        nextId: n + 1,
        serviceAccounts: patch(state.serviceAccounts, [account.id], (row) => ({
          ...row,
          tokenExpiresAt: demoTime({ days }),
        })),
        revealed: { kind: 'token', name: account.name, value: `kemo_sat_${demoSecret(n)}` },
      }
    }
    case 'rotateSecret': {
      const app = state.oauthApps.find((row) => row.id === action.id)
      if (!app) return state
      const n = state.nextId
      return {
        ...state,
        nextId: n + 1,
        revealed: { kind: 'secret', name: app.name, value: `kemo_cs_${demoSecret(n, 40)}` },
      }
    }
    case 'providerCreate': {
      const n = state.nextId
      const { clientSecret, ...values } = action.values
      // A new provider starts its first sync at once.
      const provider: OidcProvider = {
        id: nextProviderId(state),
        ...values,
        users: 0,
        groupsMapped: 0,
        sync: { state: 'syncing', progress: 0 },
        enabled: true,
      }
      return {
        ...state,
        nextId: n + 1,
        providers: [...state.providers, provider],
        providerSecrets: {
          ...state.providerSecrets,
          [provider.id]: { value: clientSecret, rejected: false },
        },
      }
    }
    case 'providerUpdate': {
      // No `clientSecret` keeps the stored one (and whether it is rejected); a new one replaces it.
      const { clientSecret, ...values } = action.values
      return {
        ...state,
        providers: patch(state.providers, [action.id], (provider) => ({ ...provider, ...values })),
        providerSecrets:
          clientSecret === undefined
            ? state.providerSecrets
            : { ...state.providerSecrets, [action.id]: { value: clientSecret, rejected: false } },
      }
    }
    case 'providerRemove':
      return { ...state, providers: state.providers.filter((row) => row.id !== action.id) }
    case 'providerSetEnabled':
      // Disabling stops a running sync (`disabled`, which its finishing timer skips); enabling a
      // provider whose sync was stopped runs it again (the demo schedules its end).
      return {
        ...state,
        providers: patch(state.providers, [action.id], (provider) => {
          if (!action.enabled) {
            const stopped = provider.sync.state === 'syncing'
            return {
              ...provider,
              enabled: false,
              sync: stopped ? { state: 'disabled' } : provider.sync,
            }
          }
          const resumed = provider.sync.state === 'disabled'
          return {
            ...provider,
            enabled: true,
            sync: resumed ? { state: 'syncing', progress: 0 } : provider.sync,
          }
        }),
      }
    case 'providerSyncStart':
      return {
        ...state,
        providers: patch(state.providers, action.ids, (provider) =>
          provider.enabled && provider.sync.state !== 'syncing'
            ? { ...provider, sync: { state: 'syncing', progress: 0 } }
            : provider,
        ),
      }
    case 'providerSyncDone':
      return {
        ...state,
        providers: patch(state.providers, action.ids, (provider) => {
          // A provider disabled mid-sync (or removed) is left as it is.
          if (!provider.enabled || provider.sync.state !== 'syncing') return provider
          return state.providerSecrets[provider.id]?.rejected
            ? { ...provider, sync: { state: 'error', message: 'invalid client secret' } }
            : { ...provider, sync: { state: 'synced' }, lastSyncAt: DEMO_NOW }
        }),
      }
    case 'saveForwarding':
      return { ...state, forwarding: action.values }
    case 'saveSettings':
      return { ...state, settings: action.values }
  }
}

/** The providers a sync would start on (of `ids`, or all): enabled and not already syncing. */
export function syncableProviderIds(providers: OidcProvider[], ids?: string[]): string[] {
  const wanted = ids ? new Set(ids) : null
  return providers
    .filter((provider) => wanted?.has(provider.id) ?? true)
    .filter((provider) => provider.enabled && provider.sync.state !== 'syncing')
    .map((provider) => provider.id)
}

/** The providers seeded part-way through a sync (Google Workspace); the demo finishes them. */
export const seededSyncIds = initialAccessState.providers
  .filter((provider) => provider.sync.state === 'syncing')
  .map((provider) => provider.id)

/** The id `providerCreate` gives the next provider, so the demo can finish its first sync. */
export function nextProviderId(state: AccessState): string {
  return `oidc-${state.nextId}`
}

/** Counts by id over a list of id lists (members per group, roles per permission). */
function countIds(lists: string[][]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const list of lists) for (const id of list) counts.set(id, (counts.get(id) ?? 0) + 1)
  return counts
}

/** Groups with `members` counted from the users who belong to them. */
export function withGroupMembers(groups: AccessGroup[], users: AccessUser[]): AccessGroup[] {
  const members = countIds(users.map((user) => user.groups))
  return groups.map((group) => ({ ...group, members: members.get(group.id) ?? 0 }))
}

/** Roles with `members` counted from the users who hold them. */
export function withRoleMembers(roles: AccessRole[], users: AccessUser[]): AccessRole[] {
  const members = countIds(users.map((user) => [user.role]))
  return roles.map((role) => ({ ...role, members: members.get(role.id) ?? 0 }))
}

/** Permissions with `roles` counted from the roles that grant them. */
export function withPermissionRoles(
  permissions: AccessPermission[],
  roles: AccessRole[],
): AccessPermission[] {
  const granted = countIds(roles.map((role) => role.permissions))
  return permissions.map((permission) => ({
    ...permission,
    roles: granted.get(permission.id) ?? 0,
  }))
}
