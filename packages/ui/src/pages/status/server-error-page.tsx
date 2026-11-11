import { StatusLayout } from './status-layout'
import { mergeActions, statusCopy, withDefaults } from './status-copy'
import type { StatusPageProps } from './types'

const copy = statusCopy['500']

export function ServerErrorPage(props: StatusPageProps) {
  return (
    <StatusLayout
      {...withDefaults(copy, props)}
      actions={mergeActions(copy.actions, props.actions)}
    />
  )
}
