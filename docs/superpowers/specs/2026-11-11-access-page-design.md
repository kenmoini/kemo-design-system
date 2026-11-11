# Access page

Date: 2026-11-11. Status: approved in the visual brainstorm (object tabs: option B "filter rail" with a toolbar of
"Bulk actions ▾" + "Add" above the table; Overview, Add dialog, Audit, OIDC and Settings played back and accepted).
Mockups: `docs/superpowers/specs/assets/2026-11-11-access-table-options.html` and `2026-11-11-access-playbacks.html`.

## Intent

The dashboard's "Access" nav item becomes a real console page: the place an admin manages who can sign in and
what they can do. It is also the home of the design system's first serious data table, so every later list
page (services, deployments, environments) starts from the same table, filters, selection and dialog patterns.

## Goals, non-goals, anti-goals

Goals: a reusable, headless-powered `DataTable` on Park's `Table` with sorting, search, faceted filters, row
selection with bulk actions, per-row action menus and pagination; an `AccessPage` with ten URL-addressable tabs;
six object tabs (Users, Groups, Roles, Permissions, Service accounts, OAuth apps) that share the table pattern
and open a Park `Dialog` form to add or edit; an Overview tab built from the dashboard widgets; an Audit tab
(forwarding form + expanded API stream); an OIDC tab (providers with sync status); a Settings tab (general access
settings form); a preview demo whose in-memory state makes every control feel real; tests and README.

Non-goals: real persistence or APIs, server-side paging, column resizing/reordering/visibility, virtualised
rows, CSV export, inline editing, drag-and-drop, a permissions engine. Those stay out so the table ships small.

Anti-goals: a table that fights the Park recipes (every visible piece must be a Park component or a token);
bulk actions that act without saying how many rows they will touch; a dialog that loses typed input when a
validation error appears; filters whose counts lie; a tab strip that cannot be linked to.

## Constraints (unchanged)

Panda CSS 2.5 `panda lib` workflow; Park UI components synced from the registry (`pnpm park-ui add …`), never
hand-edited; our files under `src/pages/**`, `src/layouts/**`, `src/widgets/**`, our token files; relative
`styled-system` imports (depth three from `src/pages/access/`, depth two from `src/widgets/data-table/`);
tokens only; `'use client'` where hooks are used; Prettier `semi: false, singleQuote: true, printWidth: 100,
trailingComma: 'all'`; lint zero warnings; Vitest + Testing Library; Playwright; one commit per task on `main`.

New dependency: `@tanstack/react-table` ^9.3.1 (headless; MIT; React ≥ 18). It owns table state only; it
renders nothing. New Park foundations to sync: `dialog`, `tags-input`, `number-input`, `textarea`,
`radio-group` (plus their recipes). Already synced and reused: table, tabs, checkbox, menu, pagination, select,
switch, field, fieldset, input, input-group, badge, avatar, tooltip, drawer, button, icon-button, card, text.

## The look

### Page and tab strip

Inside the host's `AppShell` ("Access" active). `PageHeader` "Access" with the context line "Users, groups,
roles and how people sign in" and no actions (each tab owns its own). Under it a Park `Tabs` strip: Overview,
Users, Groups, Roles, Permissions, Audit, OIDC, Service accounts, OAuth apps, Settings. Each trigger is a link
(`Tabs.Trigger asChild` → the host's link component) so every tab has its own URL; `Tabs.Root value` follows the
route. Below `md` the list scrolls horizontally (no wrapping). The active tab's content renders beneath the
strip; there is no content for the other tabs in the DOM.

### Object tabs (Users, Groups, Roles, Permissions, Service accounts, OAuth apps)

Two columns on `lg` and up: a **filter rail** (`aside aria-label="Filters"`, 12rem) and the table column.

- Rail: a search `Input` (placeholder "Search {plural}"), then one group per filter: a muted `xs` label and,
  for `checkbox` filters, one Park `Checkbox` per value with the matching count in subtle text ("Active 231");
  for `select` filters, a Park `Select` ("All roles"). A `plain` "Clear filters" button appears when any filter
  or search is active. Below `lg` the rail is not shown; the toolbar gains an `outline` "Filters" button with a
  count badge when filters are active, which opens the same controls in a Park `Drawer` (`placement="start"`).
- Toolbar (above the table card): left, muted text "{n} {plural}" plus " · {k} selected" in `fg.default` when
  rows are checked; right, "Bulk actions ▾" (`outline` `Button` as `Menu.Trigger`, disabled until a row is
  checked, its first item group labelled "{k} {plural}") then "+ Add {singular}" (`solid`).
- Table card (`Card.Root variant="outline"`): Park `Table` with a first column holding a `Checkbox` (header =
  select all rows on the page, indeterminate when some are checked; row = select that row, labelled "Select
  {name}"), sortable headers (click toggles ascending/descending; the sorted header shows an arrow and sets
  `aria-sort`), status as `Badge`s, and a last column with an `IconButton` "Actions for {name}" opening a Park
  `Menu` of the row actions (danger items in `red.11`). Selected rows get `bg: 'gray.subtle.bg'`. Rows are
  `size="md"` (Park's only size). Empty result: one full-width cell "No {plural} match these filters" with a
  "Clear filters" button; empty data: "No {plural} yet" with "+ Add {singular}".
- Footer: "{from}–{to} of {total}" left, Park `Pagination` right; 10 rows per page; selection survives paging.
- Counts, selection and sorting announce through a polite live region ("231 users, 2 selected").

### Add / Edit dialog

Park `Dialog` (modal, `lazyMount` + `unmountOnExit`, Escape and backdrop close, focus trapped, initial focus
on the first field): `Dialog.Title` "Add {singular}" or "Edit {name}", an optional `Dialog.Description`, the
form body (react-hook-form + zod, Park `Field`s with helper and error text, two-column rows on `md`+), and a
footer with `Cancel` (`outline`) and the submit button (`solid`, "Add {singular}" or "Save changes"). Submit
calls the host's `onCreate`/`onUpdate` with the parsed values and closes; a rejected promise shows its message
above the footer and keeps the input. "Clone" opens the Add dialog pre-filled with the row's values and the name
suffixed " (copy)".

### Overview

Four `StatCard`s in a 4-column grid (`md`: 2): Internal users, Groups, OIDC users, Active sessions (with
deltas); then two cards side by side (`lg`; stacked below): "Sign-ins · last 24 h" as an `ActivityFeed`, and
"Authenticated API calls · live" as an `EventStream` with `live`.

### Audit

Two columns on `lg` (stacked below): left (`2fr`) a card "Forward the audit log" holding a form: Destination
`Select` (Splunk HEC, Syslog, S3 bucket, Webhook), Format `Select` (JSON, CEF), Endpoint URL `Input`, Token
`PasswordInput`, Include checkboxes (Sign-ins, Admin changes, API calls), "Failed requests only" checkbox,
"Forwarding enabled" `Switch`, then "Send test event" (`outline`), "Save" (`solid`) and a status line "● Last
delivery {time}" in `green.11` (or "Not yet delivered" muted). Right (`1fr`) a card "API audit stream · live": a
`SegmentGroup` All / 4xx–5xx / Admin that filters the list, then an `EventStream` whose items show method +
path on the first line and "actor · status · duration · ip" in subtle text on the second.

### OIDC

Toolbar: "{n} providers · {m} synced users" left; "Sync all" (`outline`) and "+ Add provider" (`solid`) right.
A `DataTable` without filters or selection: Provider (bold name), Issuer, Users, Groups mapped, Sync
(`Badge`: Synced green, "Syncing · 61%" amber, "Error · {message}" red, Disabled gray), Last sync, actions
(Sync now, Edit, Disable/Enable, Remove). "Add provider" opens the dialog form: Name, Issuer URL, Client id,
Client secret (`PasswordInput`), Scopes (`TagsInput`, default openid profile email groups), Group claim, "Create
users on first sign-in" `Switch`.

### Settings

One outlined card with three sections, each a two-column row on `md`+ (left: `h2` + description; right: the
fields): **Internal authentication** (Switch "Allow password sign-in", Switch "Require MFA for admins");
**Tokens and sessions** (Selects: Access token lifetime 15/30/60/120 minutes, Refresh token lifetime 7/30/90
days, Idle timeout 1/8/24 hours, Service account token max 30/90/365 days); **Email verification** (Switch
"Require verified email before first sign-in"; SMTP host, Port (`NumberInput`), Username, Password
(`PasswordInput`), From address; "Send test email" `outline`). A card footer with "Discard changes" (`outline`,
disabled when clean) and "Save settings" (`solid`, disabled when clean). The form is react-hook-form + zod.

## Data model (library types; the preview supplies mock rows)

```ts
type EntityStatus = 'active' | 'disabled'
interface AccessUser {
  id
  name
  email
  role: string
  source: 'internal' | 'oidc'
  provider?: string
  groups: string[]
  status: EntityStatus
  lastSignInAt?: string
  createdAt: string
}
interface AccessGroup {
  id
  name
  description?: string
  members: number
  roles: string[]
  source: 'internal' | 'oidc'
  status: EntityStatus
}
interface AccessRole {
  id
  name
  description?: string
  permissions: string[]
  members: number
  builtIn: boolean
  status: EntityStatus
}
interface AccessPermission {
  id
  name: string /* "deployments.create" */
  resource: string
  action: 'read' | 'create' | 'update' | 'delete' | 'admin'
  description?: string
  roles: number
}
interface ServiceAccount {
  id
  name
  description?: string
  role: string
  tokenExpiresAt: string
  lastUsedAt?: string
  status: EntityStatus
}
interface OAuthApp {
  id
  name
  clientId: string
  type: 'web' | 'native' | 'machine'
  redirectUris: string[]
  scopes: string[]
  owner: string
  status: EntityStatus
  createdAt: string
}
interface OidcProvider {
  id
  name
  issuer: string
  users: number
  groupsMapped: number
  sync: { state: 'synced' | 'syncing' | 'error' | 'disabled'; progress?: number; message?: string }
  lastSyncAt?: string
  enabled: boolean
}
interface AuditEvent {
  id
  time: string
  method: string
  path: string
  actor: string
  status: number
  durationMs: number
  ip?: string
  kind: 'signin' | 'admin' | 'api'
}
interface AuditForwardingValues {
  destination: 'splunk' | 'syslog' | 's3' | 'webhook'
  format: 'json' | 'cef'
  endpoint: string
  token: string
  include: ('signins' | 'admin' | 'api')[]
  failedOnly: boolean
  enabled: boolean
}
interface AccessSettingsValues {
  passwordSignIn: boolean
  requireMfaForAdmins: boolean
  accessTokenMinutes: 15 | 30 | 60 | 120
  refreshTokenDays: 7 | 30 | 90
  idleTimeoutHours: 1 | 8 | 24
  serviceTokenMaxDays: 30 | 90 | 365
  requireVerifiedEmail: boolean
  smtp: { host: string; port: number; username: string; password: string; from: string }
}
```

## Per-entity table (columns · filters · row actions · bulk actions · form fields)

| Entity           | Columns (sortable unless noted)                                                             | Filters                    | Row actions                                 | Bulk                                                 | Form (zod)                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------- | -------------------------- | ------------------------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Users            | Name (with email beneath), Role, Source (Badge), Status (Badge), Last sign-in               | Status ☐, Source ☐, Role ▾ | Edit, Clone, Disable/Enable, Delete         | Enable, Disable, Add to group…, Assign role…, Delete | name, email, role, source, groups[], sendInvite                                         |
| Groups           | Name (description beneath), Members, Roles (comma list), Source (Badge), Status             | Status ☐, Source ☐         | Edit, Clone, Disable/Enable, Delete         | Enable, Disable, Assign role…, Delete                | name, description, roles[]                                                              |
| Roles            | Name (+ "Built-in" Badge), Description (not sortable), Permissions (count), Members, Status | Status ☐, Built-in ☐       | Edit, Clone, Delete (built-in: Clone only)  | Enable, Disable, Delete                              | name, description, permissions[] (checkbox list grouped by resource)                    |
| Permissions      | Name (mono), Resource, Action (Badge), Description (not sortable), Roles (count)            | Resource ☐, Action ☐       | Edit, Delete                                | Delete                                               | name, resource, action, description                                                     |
| Service accounts | Name (description beneath), Role, Token expires, Last used, Status                          | Status ☐, Role ▾           | Edit, Rotate token, Disable/Enable, Delete  | Enable, Disable, Delete                              | name, description, role, tokenLifetimeDays (NumberInput)                                |
| OAuth apps       | Name (client id mono beneath), Type (Badge), Owner, Scopes (count), Created, Status         | Status ☐, Type ☐           | Edit, Rotate secret, Disable/Enable, Delete | Enable, Disable, Delete                              | name, type (RadioGroup), redirectUris[] (TagsInput), scopes[] (checkboxes), description |

"Add to group…" and "Assign role…" open a small dialog with one `Select` and apply to the selection. Delete
(row or bulk) opens a confirm dialog: "Delete {name}?" / "Delete {k} {plural}?" with a `red` solid button.

## Components and API

```ts
// widgets/data-table (headless on @tanstack/react-table v9)
interface DataTableColumn<T> { id: string; header: string; accessor?: (row: T) => string | number | boolean | null | undefined; cell?: (row: T) => ReactNode; sortable?: boolean; align?: 'start' | 'end'; width?: string }
interface DataTableFilter<T> { id: string; label: string; kind: 'checkbox' | 'select'; accessor: (row: T) => string; options?: { value: string; label: string }[]; allLabel?: string }
interface ActionItem { id: string; label: string; tone?: 'default' | 'danger'; disabled?: boolean; onSelect: () => void }
interface DataTableProps<T extends { id: string }> {
  entity: { singular: string; plural: string }
  columns: DataTableColumn<T>[]; rows: T[]
  filters?: DataTableFilter<T>[]
  search?: { placeholder?: string; keys: ((row: T) => string)[] }   // global filter; omitted → no search box
  selectable?: boolean; selectedIds?: string[]; onSelectionChange?: (ids: string[]) => void
  rowActions?: (row: T) => ActionItem[]; rowLabel?: (row: T) => string
  bulkActions?: (selected: T[]) => ActionItem[]
  addAction?: { label?: string; onSelect: () => void }
  toolbarStart?: ReactNode; toolbarEnd?: ReactNode
  pageSize?: number; initialSort?: { id: string; desc?: boolean }
  emptyMessage?: string; linkComponent?: LinkComponent
}
DataTable<T>(props)         // 'use client'; useTable({ features: tableFeatures({ rowSortingFeature, columnFilteringFeature, globalFilteringFeature, columnFacetingFeature, rowSelectionFeature, rowPaginationFeature, sortedRowModel, filteredRowModel, paginatedRowModel, facetedRowModel… }), columns, data, getRowId })

// pages/access
type AccessTabId = 'overview' | 'users' | 'groups' | 'roles' | 'permissions' | 'audit' | 'oidc' | 'service-accounts' | 'oauth-apps' | 'settings'
const accessTabs: { id: AccessTabId; label: string }[]
AccessPage({ activeTab: AccessTabId; tabHref: (tab: AccessTabId) => string; linkComponent?; title?; description?; children })
AccessOverview({ stats: StatCardProps[]; signIns: ActivityItem[]; apiCalls: EventStreamEvent[]; live?: boolean })
interface EntityTabProps<T, V> { rows: T[]; onCreate: (values: V) => void | Promise<void>; onUpdate: (id: string, values: V) => void | Promise<void>; onClone?: (id: string) => void; onSetStatus?: (ids: string[], status: EntityStatus) => void; onDelete: (ids: string[]) => void; linkComponent? }
AccessUsersTab(EntityTabProps<AccessUser, UserValues> & { roles: Option[]; groups: Option[]; onAddToGroup: (ids, groupId) => void; onAssignRole: (ids, roleId) => void })
AccessGroupsTab(EntityTabProps<AccessGroup, GroupValues> & { roles: Option[]; onAssignRole })
AccessRolesTab(EntityTabProps<AccessRole, RoleValues> & { permissions: AccessPermission[] })
AccessPermissionsTab(EntityTabProps<AccessPermission, PermissionValues> & { resources: string[] })
AccessServiceAccountsTab(EntityTabProps<ServiceAccount, ServiceAccountValues> & { roles: Option[]; onRotateToken: (id) => void })
AccessOAuthAppsTab(EntityTabProps<OAuthApp, OAuthAppValues> & { scopes: Option[]; onRotateSecret: (id) => void })
AccessAudit({ forwarding: AuditForwardingValues; onSaveForwarding: (v) => void | Promise<void>; onSendTest: () => void | Promise<void>; lastDeliveryAt?: string; events: AuditEvent[]; live?: boolean })
AccessOidc({ providers: OidcProvider[]; onCreate: (v: OidcProviderValues) => void; onUpdate: (id, v) => void; onSyncNow: (id) => void; onSyncAll: () => void; onSetEnabled: (id, enabled) => void; onRemove: (id) => void })
AccessSettings({ values: AccessSettingsValues; onSave: (v) => void | Promise<void>; onSendTestEmail: () => void | Promise<void> })
EntityDialog({ open; onOpenChange; title; description?; children })   // Park Dialog wrapper used by every form
// forms: UserForm, GroupForm, RoleForm, PermissionForm, ServiceAccountForm, OAuthAppForm, OidcProviderForm
//   each ({ defaultValues?; submitLabel; onSubmit; onCancel }) with its zod schema and Values type exported
ConfirmDialog({ open; onOpenChange; title; description; confirmLabel; tone: 'danger'; onConfirm })
```

Exports join `src/index.ts` via `export * from './widgets/data-table'` and `export * from './pages/access'`.

## Preview

- Route `app/access/[[...tab]]/page.tsx` with `generateStaticParams` for the ten tabs; an unknown segment
  calls `notFound()`. The page renders `AccessDemo({ tab })` (`'use client'`) inside `ConsoleFrame active="access"`.
- `AccessDemo` owns all state with a reducer over `src/lib/mock-access.ts`: deterministic generated rows
  (users 231 internal + OIDC, 18 groups, 9 roles with 3 built-in, 24 permissions over 6 resources, 7 service
  accounts, 5 OAuth apps, 3 providers), sign-ins, API events (rotation for `useLiveEvents`), forwarding and
  settings values. Handlers mutate state: create appends (new id), update replaces, clone duplicates with
  " (copy)", set status toggles, delete removes, rotate updates the expiry/secret and shows the new value in a
  dialog, sync sets `syncing` then `synced` after 2 s. Every handler resolves; one ("Send test event") rejects
  once in three calls to show the error path.
- `mock-dashboard.ts`: Access nav item `href: '/access'`. Panel: "Access" after Dashboard.
- README: "Access page and DataTable" section (what ships; the DataTable API in ten lines; TanStack v9 note;
  how a host wires an entity tab; where the demo lives); roadmap updated.

## Tests

- Unit (`widgets/data-table`): sorts by a column both ways with `aria-sort`; global search narrows rows;
  checkbox filter facets show counts and narrow rows; select filter; selecting two rows enables "Bulk actions"
  and labels the group "2 users"; header checkbox selects the page and shows indeterminate; selection survives
  a page change; row actions menu lists the items and calls `onSelect`; pagination text and page change; empty
  filtered state with "Clear filters"; below `lg` (`setMediaMatches`) the rail is absent and the "Filters"
  button opens a dialog containing the controls.
- Unit (`pages/access`): `AccessPage` renders ten tab links with hrefs from `tabHref` and `aria-selected` on
  the active one; each entity tab renders its columns and opens the Add dialog whose form validates (required
  name, email format) and calls `onCreate` with parsed values; Edit pre-fills; Delete confirms before
  `onDelete`; `AccessOidc` badges per sync state; `AccessSettings` save disabled until dirty, `onSave` receives
  the values; `AccessAudit` segment filter narrows the stream and `onSaveForwarding` receives values.
- e2e: `/access` and the nine tab URLs join the routes loop; named tests: `access tabs are links`
  (click "Users" → URL `/access/users`, tab selected); `users table searches and filters` (type "priya" → one
  row; check "Disabled" → count changes); `bulk actions follow the selection` (check two rows → "Bulk actions"
  enabled, menu shows "2 users"); `add user through the dialog` (open, fill, submit → new row visible, count
  +1); `row actions disable a user` (⋯ → Disable → badge "Disabled"); `overview shows the widgets`; `audit
layout and oidc badges`; `access at 375` (tab strip scrolls, "Filters" button opens the drawer, no horizontal
  overflow).

## Decisions

1. TanStack Table v9 for state, Park `Table` for everything visible: headless keeps the recipes in charge and
   the bundle small; features are opt-in so the widget ships only sorting, filtering, selection and paging.
2. Tabs are links with a route per tab: shareable URLs and a working back button beat local state.
3. One `DataTable` widget, six thin entity tabs: the table owns behaviour; a tab owns only columns, filters,
   actions and its form.
4. Dialogs for create/edit/clone/confirm, as asked; no side panels.
5. Filters live in a rail on `lg`+ and a Drawer below: the rail is the fastest way to combine filters on a
   desktop; the drawer keeps phones usable without a second layout.
6. The preview keeps state in memory so every control is real to click, while the library stays presentational.

## Calls made after the builder check

- **Role actions**: row actions are Edit, Clone, Disable/Enable, Delete; built-in roles offer Edit and Clone
  only. Bulk Delete or Disable with built-in roles in the selection skips them and says so in the confirm
  dialog ("3 roles selected; 1 built-in role will be skipped").
- **Form-only fields**: `sendInvite`, `tokenLifetimeDays` and the OAuth `description` are form values, not
  entity fields; the host maps them (`tokenLifetimeDays` → `tokenExpiresAt`). `OAuthApp` gains `description?`.
- **References are ids**: `AccessUser.role`, `AccessUser.groups`, `AccessGroup.roles`, `AccessRole.permissions`
  and `ServiceAccount.role` hold ids; labels come from the `Option[]` lists each tab receives
  (`Option = { value: string; label: string }`), and a missing option renders the raw id.
- **Facet counts** are computed over the rows that match the search and every _other_ active filter (TanStack's
  per-column faceted row models), so a count never shows a value that would return zero rows.
- **Selection text** counts the whole selection, including rows hidden by the current filters or on other pages;
  the bulk group label and the live region use the same number. Clearing filters never clears the selection;
  "Clear selection" sits in the bulk menu's last group.
- **Already synced and reused as well**: `segment-group` (Audit stream filter), `password-input` (secrets),
  `progress`, `card`, `drawer`.

## Left to the builder

- Exact mock copy and values beyond the counts above; lucide icons for actions; the token/secret reveal dialog.
- Column widths and truncation rules; how long cells wrap; the mono font for ids.
- The internal shape shared by the six entity tabs (a `createEntityTab` helper is fine if it stays private).
- File layout under `src/widgets/data-table/` and `src/pages/access/` and the barrel exports.
