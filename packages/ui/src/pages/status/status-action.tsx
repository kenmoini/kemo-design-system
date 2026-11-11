'use client'
import { Button } from '../../components/ui'
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
    // Without a host link, a bare anchor: Park's `Link` would add its own recipe classes, which
    // override the button's (underline, radius, weight).
    const HostLink = linkComponent
    return (
      <Button asChild variant={variant}>
        {HostLink ? (
          <HostLink href={action.href}>{action.label}</HostLink>
        ) : (
          <a href={action.href}>{action.label}</a>
        )}
      </Button>
    )
  }
  return (
    <Button type="button" variant={variant} onClick={action.onSelect}>
      {action.label}
    </Button>
  )
}
