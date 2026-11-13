'use client'
import type { ReactNode } from 'react'
import { Badge } from '../../../components/ui'
import { DateTimeText, MonoText, NameCell, StatusBadge, statusOptions } from '../cells'
import {
  bulkDeleteAction,
  bulkStatusActions,
  createEntityTab,
  deleteAction,
  editAction,
  statusActions,
} from '../entity-tab'
import { OAuthAppForm, oauthTypeOptions } from '../forms/oauth-app-form'
import type { OAuthAppValues } from '../schemas'
import type { EntityTabProps, OAuthApp, Option } from '../types'

export interface AccessOAuthAppsTabOwnProps {
  /** The scopes an app can be granted: the form's checkbox list. */
  scopes: Option[]
  /** "Rotate secret" on a row; the host issues the new secret. */
  onRotateSecret: (id: string) => void
}

export type AccessOAuthAppsTabProps = EntityTabProps<OAuthApp, OAuthAppValues> &
  AccessOAuthAppsTabOwnProps

const typeLabels = new Map(oauthTypeOptions.map((option) => [option.value, option.label]))

/**
 * The OAuth apps tab: name with its client id, type, owner, scope count, creation date and status,
 * with Status and Type filters; Add, Edit, "Rotate secret", Disable/Enable and Delete per row;
 * Enable, Disable and Delete for the selection.
 */
export const AccessOAuthAppsTab: (props: AccessOAuthAppsTabProps) => ReactNode = createEntityTab<
  OAuthApp,
  OAuthAppValues,
  AccessOAuthAppsTabOwnProps
>({
  entity: { singular: 'OAuth app', plural: 'OAuth apps' },
  columns: [
    {
      id: 'name',
      header: 'Name',
      accessor: (app) => app.name,
      cell: (app) => <NameCell name={app.name} detail={<MonoText>{app.clientId}</MonoText>} />,
    },
    {
      id: 'type',
      header: 'Type',
      accessor: (app) => app.type,
      cell: (app) => (
        <Badge variant="outline" colorPalette="gray">
          {typeLabels.get(app.type) ?? app.type}
        </Badge>
      ),
    },
    { id: 'owner', header: 'Owner', accessor: (app) => app.owner },
    { id: 'scopes', header: 'Scopes', accessor: (app) => app.scopes.length, align: 'end' },
    {
      id: 'createdAt',
      header: 'Created',
      accessor: (app) => app.createdAt,
      cell: (app) => <DateTimeText value={app.createdAt} />,
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (app) => app.status,
      cell: (app) => <StatusBadge status={app.status} />,
    },
  ],
  filters: [
    {
      id: 'status',
      label: 'Status',
      kind: 'checkbox',
      accessor: (app) => app.status,
      options: statusOptions,
    },
    {
      id: 'type',
      label: 'Type',
      kind: 'checkbox',
      accessor: (app) => app.type,
      options: oauthTypeOptions,
    },
  ],
  search: { keys: [(app) => app.name, (app) => app.clientId, (app) => app.owner] },
  initialSort: { id: 'name' },
  toValues: (app) => ({
    name: app.name,
    type: app.type,
    redirectUris: app.redirectUris,
    scopes: app.scopes,
    description: app.description ?? '',
  }),
  renderForm: (form, { scopes }) => <OAuthAppForm {...form} scopes={scopes} />,
  rowActions: (ctx, app) => [
    editAction(ctx, app),
    {
      id: 'rotate-secret',
      label: 'Rotate secret',
      onSelect: () => ctx.props.onRotateSecret(app.id),
    },
    ...statusActions(ctx, app),
    deleteAction(ctx, app),
  ],
  bulkActions: (ctx, selected) => [
    ...bulkStatusActions(ctx, selected),
    bulkDeleteAction(ctx, selected),
  ],
})
