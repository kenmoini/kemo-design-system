import type { AccessTabId } from './types'

/** The Access page's tabs, in order, with their labels. */
export const accessTabs: { id: AccessTabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Users' },
  { id: 'groups', label: 'Groups' },
  { id: 'roles', label: 'Roles' },
  { id: 'permissions', label: 'Permissions' },
  { id: 'audit', label: 'Audit' },
  { id: 'oidc', label: 'OIDC' },
  { id: 'service-accounts', label: 'Service accounts' },
  { id: 'oauth-apps', label: 'OAuth apps' },
  { id: 'settings', label: 'Settings' },
]
