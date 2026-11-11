'use client'
import { useMemo } from 'react'
import type { DataTableColumn, DataTableFilter } from '../../../widgets'
import { DateTimeText, NameCell, optionLabel, StatusBadge, statusOptions } from '../cells'
import {
  bulkDeleteAction,
  bulkStatusActions,
  createEntityTab,
  deleteAction,
  editAction,
  statusActions,
} from '../entity-tab'
import { ServiceAccountForm } from '../forms/service-account-form'
import { type ServiceAccountValues, serviceAccountDefaults } from '../schemas'
import type { EntityTabProps, Option, ServiceAccount } from '../types'

export interface AccessServiceAccountsTabOwnProps {
  /** Role options: labels for `ServiceAccount.role` ids, the Role filter and the form's Role select. */
  roles: Option[]
  /** "Rotate token" on a row; the host issues the new token (the tab does not show it). */
  onRotateToken: (id: string) => void
}

export type AccessServiceAccountsTabProps = EntityTabProps<ServiceAccount, ServiceAccountValues> &
  AccessServiceAccountsTabOwnProps

function serviceAccountColumns(roles: Option[]): DataTableColumn<ServiceAccount>[] {
  const roleLabel = optionLabel(roles)
  return [
    {
      id: 'name',
      header: 'Name',
      accessor: (account) => account.name,
      cell: (account) => <NameCell name={account.name} detail={account.description} />,
    },
    { id: 'role', header: 'Role', accessor: (account) => roleLabel(account.role) },
    {
      id: 'tokenExpiresAt',
      header: 'Token expires',
      accessor: (account) => account.tokenExpiresAt,
      cell: (account) => <DateTimeText value={account.tokenExpiresAt} />,
    },
    {
      id: 'lastUsedAt',
      header: 'Last used',
      accessor: (account) => account.lastUsedAt,
      cell: (account) => <DateTimeText value={account.lastUsedAt} fallback="Never" />,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (account) => account.status,
      cell: (account) => <StatusBadge status={account.status} />,
    },
  ]
}

function serviceAccountFilters(roles: Option[]): DataTableFilter<ServiceAccount>[] {
  return [
    {
      id: 'status',
      label: 'Status',
      kind: 'checkbox',
      accessor: (account) => account.status,
      options: statusOptions,
    },
    {
      id: 'role',
      label: 'Role',
      kind: 'select',
      accessor: (account) => account.role,
      options: roles,
      allLabel: 'All roles',
    },
  ]
}

const ServiceAccountsTable = createEntityTab<
  ServiceAccount,
  ServiceAccountValues,
  AccessServiceAccountsTabOwnProps
>({
  entity: { singular: 'service account', plural: 'service accounts' },
  search: { keys: [(account) => account.name, (account) => account.description ?? ''] },
  initialSort: { id: 'name' },
  /**
   * The token lifetime is form-only (hosts map it to `tokenExpiresAt` themselves), so Edit and
   * Clone pre-fill it with the default.
   */
  toValues: (account) => ({
    name: account.name,
    description: account.description ?? '',
    role: account.role,
    tokenLifetimeDays: serviceAccountDefaults.tokenLifetimeDays,
  }),
  renderForm: (form, { roles }) => <ServiceAccountForm {...form} roles={roles} />,
  rowActions: (ctx, account) => [
    editAction(ctx, account),
    {
      id: 'rotate-token',
      label: 'Rotate token',
      onSelect: () => ctx.props.onRotateToken(account.id),
    },
    ...statusActions(ctx, account),
    deleteAction(ctx, account),
  ],
  bulkActions: (ctx, selected) => [
    ...bulkStatusActions(ctx, selected),
    bulkDeleteAction(ctx, selected),
  ],
})

/**
 * The Service accounts tab: name and description, role, token expiry, last use and status, with
 * Status and Role filters; Add, Edit, "Rotate token", Disable/Enable and Delete per row; Enable,
 * Disable and Delete for the selection.
 */
export function AccessServiceAccountsTab(props: AccessServiceAccountsTabProps) {
  const columns = useMemo(() => serviceAccountColumns(props.roles), [props.roles])
  const filters = useMemo(() => serviceAccountFilters(props.roles), [props.roles])
  return <ServiceAccountsTable {...props} columns={columns} filters={filters} />
}
