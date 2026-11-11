import type { ReactNode } from 'react'
import type { LinkComponent } from '../auth/types'

/**
 * How serious the status is; drives the small dot before the label. Named `StatusPageTone` because
 * `StatusTone` is already exported by the dashboard widgets.
 */
export type StatusPageTone = 'neutral' | 'warning' | 'critical'

/** One button under a status page's message: a link (`href`), a callback (`onSelect`) or inert. */
export interface StatusAction {
  label: string
  href?: string
  onSelect?: () => void
  /** Defaults to `solid` for the first action and `plain` for the rest. */
  variant?: 'solid' | 'outline' | 'plain'
}

export interface StatusLayoutProps {
  /** "404"; omitted for Maintenance. */
  code?: string | number
  /** "Not found". */
  label: string
  /** The page's h1. */
  title: string
  description?: ReactNode
  /** Default `neutral`. */
  tone?: StatusPageTone
  /** The large decorative text; defaults to `String(code)`. */
  watermark?: string
  meta?: { label: string; value: string }[]
  actions?: StatusAction[]
  requestId?: string
  version?: string
  /** Replaces the request id slot in the footer. */
  footerNote?: ReactNode
  logo?: ReactNode
  brand?: ReactNode
  linkComponent?: LinkComponent
  /** When set, `onRefresh` (or `window.location.reload`) is called on this interval. */
  refreshIntervalMs?: number
  onRefresh?: () => void
}

/** Props accepted by every named status page: any layout prop overrides the pinned copy. */
export type StatusPageProps = Partial<StatusLayoutProps>
