'use client'
import { Fragment, useRef, useState } from 'react'
import { Box } from '../../../../styled-system/jsx'
import { Badge, Button, Text } from '../../../components/ui'
import { type ActionItem, DataTable, type DataTableColumn } from '../../../widgets'
import { DateTimeText } from '../cells'
import { ConfirmDialog } from '../confirm-dialog'
import { EntityDialog } from '../entity-dialog'
import { OidcProviderForm } from '../forms/oidc-provider-form'
import {
  type OidcProviderEditValues,
  type OidcProviderValues,
  oidcProviderDefaults,
} from '../schemas'
import type { OidcProvider } from '../types'

export interface AccessOidcProps {
  providers: OidcProvider[]
  /** "Add provider": resolve to close the dialog; a rejection keeps it open with the message. */
  onCreate: (values: OidcProviderValues) => void | Promise<void>
  /** "Edit": `clientSecret` is present only when a new one was typed; absent, keep the current
   * one. Resolve or reject as `onCreate`. */
  onUpdate: (id: string, values: OidcProviderEditValues) => void | Promise<void>
  /** "Sync now" on an enabled provider that is not syncing already. */
  onSyncNow: (id: string) => void
  onSyncAll: () => void
  /** "Disable" or "Enable". */
  onSetEnabled: (id: string, enabled: boolean) => void
  /** "Remove", after the confirmation. */
  onRemove: (id: string) => void
}

const entity = { singular: 'provider', plural: 'providers' }

const numberFormat = new Intl.NumberFormat('en')

function syncState(provider: OidcProvider): OidcProvider['sync']['state'] {
  return provider.enabled ? provider.sync.state : 'disabled'
}

/** The sync state in words, on a colour that repeats it: never colour alone. */
function SyncBadge({ provider }: { provider: OidcProvider }) {
  const { progress, message } = provider.sync
  switch (syncState(provider)) {
    case 'synced':
      return <Badge colorPalette="green">Synced</Badge>
    case 'syncing':
      return (
        <Badge colorPalette="amber">
          {progress === undefined ? 'Syncing' : `Syncing · ${Math.round(progress)}%`}
        </Badge>
      )
    case 'error':
      return <Badge colorPalette="red">{message ? `Error · ${message}` : 'Error'}</Badge>
    default:
      return <Badge colorPalette="gray">Disabled</Badge>
  }
}

const columns: DataTableColumn<OidcProvider>[] = [
  {
    id: 'name',
    header: 'Provider',
    accessor: (provider) => provider.name,
    cell: (provider) => (
      <Text as="span" color="fg.default" fontWeight="semibold">
        {provider.name}
      </Text>
    ),
  },
  { id: 'issuer', header: 'Issuer', accessor: (provider) => provider.issuer },
  {
    id: 'users',
    header: 'Users',
    align: 'end',
    accessor: (provider) => provider.users,
    cell: (provider) => numberFormat.format(provider.users),
  },
  {
    id: 'groupsMapped',
    header: 'Groups mapped',
    align: 'end',
    accessor: (provider) => provider.groupsMapped,
    cell: (provider) => numberFormat.format(provider.groupsMapped),
  },
  {
    id: 'sync',
    header: 'Sync',
    accessor: syncState,
    cell: (provider) => <SyncBadge provider={provider} />,
  },
  {
    id: 'lastSyncAt',
    header: 'Last sync',
    accessor: (provider) => provider.lastSyncAt ?? '',
    cell: (provider) =>
      syncState(provider) === 'syncing' ? (
        <Text as="span" color="fg.muted">
          running
        </Text>
      ) : (
        <DateTimeText value={provider.lastSyncAt} fallback="Never" />
      ),
  },
]

/** A provider as form values for Edit: the secret starts blank (blank keeps the current one). */
function toValues(provider: OidcProvider): OidcProviderValues {
  return {
    name: provider.name,
    issuer: provider.issuer,
    clientId: provider.clientId ?? '',
    clientSecret: '',
    scopes: provider.scopes ?? oidcProviderDefaults.scopes,
    groupClaim: provider.groupClaim ?? oidcProviderDefaults.groupClaim,
    autoCreateUsers: provider.autoCreateUsers ?? oidcProviderDefaults.autoCreateUsers,
  }
}

type View =
  | { kind: 'add' }
  | { kind: 'edit'; provider: OidcProvider }
  | { kind: 'remove'; provider: OidcProvider }

interface DialogState {
  open: boolean
  /** Kept after closing, so the dialog keeps its content while it animates out. */
  view: View | null
  /** Bumped on every open, so each open mounts a fresh form. */
  key: number
}

/**
 * The OIDC tab: the identity providers people sign in through, with their sync state. The toolbar
 * counts providers and synced users and offers "Sync all" and "+ Add provider"; each row offers
 * "Sync now", "Edit", "Disable"/"Enable" and "Remove" (which asks first).
 */
export function AccessOidc({
  providers,
  onCreate,
  onUpdate,
  onSyncNow,
  onSyncAll,
  onSetEnabled,
  onRemove,
}: AccessOidcProps) {
  const [dialog, setDialog] = useState<DialogState>({ open: false, view: null, key: 0 })
  const show = (view: View) => setDialog((current) => ({ open: true, view, key: current.key + 1 }))
  const close = () => setDialog((current) => ({ ...current, open: false }))
  // Closes only the dialog it was handed to: a submit that resolves after its dialog was
  // dismissed and another opened leaves the new one alone.
  const openKey = dialog.key
  const closeThis = () =>
    setDialog((current) => (current.key === openKey ? { ...current, open: false } : current))

  // A dialog hands focus back to what had it before; when that is gone (the provider just
  // removed), to the table's region rather than to the page.
  const regionRef = useRef<HTMLDivElement>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const returnFocus = () => {
    const last = lastFocusRef.current
    return last?.isConnected ? last : regionRef.current
  }

  const syncedUsers = providers.reduce((sum, provider) => sum + provider.users, 0)

  const rowActions = (provider: OidcProvider): ActionItem[] => [
    {
      id: 'sync',
      label: 'Sync now',
      disabled: syncState(provider) === 'syncing' || !provider.enabled,
      onSelect: () => onSyncNow(provider.id),
    },
    { id: 'edit', label: 'Edit', onSelect: () => show({ kind: 'edit', provider }) },
    {
      id: 'enabled',
      label: provider.enabled ? 'Disable' : 'Enable',
      onSelect: () => onSetEnabled(provider.id, !provider.enabled),
    },
    {
      id: 'remove',
      label: 'Remove',
      tone: 'danger',
      onSelect: () => show({ kind: 'remove', provider }),
    },
  ]

  const view = dialog.view
  const editing = view?.kind === 'edit' ? view.provider : undefined
  const removing = view?.kind === 'remove' ? view.provider : undefined

  return (
    <>
      <Box
        ref={regionRef}
        role="region"
        aria-label="providers table"
        tabIndex={-1}
        outline="none"
        onFocus={(event) => {
          lastFocusRef.current = event.target
        }}
      >
        <DataTable
          entity={entity}
          columns={columns}
          rows={providers}
          toolbarStart={
            <>
              <Text as="span" textStyle="sm" color="fg.muted" aria-hidden="true">
                ·
              </Text>
              <Text as="span" textStyle="sm" color="fg.muted">
                {`${numberFormat.format(syncedUsers)} synced users`}
              </Text>
            </>
          }
          toolbarEnd={
            <Button
              variant="outline"
              size="sm"
              disabled={!providers.some((provider) => provider.enabled)}
              onClick={onSyncAll}
            >
              Sync all
            </Button>
          }
          addAction={{ label: 'Add provider', onSelect: () => show({ kind: 'add' }) }}
          rowActions={rowActions}
        />
      </Box>
      <EntityDialog
        open={dialog.open && (view?.kind === 'add' || view?.kind === 'edit')}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={editing ? `Edit ${editing.name}` : 'Add provider'}
        size="lg"
        finalFocusEl={returnFocus}
      >
        <Fragment key={dialog.key}>
          {view?.kind === 'add' ? (
            <OidcProviderForm
              mode="create"
              submitLabel="Add provider"
              onSubmit={async (values) => {
                await onCreate(values)
                closeThis()
              }}
              onCancel={closeThis}
            />
          ) : editing ? (
            <OidcProviderForm
              mode="edit"
              defaultValues={toValues(editing)}
              submitLabel="Save changes"
              onSubmit={async (values) => {
                await onUpdate(editing.id, values)
                closeThis()
              }}
              onCancel={closeThis}
            />
          ) : null}
        </Fragment>
      </EntityDialog>
      <ConfirmDialog
        open={dialog.open && removing !== undefined}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={removing ? `Remove ${removing.name}?` : ''}
        description="Users who signed in through it keep their accounts but can no longer use it."
        confirmLabel="Remove"
        tone="danger"
        finalFocusEl={returnFocus}
        onConfirm={() => {
          if (removing) onRemove(removing.id)
        }}
      />
    </>
  )
}
