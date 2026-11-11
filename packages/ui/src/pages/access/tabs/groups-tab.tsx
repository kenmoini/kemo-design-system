'use client'
import { useMemo } from 'react'
import type { DataTableColumn } from '../../../widgets'
import {
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
import { GroupForm } from '../forms/group-form'
import { type GroupValues } from '../schemas'
import type { AccessGroup, EntityTabProps, Option } from '../types'

export interface AccessGroupsTabOwnProps {
  /** Role options: labels for `AccessGroup.roles` ids, the form's Roles select and "Assign role…". */
  roles: Option[]
  /** Bulk "Assign role…"; a rejection keeps the dialog open with its message. */
  onAssignRole: (ids: string[], roleId: string) => void | Promise<void>
}

export type AccessGroupsTabProps = EntityTabProps<AccessGroup, GroupValues> &
  AccessGroupsTabOwnProps

function groupColumns(roles: Option[]): DataTableColumn<AccessGroup>[] {
  const roleLabel = optionLabel(roles)
  return [
    {
      id: 'name',
      header: 'Name',
      accessor: (group) => group.name,
      cell: (group) => <NameCell name={group.name} detail={group.description} />,
    },
    { id: 'members', header: 'Members', accessor: (group) => group.members, align: 'end' },
    {
      id: 'roles',
      header: 'Roles',
      accessor: (group) => group.roles.map(roleLabel).join(', '),
    },
    {
      id: 'source',
      header: 'Source',
      accessor: (group) => group.source,
      cell: (group) => <SourceBadge source={group.source} />,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (group) => group.status,
      cell: (group) => <StatusBadge status={group.status} />,
    },
  ]
}

const GroupsTable = createEntityTab<AccessGroup, GroupValues, AccessGroupsTabOwnProps>({
  entity: { singular: 'group', plural: 'groups' },
  filters: [
    {
      id: 'status',
      label: 'Status',
      kind: 'checkbox',
      accessor: (group) => group.status,
      options: statusOptions,
    },
    {
      id: 'source',
      label: 'Source',
      kind: 'checkbox',
      accessor: (group) => group.source,
      options: sourceOptions,
    },
  ],
  search: { keys: [(group) => group.name, (group) => group.description ?? ''] },
  initialSort: { id: 'name' },
  toValues: (group) => ({
    name: group.name,
    description: group.description ?? '',
    roles: group.roles,
  }),
  renderForm: (form, { roles }) => <GroupForm {...form} roles={roles} />,
  rowActions: (ctx, group) => [
    editAction(ctx, group),
    cloneAction(ctx, group),
    ...statusActions(ctx, group),
    deleteAction(ctx, group),
  ],
  bulkActions: (ctx, selected) => {
    const ids = selected.map((group) => group.id)
    const { roles, onAssignRole } = ctx.props
    return [
      ...bulkStatusActions(ctx, selected),
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
 * The Groups tab: name and description, members, roles, source and status, with Status and Source
 * filters; Add, Edit, Clone, Disable/Enable and Delete per row; Enable, Disable, "Assign role…" and
 * Delete for the selection.
 */
export function AccessGroupsTab(props: AccessGroupsTabProps) {
  const columns = useMemo(() => groupColumns(props.roles), [props.roles])
  return <GroupsTable {...props} columns={columns} />
}
