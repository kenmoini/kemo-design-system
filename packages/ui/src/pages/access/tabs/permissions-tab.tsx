'use client'
import { useMemo } from 'react'
import { Badge } from '../../../components/ui'
import type { DataTableFilter } from '../../../widgets'
import { MonoText } from '../cells'
import { createEntityTab, deleteAction, editAction } from '../entity-tab'
import { PermissionForm } from '../forms/permission-form'
import { type PermissionValues, permissionActions } from '../schemas'
import type { AccessPermission, EntityTabProps } from '../types'

export interface AccessPermissionsTabOwnProps {
  /** The resources a permission can belong to: the form's Resource select and the filter. */
  resources: string[]
}

export type AccessPermissionsTabProps = EntityTabProps<AccessPermission, PermissionValues> &
  AccessPermissionsTabOwnProps

const actionOptions = permissionActions.map((action) => ({ value: action, label: action }))

function permissionFilters(resources: string[]): DataTableFilter<AccessPermission>[] {
  return [
    {
      id: 'resource',
      label: 'Resource',
      kind: 'checkbox',
      accessor: (permission) => permission.resource,
      options: resources.map((resource) => ({ value: resource, label: resource })),
    },
    {
      id: 'action',
      label: 'Action',
      kind: 'checkbox',
      accessor: (permission) => permission.action,
      options: actionOptions,
    },
  ]
}

const PermissionsTable = createEntityTab<
  AccessPermission,
  PermissionValues,
  AccessPermissionsTabOwnProps
>({
  entity: { singular: 'permission', plural: 'permissions' },
  columns: [
    {
      id: 'name',
      header: 'Name',
      accessor: (permission) => permission.name,
      cell: (permission) => <MonoText>{permission.name}</MonoText>,
    },
    { id: 'resource', header: 'Resource', accessor: (permission) => permission.resource },
    {
      id: 'action',
      header: 'Action',
      accessor: (permission) => permission.action,
      cell: (permission) => (
        <Badge variant="outline" colorPalette="gray">
          {permission.action}
        </Badge>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      accessor: (permission) => permission.description ?? '',
      sortable: false,
    },
    {
      id: 'roles',
      header: 'Roles',
      accessor: (permission) => permission.roles,
      align: 'end',
    },
  ],
  search: { keys: [(permission) => permission.name, (permission) => permission.description ?? ''] },
  initialSort: { id: 'name' },
  toValues: (permission) => ({
    name: permission.name,
    resource: permission.resource,
    action: permission.action,
    description: permission.description ?? '',
  }),
  renderForm: (form, { resources }) => <PermissionForm {...form} resources={resources} />,
  rowActions: (ctx, permission) => [editAction(ctx, permission), deleteAction(ctx, permission)],
  bulkActions: (ctx, selected) => [
    {
      id: 'delete',
      label: 'Delete',
      tone: 'danger',
      onSelect: () => ctx.confirmDelete(selected.map((permission) => permission.id)),
    },
  ],
})

/**
 * The Permissions tab: `resource.action` name, resource, action, description and the number of
 * roles using it, with Resource and Action filters; Edit and Delete per row, Delete for the
 * selection. Permissions have no status and are not cloned.
 */
export function AccessPermissionsTab(props: AccessPermissionsTabProps) {
  const filters = useMemo(() => permissionFilters(props.resources), [props.resources])
  return <PermissionsTable {...props} filters={filters} />
}
