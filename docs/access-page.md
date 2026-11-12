# Access page and DataTable

The console's Access page, and the table every later list page starts from. Presentational like the
rest: rows and handlers come in through props, and the host keeps the state.

Screenshots: [gallery](gallery/README.md#access-page).

- `DataTable` (widget): a Park `Table` with sortable headers, a search box, checkbox and select
  filters with live counts (a rail from `lg`, a "Filters" drawer below), row selection that
  survives paging and filtering, a "Bulk actions" menu, per-row action menus, an "+ Add" button,
  pagination (10 rows a page; the pager and its range line hide when everything fits on one page)
  and a polite live region. Also `ActionMenu`, `DataTableFilters`, `DataTablePager`,
  `dataTableFeatures` and the types `DataTableProps`, `DataTableColumn`, `DataTableFilter`,
  `ActionItem` (`ActionCommandItem` with `onSelect`, `ActionLinkItem` with `href`),
  `DataTableFilterValues` and `Option`. A row or bulk action with an `href` renders as a link,
  through `linkComponent` (Next's `Link`, say) when given. Pass `filterValues` and
  `onFilterValuesChange` to own the filters' values: a record by filter id where an absent key
  means no value; reflect every change back into it, and a change by content returns to page 1.
- `AccessPage` and `accessTabs`: the header and a strip of ten tabs (Overview, Users, Groups, Roles,
  Permissions, Audit, OIDC, Service accounts, OAuth apps, Settings), each a link to its own URL;
  the strip scrolls sideways when it does not fit.
- Six object tabs on `DataTable`: `AccessUsersTab`, `AccessGroupsTab`, `AccessRolesTab`,
  `AccessPermissionsTab`, `AccessServiceAccountsTab` and `AccessOAuthAppsTab`, each with its columns,
  filters, row and bulk actions and an Add/Edit dialog.
- `AccessOverview` (stats, sign-ins, live API calls), `AccessAudit` (log forwarding form and the API
  audit stream), `AccessOidc` (identity providers and their sync state) and `AccessSettings`.
- The parts they are made of: `EntityDialog`, `ConfirmDialog`, the forms (`UserForm`, `GroupForm`,
  `RoleForm`, `PermissionForm`, `ServiceAccountForm`, `OAuthAppForm`, `OidcProviderForm`,
  `AuditForwardingForm`, `AccessSettingsForm`) with their zod schemas, defaults and `…Values` types,
  the field components (`TextField`, `SelectField`, `MultiSelectField`, `TagsField`,
  `NumberField`, …) and the entity types (`AccessUser`, `AccessGroup`, `AccessRole`,
  `AccessPermission`, `ServiceAccount`, `OAuthApp`, `OidcProvider`, `AuditEvent`, …).

The `DataTable` API, in ten lines:

```tsx
<DataTable<User>
  entity={{ singular: 'user', plural: 'users' }} // counts, labels and empty states
  rows={users} // every row needs a string `id`
  columns={[{ id: 'name', header: 'Name', accessor: (u) => u.name, cell: (u) => <b>{u.name}</b> }]}
  filters={[{ id: 'status', label: 'Status', kind: 'checkbox', accessor: (u) => u.status }]}
  search={{ keys: [(u) => u.name, (u) => u.email] }} // the "Search users" box
  rowActions={(u) => [{ id: 'edit', label: 'Edit', onSelect: () => edit(u) }]}
  bulkActions={(rows) => [{ id: 'delete', label: 'Delete', onSelect: () => remove(rows) }]}
  addAction={{ onSelect: openAdd }} // "+ Add user"
/>
```

`DataTable` keeps its state with TanStack Table v9 (`@tanstack/react-table`), which is headless: it
renders nothing, and Park's components and recipes draw every pixel. Its features are opt-in, so
`dataTableFeatures` turns on only sorting, filtering, faceting (the filter counts), selection and
pagination; column resizing, reordering and visibility, virtual rows and server-side paging are not
in it.

A host wires an object tab to its own data and calls:

```tsx
'use client'
import { type AccessUser, AccessUsersTab, type Option } from '@kemo/ui'
import { useState } from 'react'
import { api } from './api' // your client

type Props = { initial: AccessUser[]; roles: Option[]; groups: Option[] }

export function Users({ initial, roles, groups }: Props) {
  const [rows, setRows] = useState(initial)
  const replace = (user: AccessUser) =>
    setRows((current) => current.map((row) => (row.id === user.id ? user : row)))
  return (
    <AccessUsersTab
      rows={rows}
      roles={roles}
      groups={groups}
      // Resolve to close the dialog; a rejection keeps the input and shows the error's message.
      onCreate={async (values) => {
        const user = await api.createUser(values)
        setRows((current) => [...current, user])
      }}
      onUpdate={async (id, values) => replace(await api.updateUser(id, values))}
      onDelete={(ids) => setRows((current) => current.filter((row) => !ids.includes(row.id)))}
      onAddToGroup={(ids, groupId) => api.addToGroup(ids, groupId)}
      onAssignRole={(ids, roleId) => api.assignRole(ids, roleId)}
    />
  )
}
```

References are ids: `AccessUser.role` and `groups`, `AccessGroup.roles`, `AccessRole.permissions`
and `ServiceAccount.role` hold ids, and the tab looks their labels up in the `Option[]` lists it
receives (a missing option shows the raw id). Given `onSetStatus`, a tab offers Enable and Disable;
given `onClone`, "Clone" calls it, and otherwise it opens the Add dialog pre-filled with the row and
"(copy)" after the name. Form-only values (`sendInvite`, `tokenLifetimeDays`) are the host's to map.
`AccessPage` takes `activeTab`, `tabHref` (the URL of each tab) and `linkComponent`, and renders only
the active tab's content. In Next.js, render it from a layout above an optional catch-all page
(`app/access/[[...tab]]/page.tsx`): Next remounts a page when its params change, so state kept in
the page would reset on every tab switch, and focus would leave the tab that was clicked.

In the preview, `/access` and its nine tab URLs are that layout and page:
`apps/preview/src/app/access/layout.tsx` renders `AccessDemoShell` (the console frame, the tab strip
with the URL's tab current, and the state), and `apps/preview/src/app/access/[[...tab]]/page.tsx`
prerenders the ten tabs with `generateStaticParams`, answers any other path with `notFound()`, and
renders `AccessDemo` for its tab; both are in `apps/preview/src/components/access/access-demo.tsx`.
Every control works on in-memory state through `accessReducer` in
`apps/preview/src/lib/access-reducer.ts`: adding, editing, cloning, enabling, disabling and deleting
rows, adding to a group and assigning a role, rotating a token or client secret (the new value is
shown once in a dialog), syncing providers (two seconds, and Azure AD keeps failing until it gets a
new secret), saving the forwarding and access settings, and "Send test event", which fails every
third time. The mock data, generated without randomness so the server and client renders match, is
in `apps/preview/src/lib/mock-access.ts`: 231 internal and 412 OIDC users, 18 groups, 9 roles (3
built in), 24 permissions over 6 resources, 7 service accounts, 5 OAuth apps and 3 providers. The
Overview and Audit streams tick while their tab shows and pause while the pointer or focus is inside
them.
