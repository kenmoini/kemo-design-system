'use client'
import { useMemo } from 'react'
import type { DataTableColumn, DataTableFilter } from '../../../widgets'
import {
  DateTimeText,
  NameCell,
  optionLabel,
  SourceBadge,
  sourceOptions,
  StatusBadge,
  statusOptions,
} from '../cells'
import {
  bulkDeleteAction,
  bulkStatusActions,
  cloneAction,
  createEntityTab,
  deleteAction,
  editAction,
  statusActions,
} from '../entity-tab'
import { UserForm } from '../forms/user-form'
import { type UserValues, userDefaults } from '../schemas'
import type { AccessUser, EntityTabProps, Option } from '../types'

export interface AccessUsersTabOwnProps {
  /** Role options: labels for `AccessUser.role` ids, the Role filter and the form's Role select. */
  roles: Option[]
  /** Group options for the form and "Add to group…". */
  groups: Option[]
  /** Bulk "Add to group…"; a rejection keeps the dialog open with its message. */
  onAddToGroup: (ids: string[], groupId: string) => void | Promise<void>
  /** Bulk "Assign role…"; a rejection keeps the dialog open with its message. */
  onAssignRole: (ids: string[], roleId: string) => void | Promise<void>
}

export type AccessUsersTabProps = EntityTabProps<AccessUser, UserValues> & AccessUsersTabOwnProps

function userColumns(roles: Option[]): DataTableColumn<AccessUser>[] {
  const roleLabel = optionLabel(roles)
  return [
    {
      id: 'name',
      header: 'Name',
      accessor: (user) => user.name,
      cell: (user) => <NameCell name={user.name} detail={user.email} />,
    },
    { id: 'role', header: 'Role', accessor: (user) => roleLabel(user.role) },
    {
      id: 'source',
      header: 'Source',
      accessor: (user) => user.source,
      cell: (user) => <SourceBadge source={user.source} />,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (user) => user.status,
      cell: (user) => <StatusBadge status={user.status} />,
    },
    {
      id: 'lastSignIn',
      header: 'Last sign-in',
      accessor: (user) => user.lastSignInAt,
      cell: (user) => <DateTimeText value={user.lastSignInAt} fallback="Never" />,
    },
  ]
}

function userFilters(roles: Option[]): DataTableFilter<AccessUser>[] {
  return [
    {
      id: 'status',
      label: 'Status',
      kind: 'checkbox',
      accessor: (user) => user.status,
      options: statusOptions,
    },
    {
      id: 'source',
      label: 'Source',
      kind: 'checkbox',
      accessor: (user) => user.source,
      options: sourceOptions,
    },
    {
      id: 'role',
      label: 'Role',
      kind: 'select',
      accessor: (user) => user.role,
      options: roles,
      allLabel: 'All roles',
    },
  ]
}

const UsersTable = createEntityTab<AccessUser, UserValues, AccessUsersTabOwnProps>({
  entity: { singular: 'user', plural: 'users' },
  search: { keys: [(user) => user.name, (user) => user.email] },
  initialSort: { id: 'name' },
  copy: { addDescription: "They'll get an email with a link to set a password." },
  toValues: (user) => ({
    name: user.name,
    email: user.email,
    role: user.role,
    source: user.source,
    groups: user.groups,
    sendInvite: false,
  }),
  // A clone is a new user: invite them as Add would.
  cloneDefaults: { sendInvite: userDefaults.sendInvite },
  renderForm: (form, { roles, groups }) => <UserForm {...form} roles={roles} groups={groups} />,
  rowActions: (ctx, user) => [
    editAction(ctx, user),
    cloneAction(ctx, user),
    ...statusActions(ctx, user),
    deleteAction(ctx, user),
  ],
  bulkActions: (ctx, selected) => {
    const ids = selected.map((user) => user.id)
    const { groups, roles, onAddToGroup, onAssignRole } = ctx.props
    return [
      ...bulkStatusActions(ctx, selected),
      {
        id: 'add-to-group',
        label: 'Add to group…',
        onSelect: () =>
          ctx.openPicker({
            title: `Add ${ctx.count(ids.length)} to a group`,
            label: 'Group',
            options: groups,
            submitLabel: 'Add to group',
            onApply: (groupId) => onAddToGroup(ids, groupId),
          }),
      },
      {
        id: 'assign-role',
        label: 'Assign role…',
        onSelect: () =>
          ctx.openPicker({
            title: `Assign a role to ${ctx.count(ids.length)}`,
            label: 'Role',
            options: roles,
            submitLabel: 'Assign role',
            onApply: (roleId) => onAssignRole(ids, roleId),
          }),
      },
      bulkDeleteAction(ctx, selected),
    ]
  },
})

/**
 * The Users tab: name and email, role, source, status and last sign-in, with Status, Source and
 * Role filters; Add, Edit, Clone, Disable/Enable and Delete per row; Enable, Disable, "Add to
 * group…", "Assign role…" and Delete for the selection.
 */
export function AccessUsersTab(props: AccessUsersTabProps) {
  const columns = useMemo(() => userColumns(props.roles), [props.roles])
  const filters = useMemo(() => userFilters(props.roles), [props.roles])
  return <UsersTable {...props} columns={columns} filters={filters} />
}
