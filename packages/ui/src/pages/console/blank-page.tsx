import { Stack } from '../../../styled-system/jsx'
import { Button, Link } from '../../components/ui'
import { PageHeader } from '../../layouts/app-shell'
import { EmptyState } from '../../widgets'
import type { BlankPageProps } from './types'

/**
 * The starter for a new console screen inside an `AppShell`: a `PageHeader`, then the host's
 * `children` or, when there are none, a dashed `EmptyState` area to replace.
 */
export function BlankPage({
  title,
  context,
  action,
  emptyMessage,
  emptyAction,
  children,
  linkComponent,
}: BlankPageProps) {
  const HostLink = linkComponent ?? Link
  return (
    <Stack gap="6">
      <PageHeader
        title={title}
        context={context}
        actions={
          action &&
          (action.href !== undefined ? (
            <Button asChild variant="solid">
              <HostLink href={action.href}>{action.label}</HostLink>
            </Button>
          ) : (
            <Button variant="solid" onClick={action.onSelect}>
              {action.label}
            </Button>
          ))
        }
      />
      {children ?? (
        <EmptyState
          message={emptyMessage ?? 'Nothing here yet. Replace this area with your content.'}
          action={emptyAction}
          minH="60"
        />
      )}
    </Stack>
  )
}
