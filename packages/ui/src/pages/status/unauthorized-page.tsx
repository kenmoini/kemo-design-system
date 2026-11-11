import { StatusLayout } from './status-layout'
import { mergeActions, statusCopy, withDefaults } from './status-copy'
import type { StatusPageProps } from './types'

const copy = statusCopy['401']

export function UnauthorizedPage(props: StatusPageProps) {
  return (
    <StatusLayout
      {...withDefaults(copy, props)}
      actions={mergeActions(copy.actions, props.actions)}
    />
  )
}
