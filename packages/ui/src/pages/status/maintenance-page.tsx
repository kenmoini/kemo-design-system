import { StatusLayout } from './status-layout'
import { mergeActions, statusCopy } from './status-copy'
import type { StatusPageProps } from './types'

const copy = statusCopy.maintenance

export interface MaintenancePageProps extends StatusPageProps {
  /** Already-formatted start time, shown as "Started". */
  startedAt?: string
  /** Already-formatted end time, shown as "Expected back". */
  expectedBackAt?: string
}

export function MaintenancePage({ startedAt, expectedBackAt, ...props }: MaintenancePageProps) {
  const meta =
    props.meta ??
    [
      startedAt ? { label: 'Started', value: startedAt } : null,
      expectedBackAt ? { label: 'Expected back', value: expectedBackAt } : null,
    ].filter((item) => item !== null)
  return (
    <StatusLayout
      {...copy}
      {...props}
      meta={meta}
      footerNote={
        props.footerNote ??
        (props.refreshIntervalMs ? 'This page refreshes itself every minute' : undefined)
      }
      actions={mergeActions(copy.actions, props.actions)}
    />
  )
}
