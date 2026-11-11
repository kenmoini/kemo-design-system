import type {
  AccessGroup,
  AccessPermission,
  AccessRole,
  AccessSettingsValues,
  AccessUser,
  ActivityItem,
  AuditEvent,
  AuditForwardingValues,
  OAuthApp,
  OidcProvider,
  Option,
  ServiceAccount,
  StatCardProps,
} from '@kemo/ui'

// Static mock data for the preview's Access page (`/access/*`). Every row is written out or
// generated from fixed lists by index, and every date is a fixed ISO string, so the server and
// client renders match. The state that changes is `accessReducer` in `./access-reducer`.

/** The demo's "now": rotations, new rows and finished syncs are stamped with it. */
export const DEMO_NOW = '2026-11-11T14:02:00Z'

const DAY_MS = 86_400_000
const MINUTE_MS = 60_000

/** `DEMO_NOW` moved by whole days and minutes, as an ISO string without milliseconds. */
export function demoTime({ days = 0, minutes = 0 }: { days?: number; minutes?: number }): string {
  const time = Date.parse(DEMO_NOW) + days * DAY_MS + minutes * MINUTE_MS
  return new Date(time).toISOString().replace('.000Z', 'Z')
}

// Roles and permissions

export const resources = ['deployments', 'services', 'environments', 'users', 'roles', 'audit']

const crud = ['read', 'create', 'update', 'delete'] as const

const verbs: Record<(typeof crud)[number], string> = {
  read: 'View',
  create: 'Create',
  update: 'Change',
  delete: 'Delete',
}

/** 24 permissions: read, create, update and delete on each of the six resources. */
export const permissions: AccessPermission[] = resources.flatMap((resource) =>
  crud.map((action) => ({
    id: `perm-${resource}-${action}`,
    name: `${resource}.${action}`,
    resource,
    action,
    description: `${verbs[action]} ${resource}`,
    // Filled in from the roles that grant it (see `withPermissionRoles`).
    roles: 0,
  })),
)

const allOf = (...names: string[]) => names.map((name) => `perm-${name.replace('.', '-')}`)
const everyPermission = permissions.map((permission) => permission.id)
const readsOf = (...list: string[]) => list.map((resource) => `perm-${resource}-read`)

/** Nine roles; Owner, Admin and Viewer are built in. `members` comes from the users. */
export const roles: AccessRole[] = [
  {
    id: 'r-owner',
    name: 'Owner',
    description: 'Everything, including billing and deleting the workspace',
    permissions: everyPermission,
    members: 0,
    builtIn: true,
    status: 'active',
  },
  {
    id: 'r-admin',
    name: 'Admin',
    description: 'Manages people, roles and every environment',
    permissions: everyPermission.filter((id) => id !== 'perm-audit-delete'),
    members: 0,
    builtIn: true,
    status: 'active',
  },
  {
    id: 'r-viewer',
    name: 'Viewer',
    description: 'Reads everything, changes nothing',
    permissions: readsOf(...resources),
    members: 0,
    builtIn: true,
    status: 'active',
  },
  {
    id: 'r-deployer',
    name: 'Deployer',
    description: 'Ships services to staging and production',
    permissions: [
      ...readsOf('deployments', 'services', 'environments'),
      ...allOf('deployments.create', 'deployments.update'),
    ],
    members: 0,
    builtIn: false,
    status: 'active',
  },
  {
    id: 'r-release',
    name: 'Release manager',
    description: 'Approves promotions and rolls back',
    permissions: [
      ...readsOf('deployments', 'services', 'environments', 'audit'),
      ...allOf('deployments.create', 'deployments.update', 'deployments.delete'),
      ...allOf('environments.update'),
    ],
    members: 0,
    builtIn: false,
    status: 'active',
  },
  {
    id: 'r-auditor',
    name: 'Auditor',
    description: 'Reads the audit log and who can do what',
    permissions: readsOf('audit', 'users', 'roles'),
    members: 0,
    builtIn: false,
    status: 'active',
  },
  {
    id: 'r-support',
    name: 'Support',
    description: 'Helps people sign in and resets their access',
    permissions: [...readsOf('users', 'services'), ...allOf('users.update')],
    members: 0,
    builtIn: false,
    status: 'active',
  },
  {
    id: 'r-oncall',
    name: 'On-call responder',
    description: 'Restarts and scales services during an incident',
    permissions: [
      ...readsOf('deployments', 'services', 'environments'),
      ...allOf('services.update', 'deployments.update'),
    ],
    members: 0,
    builtIn: false,
    status: 'active',
  },
  {
    id: 'r-contractor',
    name: 'Contractor',
    description: 'Time-boxed access to staging only',
    permissions: readsOf('deployments', 'services'),
    members: 0,
    builtIn: false,
    status: 'disabled',
  },
]

// Groups

/** 18 groups; the last five come from the identity providers. `members` comes from the users. */
export const groups: AccessGroup[] = [
  ['Platform team', 'Owns the console and the build pipeline', ['r-admin']],
  ['Site reliability', 'Keeps production up', ['r-oncall', 'r-deployer']],
  ['Security', 'Reviews access and the audit log', ['r-auditor']],
  ['Data engineering', 'Pipelines and the warehouse', ['r-deployer']],
  ['Frontend', 'Web console and marketing site', ['r-deployer']],
  ['Backend', 'APIs and workers', ['r-deployer']],
  ['Mobile', 'iOS and Android apps', []],
  ['Quality', 'Test environments and release checks', ['r-release']],
  ['Customer support', 'First line for sign-in trouble', ['r-support']],
  ['Finance', 'Invoices and spend reports', ['r-viewer']],
  ['Release managers', 'Approve production promotions', ['r-release']],
  ['Contractors', 'External teams on fixed-term work', ['r-contractor']],
  ['Interns', 'Read-only while onboarding', ['r-viewer']],
  ['okta-engineering', 'Synced from Okta', ['r-deployer']],
  ['okta-everyone', 'Synced from Okta', ['r-viewer']],
  ['okta-oncall', 'Synced from Okta', ['r-oncall']],
  ['google-design', 'Synced from Google Workspace', ['r-viewer']],
  ['google-marketing', 'Synced from Google Workspace', ['r-viewer']],
].map(([name, description, groupRoles], index) => ({
  id: `g-${String(index + 1).padStart(2, '0')}`,
  name: name as string,
  description: description as string,
  members: 0,
  roles: groupRoles as string[],
  source: index >= 13 ? 'oidc' : 'internal',
  // "Interns" is paused between cohorts.
  status: index === 12 ? 'disabled' : 'active',
}))

// Users

/**
 * First and last names for the generated users, paired by index so no pair repeats. Neither list
 * contains "priya" or "imani", so searching for either finds one person (the e2e tests rely on it).
 */
const firstNames = `
  Aaron Abena Adaeze Adrian Aiko Akira Alba Aleksander Alice Amara Amir Ana Anders Andrea Anika Arjun
  Astrid Ayo Beatriz Benedikt Bianca Bilal Bo Bruno Camila Carlos Chloe Ciaran Cyrus Dalia Dana Daniel
  Dario Dev Diego Dmitri Ebru Edwin Eitan Elena Elif Emeka Emma Erik Esra Esther Ethan Farah Fatima
  Felix Femi Freya Gabriel Gemma Gita Grace Hamid Hana Hiro Hugo Hye Ida Ilse Ilya Ines Ingrid Isak
  Ivan Jamal Jana Jarrah Javier Jin Joao Jude Julia Kai Kaito Kamala Kira Kofi Laila Lars Lea Leila
  Lena Leo Lina Luca Lucia Mads Malik Marek Marta Mateo Maya Mei Mila Mira Nadia Nadine Nasser Nia
  Nikhil Nils Noah Noor Nora Olga Omar Oskar Pablo Paula Pedro Petra Quinn Rafael Rania Ravi Rei Rhea
  Rosa Ruben Ruth Sami Samir Sana Saoirse Selin Siddharth Soren Sven Talia Tara Teo Thandi Tobias Uma
  Umar Uri Valentina Vera Viktor Wanjiru Wei Wiktoria Xavier Ximena Yara Yosef Yusuf Zainab Zara Zoltan
`
  .trim()
  .split(/\s+/)

const lastNames = `
  Abara Adams Andersen Baker Bakker Brennan Castro Chen Costa Delgado Diaz Dubois Eriksen Evans Eze
  Falk Ferreira Fischer Garcia Gupta Haddad Hassan Horvat Ito Iyer Jensen Jovanovic Kaur Kim Kowalski
  Lindqvist Lopez Mendes Mensah Moreau Nakamura Nguyen Novak Okafor Osei Park Petrov Quint Rahman
  Reyes Rossi Sato Silva Takahashi Tanaka Ueda Usman Varga Vasquez Wang Weiss Xu Yamamoto Yilmaz Zhou
  Zielinski
`
  .trim()
  .split(/\s+/)

/**
 * The n-th generated name: first name n mod F, last name (n + 7k) mod L where k = ⌊n / F⌋. With 61
 * (prime) last names, a first name meets a different last name on each of its first 61 laps.
 */
function generatedName(n: number): { first: string; last: string } {
  const lap = Math.floor(n / firstNames.length)
  return {
    first: firstNames[n % firstNames.length] as string,
    last: lastNames[(n + 7 * lap) % lastNames.length] as string,
  }
}

/** A well-mixed number from n and a salt, so roles, status and groups never line up with names. */
function spread(n: number, salt: number): number {
  let x = Math.imul(n + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca77)
  x ^= x >>> 15
  x = Math.imul(x, 0x2c1b3c6d)
  x ^= x >>> 12
  return x >>> 0
}

/** Generated users' roles, drawn by `spread`: mostly viewers and deployers, a few of the rest. */
const roleCycle = [
  'r-viewer',
  'r-deployer',
  'r-viewer',
  'r-deployer',
  'r-viewer',
  'r-release',
  'r-viewer',
  'r-deployer',
  'r-support',
  'r-viewer',
  'r-oncall',
  'r-viewer',
  'r-auditor',
  'r-viewer',
  'r-deployer',
  'r-viewer',
  'r-viewer',
  'r-admin',
  'r-viewer',
  'r-viewer',
]

/** Hand-written internal users first; the people the rest of the demo mentions. */
const namedUsers: AccessUser[] = [
  {
    id: 'u-001',
    name: 'Ken Moini',
    email: 'ken@acme.dev',
    role: 'r-owner',
    source: 'internal',
    groups: ['g-01'],
    status: 'active',
    lastSignInAt: demoTime({ minutes: -2 }),
    createdAt: '2025-03-02T09:00:00Z',
  },
  {
    id: 'u-002',
    name: 'Priya Shah',
    email: 'priya.shah@acme.dev',
    role: 'r-admin',
    source: 'internal',
    groups: ['g-01', 'g-03'],
    status: 'active',
    lastSignInAt: demoTime({ minutes: -14 }),
    createdAt: '2025-03-04T10:30:00Z',
  },
  {
    id: 'u-003',
    name: 'Sofia Marin',
    email: 'sofia.marin@acme.dev',
    role: 'r-admin',
    source: 'internal',
    groups: ['g-02', 'g-11'],
    status: 'active',
    lastSignInAt: demoTime({ minutes: -41 }),
    createdAt: '2025-04-11T08:15:00Z',
  },
  {
    id: 'u-004',
    name: 'Jonas Weber',
    email: 'jonas.weber@acme.dev',
    role: 'r-release',
    source: 'internal',
    groups: ['g-08', 'g-11'],
    status: 'active',
    lastSignInAt: demoTime({ days: -1, minutes: -95 }),
    createdAt: '2025-06-20T13:45:00Z',
  },
  {
    id: 'u-005',
    name: 'Aisha Bello',
    email: 'aisha.bello@acme.dev',
    role: 'r-auditor',
    source: 'internal',
    groups: ['g-03'],
    status: 'active',
    lastSignInAt: demoTime({ days: -3, minutes: -20 }),
    createdAt: '2025-09-01T07:00:00Z',
  },
  {
    id: 'u-006',
    name: 'Tomás Ortega',
    email: 'tomas.ortega@acme.dev',
    role: 'r-contractor',
    source: 'internal',
    groups: ['g-12'],
    status: 'disabled',
    lastSignInAt: '2026-08-28T16:10:00Z',
    createdAt: '2026-05-12T09:00:00Z',
  },
]

/** The internal groups generated users join (Interns and Contractors stay small). */
const internalGroupCycle = ['g-04', 'g-05', 'g-06', 'g-07', 'g-08', 'g-09', 'g-10', 'g-02']

const INTERNAL_USERS = 231
const OKTA_USERS = 268
const GOOGLE_USERS = 144

/** A generated user: n counts across every generated user, so names never repeat. */
function generatedUser(n: number, source: 'internal' | 'oidc', provider?: string): AccessUser {
  const { first, last } = generatedName(n)
  const pick = <T>(list: T[], salt: number) => list[spread(n, salt) % list.length] as T
  const role = pick(roleCycle, 1)
  let userGroups: string[]
  if (provider === 'Okta') {
    userGroups = spread(n, 2) % 3 === 0 ? ['g-14', 'g-15', 'g-16'] : ['g-14', 'g-15']
  } else if (provider === 'Google Workspace') {
    userGroups = [pick(['g-17', 'g-18'], 2)]
  } else {
    userGroups = [pick(internalGroupCycle, 2)]
    if (spread(n, 3) % 9 === 0) userGroups.push('g-13')
  }
  return {
    id: `u-${String(namedUsers.length + n + 1).padStart(3, '0')}`,
    name: `${first} ${last}`,
    email:
      `${first}.${last}@${provider === 'Google Workspace' ? 'acme.design' : 'acme.dev'}`.toLowerCase(),
    // Admins are invited directly, never synced in.
    role: role === 'r-admin' && source === 'oidc' ? 'r-viewer' : role,
    source,
    provider,
    groups: userGroups,
    status: spread(n, 4) % 16 === 0 ? 'disabled' : 'active',
    // Some never signed in; the rest within the last 30 days.
    lastSignInAt:
      spread(n, 5) % 11 === 0
        ? undefined
        : demoTime({ days: -(spread(n, 6) % 30), minutes: -(spread(n, 7) % 1440) }),
    createdAt: demoTime({ days: -(40 + (spread(n, 8) % 500)) }),
  }
}

/** 231 internal users and 412 through OIDC (268 from Okta, 144 from Google Workspace). */
export const users: AccessUser[] = [
  ...namedUsers,
  ...Array.from({ length: INTERNAL_USERS - namedUsers.length }, (_, n) =>
    generatedUser(n, 'internal'),
  ),
  ...Array.from({ length: OKTA_USERS }, (_, k) =>
    generatedUser(INTERNAL_USERS - namedUsers.length + k, 'oidc', 'Okta'),
  ),
  ...Array.from({ length: GOOGLE_USERS }, (_, k) =>
    generatedUser(INTERNAL_USERS - namedUsers.length + OKTA_USERS + k, 'oidc', 'Google Workspace'),
  ),
]

// Service accounts and OAuth apps

export const serviceAccounts: ServiceAccount[] = [
  ['ci-deployer', 'GitHub Actions: deploys on merge to main', 'r-deployer', 64, -0.01],
  ['terraform-cloud', 'Applies infrastructure plans', 'r-admin', 21, -0.3],
  ['grafana-reader', 'Dashboards read metrics and deployments', 'r-viewer', 302, -0.002],
  ['backup-agent', 'Nightly snapshots of environment config', 'r-viewer', 9, -0.6],
  ['audit-exporter', 'Copies the audit log to cold storage', 'r-auditor', 145, -1],
  ['release-bot', 'Opens and promotes release candidates', 'r-release', 33, -2.4],
  ['legacy-importer', 'One-off migration from the old console', 'r-admin', -12, -48],
].map(([name, description, role, expiresInDays, lastUsedDays], index) => ({
  id: `sa-${index + 1}`,
  name: name as string,
  description: description as string,
  role: role as string,
  tokenExpiresAt: demoTime({ days: expiresInDays as number }),
  lastUsedAt: demoTime({ minutes: Math.round((lastUsedDays as number) * 1440) }),
  status: index === 6 ? 'disabled' : 'active',
}))

export const scopeOptions: Option[] = [
  { value: 'openid', label: 'openid' },
  { value: 'profile', label: 'profile' },
  { value: 'email', label: 'email' },
  { value: 'groups', label: 'groups' },
  { value: 'offline_access', label: 'offline_access' },
  { value: 'deployments:read', label: 'deployments:read' },
  { value: 'deployments:write', label: 'deployments:write' },
  { value: 'audit:read', label: 'audit:read' },
]

export const oauthApps: OAuthApp[] = [
  {
    id: 'app-1',
    name: 'Backstage portal',
    clientId: 'kemo_9f3c1a7e2b',
    type: 'web',
    redirectUris: ['https://backstage.acme.dev/api/auth/kemo/handler/frame'],
    scopes: ['openid', 'profile', 'email', 'groups', 'deployments:read'],
    owner: 'Platform team',
    status: 'active',
    createdAt: '2026-02-14T10:20:00Z',
    description: 'Service catalogue sign-in',
  },
  {
    id: 'app-2',
    name: 'Kemo CLI',
    clientId: 'kemo_41d8e0c6f5',
    type: 'native',
    redirectUris: ['http://127.0.0.1:8085/callback'],
    scopes: ['openid', 'profile', 'offline_access', 'deployments:read', 'deployments:write'],
    owner: 'Platform team',
    status: 'active',
    createdAt: '2025-11-03T09:00:00Z',
    description: 'Device sign-in for the command line',
  },
  {
    id: 'app-3',
    name: 'Grafana',
    clientId: 'kemo_c27a90b1d4',
    type: 'web',
    redirectUris: ['https://grafana.acme.dev/login/generic_oauth'],
    scopes: ['openid', 'profile', 'email', 'groups'],
    owner: 'Site reliability',
    status: 'active',
    createdAt: '2026-01-08T15:45:00Z',
    description: '',
  },
  {
    id: 'app-4',
    name: 'Datadog sync',
    clientId: 'kemo_7b5e2f8c03',
    type: 'machine',
    redirectUris: [],
    scopes: ['deployments:read', 'audit:read'],
    owner: 'Site reliability',
    status: 'active',
    createdAt: '2026-06-30T11:10:00Z',
    description: 'Posts deploy markers to dashboards',
  },
  {
    id: 'app-5',
    name: 'iOS companion',
    clientId: 'kemo_e14f6d2a98',
    type: 'native',
    redirectUris: ['dev.acme.console:/oauth2redirect'],
    scopes: ['openid', 'profile', 'offline_access'],
    owner: 'Mobile',
    status: 'disabled',
    createdAt: '2026-04-22T08:30:00Z',
    description: 'Paused until the 2.0 release',
  },
]

// OIDC

const defaultScopes = ['openid', 'profile', 'email', 'groups']

/** Okta synced, Google Workspace part-way through a sync, Azure AD failing on its secret. */
export const oidcProviders: OidcProvider[] = [
  {
    id: 'oidc-okta',
    name: 'Okta',
    issuer: 'https://acme.okta.com',
    users: OKTA_USERS,
    groupsMapped: 3,
    sync: { state: 'synced' },
    lastSyncAt: demoTime({ minutes: -16 }),
    enabled: true,
    clientId: '0oa8k2c4x1QmZp3Vd5d7',
    scopes: defaultScopes,
    groupClaim: 'groups',
    autoCreateUsers: true,
  },
  {
    id: 'oidc-google',
    name: 'Google Workspace',
    issuer: 'https://accounts.google.com',
    users: GOOGLE_USERS,
    groupsMapped: 2,
    sync: { state: 'syncing', progress: 61 },
    lastSyncAt: demoTime({ days: -1, minutes: -362 }),
    enabled: true,
    clientId: '41870935512-k3v9.apps.googleusercontent.com',
    scopes: defaultScopes,
    groupClaim: 'groups',
    autoCreateUsers: true,
  },
  {
    id: 'oidc-azure',
    name: 'Azure AD',
    issuer: 'https://login.microsoftonline.com/4f1c2d7e-acme/v2.0',
    users: 0,
    groupsMapped: 0,
    sync: { state: 'error', message: 'invalid client secret' },
    enabled: true,
    clientId: '6b0e4c1f-2a9d-4e83-b7c5-0d1f9a3e2c64',
    scopes: ['openid', 'profile', 'email'],
    groupClaim: 'roles',
    autoCreateUsers: false,
  },
]

/** The providers' stored client secrets; Azure AD's has expired, so its syncs keep failing. */
export const providerSecrets: Record<string, { value: string; rejected: boolean }> = {
  'oidc-okta': { value: 'okta-secret', rejected: false },
  'oidc-google': { value: 'google-secret', rejected: false },
  'oidc-azure': { value: 'azure-secret-expired', rejected: true },
}

// Overview

/** The Overview's four stats, given the live counts (the deltas and sparklines are fixed). */
export function overviewStats(counts: {
  internalUsers: number
  groups: number
  oidcUsers: number
}): StatCardProps[] {
  return [
    {
      label: 'Internal users',
      value: String(counts.internalUsers),
      delta: { value: '4', direction: 'up', tone: 'good', suffix: 'this week' },
      sparkline: [212, 214, 215, 219, 220, 222, 224, 225, 227, 228, 230, 231],
    },
    {
      label: 'Groups',
      value: String(counts.groups),
      delta: { value: '1', direction: 'up', tone: 'neutral', suffix: 'this month' },
    },
    {
      label: 'OIDC users',
      value: String(counts.oidcUsers),
      delta: { value: '12', direction: 'up', tone: 'good', suffix: 'last sync' },
      sparkline: [361, 366, 370, 377, 381, 386, 390, 396, 399, 404, 408, 412],
    },
    {
      label: 'Active sessions',
      value: '96',
      delta: { value: '3.1%', direction: 'down', tone: 'neutral', suffix: 'vs yesterday' },
      sparkline: [88, 104, 117, 121, 112, 99, 93, 101, 108, 103, 98, 96],
    },
  ]
}

/** "Ken Moini" → "KM". */
const initialsOf = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)

/** A sign-in by the user at `index` in `users`. */
function signIn(id: string, index: number, action: string, when: string): ActivityItem {
  const { name } = users[index] as AccessUser
  return { id, actor: name, initials: initialsOf(name), action, when }
}

/** The last day's sign-ins, newest first: by people in the users list (the first Okta and Google
 * users are at `INTERNAL_USERS` and `INTERNAL_USERS + OKTA_USERS`). */
export const signIns: ActivityItem[] = [
  signIn('si-5', 0, 'signed in with a password and MFA', '2 min ago'),
  signIn('si-4', 1, 'signed in with a password and MFA', '14 min ago'),
  signIn('si-3', INTERNAL_USERS, 'signed in through Okta', '22 min ago'),
  signIn('si-2', INTERNAL_USERS + OKTA_USERS, 'signed in through Google Workspace', '41 min ago'),
  signIn('si-1', 3, 'failed MFA from 203.0.113.24', '1 h ago'),
]

// Audit

/** The API audit stream, newest first. */
export const auditEvents: AuditEvent[] = [
  {
    id: 'ae-12',
    time: '14:02:11',
    method: 'POST',
    path: '/api/v1/deployments',
    actor: 'ci-deployer',
    status: 201,
    durationMs: 182,
    ip: '10.0.4.19',
    kind: 'api',
  },
  {
    id: 'ae-11',
    time: '14:01:58',
    method: 'PATCH',
    path: '/api/v1/roles/r-release',
    actor: 'priya.shah@acme.dev',
    status: 200,
    durationMs: 64,
    ip: '198.51.100.7',
    kind: 'admin',
  },
  {
    id: 'ae-10',
    time: '14:01:40',
    method: 'POST',
    path: '/api/v1/auth/token',
    actor: 'ken@acme.dev',
    status: 200,
    durationMs: 241,
    ip: '198.51.100.12',
    kind: 'signin',
  },
  {
    id: 'ae-9',
    time: '14:01:22',
    method: 'GET',
    path: '/api/v1/services',
    actor: 'grafana-reader',
    status: 200,
    durationMs: 38,
    ip: '10.0.2.31',
    kind: 'api',
  },
  {
    id: 'ae-8',
    time: '14:00:57',
    method: 'DELETE',
    path: '/api/v1/environments/preview-412',
    actor: 'release-bot',
    status: 403,
    durationMs: 22,
    ip: '10.0.4.22',
    kind: 'api',
  },
  {
    id: 'ae-7',
    time: '14:00:31',
    method: 'POST',
    path: '/api/v1/auth/token',
    actor: 'jonas.weber@acme.dev',
    status: 401,
    durationMs: 1210,
    ip: '203.0.113.24',
    kind: 'signin',
  },
  {
    id: 'ae-6',
    time: '13:59:48',
    method: 'PUT',
    path: '/api/v1/users/u-118/groups',
    actor: 'sofia.marin@acme.dev',
    status: 200,
    durationMs: 91,
    ip: '198.51.100.40',
    kind: 'admin',
  },
  {
    id: 'ae-5',
    time: '13:59:02',
    method: 'GET',
    path: '/api/v1/audit?since=13:00',
    actor: 'audit-exporter',
    status: 200,
    durationMs: 2380,
    ip: '10.0.6.5',
    kind: 'api',
  },
  {
    id: 'ae-4',
    time: '13:58:15',
    method: 'POST',
    path: '/api/v1/deployments/d-7731/rollback',
    actor: 'jonas.weber@acme.dev',
    status: 502,
    durationMs: 3015,
    ip: '198.51.100.18',
    kind: 'api',
  },
  {
    id: 'ae-3',
    time: '13:57:40',
    method: 'POST',
    path: '/api/v1/service-accounts/sa-2/token',
    actor: 'ken@acme.dev',
    status: 201,
    durationMs: 120,
    ip: '198.51.100.12',
    kind: 'admin',
  },
  {
    id: 'ae-2',
    time: '13:56:09',
    method: 'GET',
    path: '/api/v1/deployments?env=prod',
    actor: 'ci-deployer',
    status: 200,
    durationMs: 57,
    ip: '10.0.4.19',
    kind: 'api',
  },
  {
    id: 'ae-1',
    time: '13:55:30',
    method: 'PATCH',
    path: '/api/v1/settings/access',
    actor: 'priya.shah@acme.dev',
    status: 200,
    durationMs: 73,
    ip: '198.51.100.7',
    kind: 'admin',
  },
]

/** What the live tick prepends, in turn; `useLiveEvents` gives each a fresh id and time. */
export const auditEventRotation: Omit<AuditEvent, 'id' | 'time'>[] = [
  {
    method: 'GET',
    path: '/api/v1/deployments?env=staging',
    actor: 'ci-deployer',
    status: 200,
    durationMs: 44,
    ip: '10.0.4.19',
    kind: 'api',
  },
  {
    method: 'POST',
    path: '/api/v1/auth/token',
    actor: 'aisha.bello@acme.dev',
    status: 200,
    durationMs: 198,
    ip: '198.51.100.63',
    kind: 'signin',
  },
  {
    method: 'PATCH',
    path: '/api/v1/groups/g-02',
    actor: 'sofia.marin@acme.dev',
    status: 200,
    durationMs: 81,
    ip: '198.51.100.40',
    kind: 'admin',
  },
  {
    method: 'GET',
    path: '/api/v1/services/checkout-api',
    actor: 'grafana-reader',
    status: 404,
    durationMs: 19,
    ip: '10.0.2.31',
    kind: 'api',
  },
  {
    method: 'POST',
    path: '/api/v1/deployments',
    actor: 'release-bot',
    status: 201,
    durationMs: 205,
    ip: '10.0.4.22',
    kind: 'api',
  },
  {
    method: 'POST',
    path: '/api/v1/environments/prod/scale',
    actor: 'terraform-cloud',
    status: 503,
    durationMs: 1840,
    ip: '10.0.8.2',
    kind: 'api',
  },
]

export const forwardingDefaults: AuditForwardingValues = {
  destination: 'splunk',
  format: 'json',
  endpoint: 'https://splunk.acme.dev:8088/services/collector',
  token: 'hec-5c1f0e9a-7b2d-4e6a',
  include: ['signins', 'admin', 'api'],
  failedOnly: false,
  enabled: true,
}

// Settings

export const settingsDefaults: AccessSettingsValues = {
  passwordSignIn: true,
  requireMfaForAdmins: true,
  accessTokenMinutes: 60,
  refreshTokenDays: 30,
  idleTimeoutHours: 8,
  serviceTokenMaxDays: 90,
  requireVerifiedEmail: true,
  smtp: {
    host: 'smtp.acme.dev',
    port: 587,
    username: 'console-mailer',
    password: 'mailer-password',
    from: 'no-reply@acme.dev',
  },
}

// Options

/** A row as a select option: its id and name. */
export function toOption({ id, name }: { id: string; name: string }): Option {
  return { value: id, label: name }
}

/** The starting role and group options (the demo derives them from its state as rows change). */
export const roleOptions: Option[] = roles.map(toOption)
export const groupOptions: Option[] = groups.map(toOption)
