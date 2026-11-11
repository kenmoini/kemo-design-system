import type { StatusAction, StatusPageProps } from '@kemo/ui'

// Static props for the preview's status pages (`/maintenance`, `/errors/*`, and the real
// `not-found` and `error` boundaries). Actions are merged into each page's defaults by label: the
// ones below get preview routes, every other default action stays inert.

export type StatusDemoPage = '401' | '403' | '404' | '500' | '503' | 'maintenance'

/** The props every status demo shares (the logo and link component are added by the demo). */
export const statusDemoProps = {
  brand: 'Kemo Console',
  requestId: '7f3a-21c9',
  version: 'Kemo Console v0.3.0',
} satisfies StatusPageProps

const toDashboard: StatusAction = { label: 'Go to dashboard', href: '/dashboard' }
const toSignIn: StatusAction = { label: 'Sign in', href: '/login' }
// The preview has no separate status site; the maintenance page stands in for it.
const toStatusPage: StatusAction = { label: 'View status page', href: '/maintenance' }

/** Per page, the default actions that link somewhere in the preview. */
export const statusDemoActions: Record<StatusDemoPage, StatusAction[]> = {
  '401': [toSignIn, toDashboard],
  '403': [toDashboard],
  '404': [toDashboard],
  '500': [toDashboard, toStatusPage],
  '503': [toStatusPage],
  maintenance: [toStatusPage],
}

/** The maintenance window shown on `/maintenance` (no auto-refresh in the preview). */
export const maintenanceWindow = { startedAt: '02:00 UTC', expectedBackAt: '03:30 UTC' }
