import type { StatusAction, StatusPageTone } from './types'

export interface StatusCopy {
  code?: number
  label: string
  title: string
  description: string
  tone: StatusPageTone
  watermark?: string
  actions: StatusAction[]
}

/** The pinned default copy for each named status page. Every string is overridable by prop. */
export const statusCopy = {
  '401': {
    code: 401,
    label: 'Sign in required',
    title: 'You need to sign in to see this.',
    description:
      "Your session may have expired. Sign in again and we'll bring you back to this page.",
    tone: 'neutral',
    actions: [
      { label: 'Sign in', variant: 'solid' },
      { label: 'Go to dashboard', variant: 'plain' },
    ],
  },
  '403': {
    code: 403,
    label: 'No access',
    title: "You don't have access to this page.",
    description: 'Ask an admin for access, or switch to an account that has it.',
    tone: 'neutral',
    actions: [
      { label: 'Request access', variant: 'solid' },
      { label: 'Go to dashboard', variant: 'plain' },
    ],
  },
  '404': {
    code: 404,
    label: 'Not found',
    title: "There's nothing at this address.",
    description:
      'It may have been moved or removed. If you followed a link from inside the console, let us know.',
    tone: 'neutral',
    actions: [
      { label: 'Go to dashboard', variant: 'solid' },
      { label: 'Go back', variant: 'outline' },
    ],
  },
  '500': {
    code: 500,
    label: 'Server error',
    title: 'Something went wrong on our side.',
    description:
      "The request couldn't be completed. It's been logged with the id below; trying again usually works.",
    tone: 'critical',
    actions: [
      { label: 'Try again', variant: 'solid' },
      { label: 'Go to dashboard', variant: 'outline' },
      { label: 'View status page', variant: 'plain' },
    ],
  },
  '503': {
    code: 503,
    label: 'Unavailable',
    title: "We're temporarily unavailable.",
    description: "We're over capacity or restarting. Give it a minute and try again.",
    tone: 'critical',
    actions: [
      { label: 'Try again', variant: 'solid' },
      { label: 'View status page', variant: 'plain' },
    ],
  },
  maintenance: {
    label: 'Scheduled maintenance',
    title: "We're making improvements.",
    description:
      'The console is offline while we upgrade the database. Deployments already in progress will finish.',
    tone: 'warning',
    watermark: 'Back soon',
    actions: [
      { label: 'View status page', variant: 'solid' },
      { label: 'Subscribe to updates', variant: 'plain' },
    ],
  },
} as const satisfies Record<string, StatusCopy>

/**
 * Merges host actions into the defaults by label: a match replaces the default in place (keeping its
 * variant unless the override sets one) and unmatched overrides are appended in order.
 */
export function mergeActions(
  defaults: readonly StatusAction[],
  overrides?: readonly StatusAction[],
): StatusAction[] {
  if (!overrides) return defaults as StatusAction[]
  const merged = defaults.map((action) => {
    const override = overrides.find((o) => o.label === action.label)
    return override ? { ...action, ...override } : action
  })
  const known = new Set(defaults.map((d) => d.label))
  return [...merged, ...overrides.filter((o) => !known.has(o.label))]
}
