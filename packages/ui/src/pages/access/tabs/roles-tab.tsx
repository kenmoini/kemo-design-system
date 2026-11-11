'use client'
import { BuiltInName, StatusBadge, statusOptions } from '../cells'
import {
  cloneAction,
  createEntityTab,
  deleteAction,
  editAction,
  statusActions,
} from '../entity-tab'
import { RoleForm } from '../forms/role-form'
import type { RoleValues } from '../schemas'
import type { AccessPermission, AccessRole, EntityTabProps } from '../types'

export interface AccessRolesTabOwnProps {
  /** Every permission, for the form's grouped checkbox list. */
  permissions: AccessPermission[]
}

export type AccessRolesTabProps = EntityTabProps<AccessRole, RoleValues> & AccessRolesTabOwnProps

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/**
 * The Roles tab: name (with a "Built-in" badge), description, permission and member counts and
 * status, with Status and Built-in filters. Built-in roles can be edited and cloned but not
 * disabled or deleted, per row or in bulk (bulk Disable and Delete skip them and say so).
 */
export const AccessRolesTab = createEntityTab<AccessRole, RoleValues, AccessRolesTabOwnProps>({
  entity: { singular: 'role', plural: 'roles' },
  columns: [
    {
      id: 'name',
      header: 'Name',
      accessor: (role) => role.name,
      cell: (role) => <BuiltInName name={role.name} builtIn={role.builtIn} />,
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (role) => role.description ?? '',
      sortable: false,
    },
    {
      id: 'permissions',
      header: 'Permissions',
      accessor: (role) => role.permissions.length,
      align: 'end',
    },
    { id: 'members', header: 'Members', accessor: (role) => role.members, align: 'end' },
    {
      id: 'status',
      header: 'Status',
      accessor: (role) => role.status,
      cell: (role) => <StatusBadge status={role.status} />,
    },
  ],
  filters: [
    {
      id: 'status',
      label: 'Status',
      kind: 'checkbox',
      accessor: (role) => role.status,
      options: statusOptions,
    },
    {
      id: 'builtIn',
      label: 'Built-in',
      kind: 'checkbox',
      accessor: (role) => (role.builtIn ? 'Built-in' : 'Custom'),
      options: [
        { value: 'Built-in', label: 'Built-in' },
        { value: 'Custom', label: 'Custom' },
      ],
    },
  ],
  search: { keys: [(role) => role.name, (role) => role.description ?? ''] },
  initialSort: { id: 'name' },
  toValues: (role) => ({
    name: role.name,
    description: role.description ?? '',
    permissions: role.permissions,
  }),
  renderForm: (form, { permissions }) => <RoleForm {...form} permissions={permissions} />,
  rowActions: (ctx, role) =>
    role.builtIn
      ? [editAction(ctx, role), cloneAction(ctx, role)]
      : [
          editAction(ctx, role),
          cloneAction(ctx, role),
          ...statusActions(ctx, role),
          deleteAction(ctx, role),
        ],
  bulkActions: (ctx, selected) => {
    const { onSetStatus } = ctx.props
    const custom = selected.filter((role) => !role.builtIn)
    const customIds = custom.map((role) => role.id)
    const skipped = selected.length - custom.length
    const actions = []
    if (onSetStatus) {
      actions.push(
        {
          id: 'enable',
          label: 'Enable',
          disabled: custom.every((role) => role.status === 'active'),
          onSelect: () => onSetStatus(customIds, 'active'),
        },
        {
          id: 'disable',
          label: 'Disable',
          disabled: custom.every((role) => role.status === 'disabled'),
          onSelect: () => {
            if (skipped === 0) {
              onSetStatus(customIds, 'disabled')
              return
            }
            ctx.confirm({
              title: `Disable ${ctx.count(selected.length)}?`,
              description: `${ctx.count(selected.length)} selected; ${plural(skipped, 'built-in role', 'built-in roles')} will be skipped.`,
              confirmLabel: 'Disable',
              tone: 'default',
              onConfirm: () => {
                onSetStatus(customIds, 'disabled')
                ctx.deselect(customIds)
              },
            })
          },
        },
      )
    }
    actions.push({
      id: 'delete',
      label: 'Delete',
      tone: 'danger' as const,
      disabled: custom.length === 0,
      onSelect: () =>
        ctx.confirmDelete(
          customIds,
          skipped > 0
            ? {
                title: `Delete ${ctx.count(selected.length)}?`,
                description: `${ctx.count(selected.length)} selected; ${plural(skipped, 'built-in role', 'built-in roles')} will be skipped. This can't be undone.`,
              }
            : undefined,
        ),
    })
    return actions
  },
})
