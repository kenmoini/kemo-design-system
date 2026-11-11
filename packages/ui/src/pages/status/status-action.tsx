'use client'
import { Button, Link } from '../../components/ui'
import type { LinkComponent } from '../auth/types'
import type { StatusAction } from './types'

export interface StatusActionButtonProps {
  action: StatusAction
  index: number
  linkComponent?: LinkComponent
}

/** One status-page action: a link when it has an `href`, else a button (inert without `onSelect`). */
export function StatusActionButton({ action, index, linkComponent }: StatusActionButtonProps) {
  const variant = action.variant ?? (index === 0 ? 'solid' : 'plain')
  if (action.href !== undefined) {
    const HostLink = linkComponent ?? Link
    return (
      <Button asChild variant={variant}>
        <HostLink href={action.href}>{action.label}</HostLink>
      </Button>
    )
  }
  return (
    <Button type="button" variant={variant} onClick={action.onSelect}>
      {action.label}
    </Button>
  )
}
