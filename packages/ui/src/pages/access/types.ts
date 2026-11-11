import type { LinkComponent } from '../auth/types'

export type { Option } from '../../widgets'

export type EntityStatus = 'active' | 'disabled'

/** The Access page's tabs; each one is its own URL. */
export type AccessTabId =
  | 'overview'
  | 'users'
  | 'groups'
  | 'roles'
  | 'permissions'
  | 'audit'
  | 'oidc'
  | 'service-accounts'
  | 'oauth-apps'
  | 'settings'

/** `role` and `groups` hold ids; labels come from the `Option[]` lists the tab receives. */
export interface AccessUser {
  id: string
  name: string
  email: string
  role: string
  source: 'internal' | 'oidc'
  provider?: string
  groups: string[]
  status: EntityStatus
  lastSignInAt?: string
  createdAt: string
}

/** `roles` holds role ids. */
export interface AccessGroup {
  id: string
  name: string
  description?: string
  members: number
  roles: string[]
  source: 'internal' | 'oidc'
  status: EntityStatus
}

/** `permissions` holds permission ids. */
export interface AccessRole {
  id: string
  name: string
  description?: string
  permissions: string[]
  members: number
  builtIn: boolean
  status: EntityStatus
}

export interface AccessPermission {
  id: string
  /** e.g. "deployments.create" */
  name: string
  resource: string
  action: 'read' | 'create' | 'update' | 'delete' | 'admin'
  description?: string
  roles: number
}

/** `role` holds a role id. */
export interface ServiceAccount {
  id: string
  name: string
  description?: string
  role: string
  tokenExpiresAt: string
  lastUsedAt?: string
  status: EntityStatus
}

export interface OAuthApp {
  id: string
  name: string
  clientId: string
  type: 'web' | 'native' | 'machine'
  redirectUris: string[]
  scopes: string[]
  owner: string
  status: EntityStatus
  createdAt: string
  description?: string
}

export interface OidcProvider {
  id: string
  name: string
  issuer: string
  users: number
  groupsMapped: number
  sync: { state: 'synced' | 'syncing' | 'error' | 'disabled'; progress?: number; message?: string }
  lastSyncAt?: string
  enabled: boolean
}

export interface AuditEvent {
  id: string
  time: string
  method: string
  path: string
  actor: string
  status: number
  durationMs: number
  ip?: string
  kind: 'signin' | 'admin' | 'api'
}

export interface AuditForwardingValues {
  destination: 'splunk' | 'syslog' | 's3' | 'webhook'
  format: 'json' | 'cef'
  endpoint: string
  token: string
  include: ('signins' | 'admin' | 'api')[]
  failedOnly: boolean
  enabled: boolean
}

export interface AccessSettingsValues {
  passwordSignIn: boolean
  requireMfaForAdmins: boolean
  accessTokenMinutes: 15 | 30 | 60 | 120
  refreshTokenDays: 7 | 30 | 90
  idleTimeoutHours: 1 | 8 | 24
  serviceTokenMaxDays: 30 | 90 | 365
  requireVerifiedEmail: boolean
  smtp: { host: string; port: number; username: string; password: string; from: string }
}

/**
 * What every object tab (Users, Groups, Roles, Permissions, Service accounts, OAuth apps) takes:
 * its rows and the host's handlers. `onCreate` and `onUpdate` may return a promise; a rejection
 * keeps the dialog open and shows the error's message.
 */
export interface EntityTabProps<T, V> {
  rows: T[]
  onCreate: (values: V) => void | Promise<void>
  onUpdate: (id: string, values: V) => void | Promise<void>
  /** Given, "Clone" calls it; otherwise "Clone" opens the Add dialog pre-filled and calls `onCreate`. */
  onClone?: (id: string) => void
  /** Given, the tab offers Enable/Disable. */
  onSetStatus?: (ids: string[], status: EntityStatus) => void
  onDelete: (ids: string[]) => void
  linkComponent?: LinkComponent
}
