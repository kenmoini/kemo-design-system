import type {
  ActivityItem,
  EventStreamEvent,
  NavItem,
  PageFooterProps,
  Series,
  StatCardProps,
  StatusTone,
  TableData,
  TopBarProps,
} from '@kemo/ui'
import {
  BoxesIcon,
  KeyRoundIcon,
  LayersIcon,
  LayoutDashboardIcon,
  type LucideIcon,
  RocketIcon,
  SettingsIcon,
  SirenIcon,
} from 'lucide-react'

// Static mock data for the preview's overview dashboard (`/dashboard`). Plain values only: every
// number is written out or derived without randomness, so the server and client renders match.
// The stateful bit, the live event tick, is `useLiveEvents` in `./use-live-events`.

// Shell

/** Nav items carry the icon component; the demo renders it (`NavItem.icon` is a node). */
export type MockNavItem = Omit<NavItem, 'icon'> & { icon: LucideIcon }

export const navGroups: { label: string; items: MockNavItem[] }[] = [
  {
    label: 'Platform',
    items: [
      {
        id: 'overview',
        label: 'Overview',
        icon: LayoutDashboardIcon,
        href: '/dashboard',
        active: true,
      },
      { id: 'services', label: 'Services', icon: BoxesIcon, href: '#services' },
      { id: 'deployments', label: 'Deployments', icon: RocketIcon, href: '#deployments', badge: 3 },
      { id: 'incidents', label: 'Incidents', icon: SirenIcon, href: '#incidents', badge: 1 },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'environments', label: 'Environments', icon: LayersIcon, href: '#environments' },
      { id: 'access', label: 'Access', icon: KeyRoundIcon, href: '#access' },
      { id: 'settings', label: 'Settings', icon: SettingsIcon, href: '#settings' },
    ],
  },
]

export const environments = [
  { value: 'prod-us-east', label: 'prod-us-east' },
  { value: 'staging-us-east', label: 'staging-us-east' },
  { value: 'dev-local', label: 'dev-local' },
]

/** The top bar's static props; the demo adds the logo, the environment state and the actions. */
export const topBar = {
  brand: { name: 'Kemo Console' },
  search: { placeholder: 'Search services, deployments…' },
  notifications: 3,
  account: {
    initials: 'KM',
    name: 'Ken M.',
    menu: [{ label: 'Profile' }, { label: 'Settings' }, { label: 'Sign out' }],
  },
} satisfies Pick<TopBarProps, 'brand' | 'search' | 'notifications' | 'account'>

export const workspace = 'Core team'

export const footer = {
  product: 'Kemo Console',
  version: 'v0.3.0',
  status: { tone: 'good', text: 'All systems normal' },
} satisfies Omit<PageFooterProps, 'links'>

export const footerLinks: PageFooterProps['links'] = [
  { label: 'Docs', href: '#docs' },
  { label: 'Support', href: '#support' },
  { label: 'Status', href: '#status' },
  { label: 'Privacy', href: '#privacy' },
]

// Header and incident

export const pageContext = ['Tuesday, November 10', 'updated 12 seconds ago']

export const incident = {
  title: 'Incident INC-418',
  description: 'checkout-api p95 latency above 300 ms for 9 minutes. 2 responders active.',
  action: 'Open incident',
}

// Stat cards

export const stats: StatCardProps[] = [
  {
    label: 'Requests per minute',
    value: '12,480',
    delta: { value: '8.2%', direction: 'up', tone: 'good', suffix: 'vs yesterday' },
    sparkline: [9800, 10150, 9900, 10600, 10450, 11020, 11300, 11180, 11760, 12040, 11920, 12480],
  },
  {
    label: 'Error rate',
    value: '0.31%',
    delta: { value: '0.04 pts', direction: 'down', tone: 'good' },
    sparkline: [0.36, 0.35, 0.35, 0.37, 0.34, 0.33, 0.35, 0.32, 0.33, 0.32, 0.31, 0.31],
  },
  {
    label: 'p95 latency',
    value: '184 ms',
    delta: { value: '12 ms', direction: 'up', tone: 'bad', suffix: 'slower' },
    sparkline: [168, 170, 169, 172, 171, 174, 173, 176, 178, 177, 181, 184],
  },
  {
    label: 'Active users',
    value: '8,214',
    delta: { value: '3.1%', direction: 'up', tone: 'good', suffix: 'this week' },
    sparkline: [7720, 7790, 7810, 7880, 7860, 7930, 8010, 8040, 8090, 8120, 8170, 8214],
  },
]

// Requests per minute: three tiers over the last 24 hours

export const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}:00`)

const apiRpm = [
  4210, 3980, 3760, 3620, 3580, 3710, 4050, 4620, 5310, 5880, 6240, 6410, 6530, 6620, 6710, 6680,
  6790, 6950, 7120, 7280, 7350, 7310, 7400, 7450,
]
const webRpm = [
  2150, 1980, 1860, 1790, 1760, 1820, 2010, 2380, 2760, 3020, 3180, 3260, 3310, 3350, 3390, 3360,
  3420, 3480, 3530, 3570, 3610, 3590, 3600, 3620,
]
const workersRpm = [
  1620, 1580, 1540, 1510, 1490, 1500, 1460, 1420, 1380, 1350, 1340, 1330, 1320, 1330, 1350, 1360,
  1370, 1380, 1390, 1400, 1410, 1400, 1405, 1410,
]

const hourly = (values: number[]) => values.map((y, i) => ({ x: hours[i] ?? String(i), y }))

export const requestSeries: Series[] = [
  { id: 'api', label: 'API', data: hourly(apiRpm) },
  { id: 'web', label: 'Web', data: hourly(webRpm) },
  { id: 'workers', label: 'Workers', data: hourly(workersRpm) },
]

export const requestTable: TableData = {
  columns: ['Hour', 'API', 'Web', 'Workers'],
  rows: hours.map((hour, i) => [hour, apiRpm[i] ?? 0, webRpm[i] ?? 0, workersRpm[i] ?? 0]),
}

// Capacity: CPU as a donut, storage as parts of a whole (TB)

export const capacity = {
  cpu: { used: 336, total: 480 },
  lines: ['336 of 480 cores', 'Memory 1.7 of 1.9 TB', '48 nodes, 44 ready'],
  storage: {
    used: 2.4,
    total: 4,
    segments: [
      { label: 'Objects', value: 1.3 },
      { label: 'Databases', value: 0.7 },
      { label: 'Logs', value: 0.4 },
    ],
  },
}

export const capacityTable: TableData = {
  columns: ['Resource', 'Used', 'Total'],
  rows: [
    ['CPU (cores)', capacity.cpu.used, capacity.cpu.total],
    ['Memory (TB)', 1.7, 1.9],
    ['Storage (TB)', capacity.storage.used, capacity.storage.total],
    ...capacity.storage.segments.map((s): (string | number)[] => [
      `Storage: ${s.label} (TB)`,
      s.value,
      '',
    ]),
  ],
}

// Deployments per day, last 7 days, stacked

export const deploymentDays = ['Wed', 'Thu', 'Fri', 'Sat', 'Sun', 'Mon', 'Tue']
const succeeded = [18, 23, 16, 5, 3, 21, 19]
const failed = [1, 2, 1, 0, 0, 3, 1]

const daily = (values: number[]) => values.map((y, i) => ({ x: deploymentDays[i] ?? String(i), y }))

export const deploymentsByDay: Series[] = [
  { id: 'succeeded', label: 'Succeeded', data: daily(succeeded) },
  { id: 'failed', label: 'Failed', data: daily(failed) },
]

export const deploymentsTable: TableData = {
  columns: ['Day', 'Succeeded', 'Failed'],
  rows: deploymentDays.map((day, i) => [day, succeeded[i] ?? 0, failed[i] ?? 0]),
}

// Node health: 48 nodes, 44 ready, 1 under pressure, 1 not ready, 2 cordoned

const nodeStatus: Record<number, StatusTone> = {
  13: 'critical',
  30: 'warning',
  46: 'off',
  47: 'off',
}

export const nodeCells = Array.from({ length: 48 }, (_, i) => ({
  id: `node-${i + 1}`,
  label: `ip-10-0-${Math.floor(i / 12) + 1}-${(i % 12) + 11}`,
  status: nodeStatus[i] ?? ('good' as StatusTone),
}))

export const nodeTable: TableData = {
  columns: ['Node', 'Status'],
  rows: nodeCells.map((cell) => [
    cell.label,
    { good: 'Ready', warning: 'Pressure', critical: 'NotReady', off: 'Cordoned' }[cell.status],
  ]),
}

// Top endpoints, requests in the last hour

export const topEndpoints = [
  { label: '/api/cart', value: 4120 },
  { label: '/api/search', value: 3310 },
  { label: '/api/checkout', value: 2040 },
  { label: '/api/profile', value: 1290 },
  { label: '/api/orders', value: 880 },
]

export const topEndpointsTable: TableData = {
  columns: ['Endpoint', 'Requests'],
  rows: topEndpoints.map((e) => [e.label, e.value]),
}

// Recent deployments

export type DeploymentStatus = 'live' | 'canary' | 'rolled-back' | 'queued'

export interface Deployment {
  id: string
  service: string
  version: string
  env: 'production' | 'staging'
  by: string
  status: DeploymentStatus
  statusLabel: string
  /** p95 latency since the rollout, for the inline sparkline. */
  latency: number[]
  when: string
}

export const deployments: Deployment[] = [
  {
    id: 'dep-1',
    service: 'checkout-api',
    version: 'v2.14.0',
    env: 'production',
    by: 'Priya',
    status: 'live',
    statusLabel: 'Live',
    latency: [182, 180, 184, 179, 186, 190, 188, 194],
    when: '4 min ago',
  },
  {
    id: 'dep-2',
    service: 'web-frontend',
    version: 'v9.3.1',
    env: 'production',
    by: 'Marcus',
    status: 'canary',
    statusLabel: 'Canary 10%',
    latency: [96, 98, 95, 97, 99, 96, 98, 97],
    when: '22 min ago',
  },
  {
    id: 'dep-3',
    service: 'search-indexer',
    version: 'v1.8.2',
    env: 'production',
    by: 'Ken',
    status: 'rolled-back',
    statusLabel: 'Rolled back',
    latency: [140, 142, 139, 158, 171, 166, 150, 141],
    when: '1 h ago',
  },
  {
    id: 'dep-4',
    service: 'auth-service',
    version: 'v4.0.0',
    env: 'staging',
    by: 'Sofia',
    status: 'queued',
    statusLabel: 'Queued',
    latency: [61, 60, 62, 61, 60, 61, 62, 61],
    when: '3 h ago',
  },
  {
    id: 'dep-5',
    service: 'billing-worker',
    version: 'v0.9.4',
    env: 'production',
    by: 'Priya',
    status: 'live',
    statusLabel: 'Live',
    latency: [210, 207, 212, 205, 209, 204, 206, 203],
    when: 'Yesterday',
  },
]

export const deploymentTabs = [
  { id: 'all', label: 'All' },
  { id: 'production', label: 'Production' },
  { id: 'staging', label: 'Staging' },
  { id: 'failed', label: 'Failed' },
]

/** Deployments across all pages of the "All" tab, for the pager ("Showing 5 of 128"). */
export const deploymentsTotal = 128

// Rollouts and regions

export const rollouts = [
  { label: 'web-frontend v9.3.1', value: 10 },
  { label: 'Postgres 16 migration', value: 72 },
  { label: 'Cert rotation', value: 100, tone: 'good' as const },
  { label: 'Index rebuild', value: 41, tone: 'critical' as const, note: 'Failed at 41%' },
]

export const regions = [
  { label: 'us-east', data: [182, 179, 186, 181, 190, 188, 184, 192, 189, 194, 191, 196] },
  { label: 'us-west', data: [151, 154, 150, 153, 149, 152, 155, 151, 150, 153, 152, 151] },
  { label: 'eu-west', data: [168, 166, 171, 169, 174, 172, 178, 176, 181, 179, 184, 188] },
  { label: 'ap-south', data: [221, 219, 222, 220, 218, 221, 223, 220, 219, 222, 221, 220] },
]

// Event stream and activity

export const events: EventStreamEvent[] = [
  {
    id: 'evt-5',
    time: '14:02:11',
    tone: 'critical',
    text: 'Alert fired: p95 latency over 300 ms on checkout-api',
  },
  { id: 'evt-4', time: '14:01:48', tone: 'good', text: 'checkout-api v2.14.0 promoted to 100%' },
  {
    id: 'evt-3',
    time: '13:58:05',
    tone: 'warning',
    text: 'Node ip-10-0-3-17 reported memory pressure',
  },
  {
    id: 'evt-2',
    time: '13:55:30',
    tone: 'info',
    text: 'Autoscaler added 2 replicas to search-indexer',
  },
  { id: 'evt-1', time: '13:41:02', tone: 'good', text: 'Incident INC-412 resolved by Sofia' },
]

/** What the live tick prepends, in turn; `useLiveEvents` gives each a fresh id and time. */
export const liveEventRotation: Omit<EventStreamEvent, 'id' | 'time'>[] = [
  { tone: 'info', text: 'Autoscaler added 1 replica to checkout-api' },
  { tone: 'good', text: 'Health checks passing again on ip-10-0-4-19' },
  { tone: 'info', text: 'web-frontend canary widened to 25%' },
  { tone: 'warning', text: 'Queue depth above 1,000 on billing-worker' },
  { tone: 'good', text: 'Backup completed for orders-db' },
  { tone: 'critical', text: 'Error budget burn above 2x on search-api' },
]

export const activity: ActivityItem[] = [
  {
    id: 'act-1',
    actor: 'Priya',
    initials: 'P',
    action: 'promoted checkout-api v2.14.0',
    when: '4 min ago',
  },
  {
    id: 'act-2',
    actor: 'Marcus',
    initials: 'M',
    action: 'started a canary for web-frontend',
    when: '22 min ago',
  },
  {
    id: 'act-3',
    actor: 'Sofia',
    initials: 'S',
    action: 'resolved incident INC-412',
    when: '1 h ago',
  },
  {
    id: 'act-4',
    actor: 'Ken',
    initials: 'K',
    action: 'rolled back search-indexer v1.8.2',
    when: '1 h ago',
  },
  {
    id: 'act-5',
    actor: 'Priya',
    initials: 'P',
    action: 'invited 2 people to Core team',
    when: '3 h ago',
  },
]

// Deploy frequency: 16 weeks x 7 days, Monday first, ending Sunday, November 8

const HEATMAP_START = Date.UTC(2026, 6, 20) // Monday, July 20
const DAY_MS = 86_400_000
// Weekday deploy counts that repeat with a slow drift; weekends stay quiet.
const weekdayCounts = [3, 5, 2, 6, 4, 1, 7, 2, 5, 3, 0, 4, 6, 2, 8, 3, 5]

export const heatmap = Array.from({ length: 16 * 7 }, (_, i) => {
  const week = Math.floor(i / 7)
  const day = i % 7
  const weekend = day >= 5
  const base = weekdayCounts[(week * 3 + day * 2) % weekdayCounts.length] ?? 0
  return {
    date: new Date(HEATMAP_START + i * DAY_MS).toISOString().slice(0, 10),
    count: weekend ? Math.floor(base / 4) : base + (week % 4 === 3 ? 2 : 0),
  }
})
