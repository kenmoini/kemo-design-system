import { StatusLayout } from './status-layout'
import { mergeActions, statusCopy, withDefaults } from './status-copy'
import type { StatusPageProps } from './types'

const copy = statusCopy.maintenance

export interface MaintenancePageProps extends StatusPageProps {
  /** Already-formatted start time, shown as "Started". */
  startedAt?: string
  /** Already-formatted end time, shown as "Expected back". */
  expectedBackAt?: string
}

export function MaintenancePage({ startedAt, expectedBackAt, ...props }: MaintenancePageProps) {
  const merged = withDefaults(copy, props)
  const meta =
    merged.meta ??
    [
      startedAt ? { label: 'Started', value: startedAt } : null,
      expectedBackAt ? { label: 'Expected back', value: expectedBackAt } : null,
    ].filter((item) => item !== null)
  return (
    <StatusLayout
      {...merged}
      meta={meta}
      footerNote={
        merged.footerNote ??
        (merged.refreshIntervalMs ? 'This page refreshes itself every minute' : undefined)
      }
      actions={mergeActions(copy.actions, props.actions)}
    />
  )
}
