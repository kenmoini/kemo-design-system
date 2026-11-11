import { StatusLayout } from './status-layout'
import { mergeActions, statusCopy } from './status-copy'
import type { StatusPageProps } from './types'

const copy = statusCopy['503']

export function UnavailablePage(props: StatusPageProps) {
  return <StatusLayout {...copy} {...props} actions={mergeActions(copy.actions, props.actions)} />
}
