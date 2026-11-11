# Access Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reusable `DataTable` (TanStack Table v9 under Park's `Table`) and an `AccessPage` with ten URL-addressable tabs (Overview, six object tables with Add/Edit dialogs, Audit, OIDC, Settings), with a preview demo whose in-memory state makes every control real, plus tests and README.

**Architecture:** `packages/ui/src/widgets/data-table/` owns table behaviour (sort, search, faceted filters in a rail or drawer, selection, row/bulk action menus, pagination). `packages/ui/src/pages/access/` owns the page shell (tab links), a private entity-tab helper, seven react-hook-form + zod forms in Park `Dialog`s, and the Overview/Audit/OIDC/Settings tabs. The preview's `app/access/[[...tab]]` route renders `AccessDemo`, a reducer over deterministic mocks, inside `ConsoleFrame`.

**Tech Stack:** React 19, Park UI (Ark UI 5.40) on Panda CSS 2.5, `@tanstack/react-table` ^9.3.1, react-hook-form + zod, Next.js 16 App Router, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-access-page-design.md`

## Global Constraints

- Imports: from `src/widgets/data-table/` the styled-system is `../../../styled-system/*` and Park components `../../components/ui`; from `src/pages/access/` the styled-system is `../../../styled-system/*`, Park `../../components/ui`, widgets `../../widgets`, shell `../../layouts/app-shell`, `LinkComponent` from `../auth/types`. Never `~/` or bare `styled-system/`. Tokens only; no raw hex.
- Synced Park files (`src/components/ui/**` except `password-input.tsx`, `src/theme/recipes/**`, `src/theme/colors/**`, `global-css.ts`, `conditions.ts`) are never hand-edited; new ones come only from `pnpm park-ui add <ids>` followed by `pnpm park-ui port` (must print `0 written` afterwards).
- `'use client'` on files with hooks. Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; `pnpm lint` zero warnings; Panda ESLint plugin (static style props, literal conditional values).
- Copy and labels exactly as the spec: "Bulk actions", "+ Add {singular}", "{n} {plural}", " · {k} selected", "Clear filters", "Filters", "No {plural} match these filters", "No {plural} yet", "Actions for {name}", "Select {name}", "Delete {name}?", "Delete {k} {plural}?", "Add {singular}", "Edit {name}", "Save changes", "Cancel".
- Entity statuses `'active' | 'disabled'`; references (`role`, `groups`, `roles`, `permissions`) are ids resolved through `Option[]` lists; built-in roles cannot be disabled or deleted (bulk actions skip them and the confirm says so).
- Selection counts the whole selection (hidden and other-page rows included); facet counts respect the search and every other active filter.
- Green before every commit: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`; preview tasks add `pnpm build` and Playwright on :3100. One commit per task on `main`. Never stop the user's `next dev` on :3000; run build/dev/Playwright/registry sync with the sandbox disabled.

## Review Focus

1. Rows selected, then filtered out of view or paged away: "Bulk actions" stays enabled and the toolbar says the full count (Task 2 test `keeps hidden rows in the selection count`).
2. A rejected `onCreate` in the Add dialog: the dialog stays open, the typed values stay, the error message shows above the footer (Task 3 test `keeps input and shows the error when submit rejects`).
3. Bulk Delete with a built-in role selected: the confirm names how many are skipped and `onDelete` receives only the deletable ids (Task 4 test `skips built-in roles in bulk delete`).
4. A URL with an unknown tab segment (`/access/nope`) answers 404 with the status page; at 375 the tab strip scrolls without horizontal page overflow (Task 6 e2e `unknown access tab is a 404` and `access at 375`).
5. Facet counts with another filter active: the Status counts reflect the Source filter (Task 2 test `facet counts respect other filters`).

---

### Task 1: Foundations (Park sync, TanStack install, API smoke test)

**Files:**

- Run: `pnpm park-ui add dialog tags-input number-input textarea radio-group` then `pnpm park-ui port` (synced files + recipe registrations are written by the script; commit what it writes)
- Modify: `packages/ui/package.json` (`@tanstack/react-table` ^9.3.1 in `dependencies`), `pnpm-lock.yaml`
- Create: `packages/ui/src/widgets/data-table/table-features.ts`, `packages/ui/src/widgets/data-table/table-features.test.tsx`

**Interfaces:**

- Produces (`table-features.ts`): `export const dataTableFeatures = tableFeatures({ rowSortingFeature, columnFilteringFeature, globalFilteringFeature, columnFacetingFeature, rowSelectionFeature, rowPaginationFeature, sortedRowModel: createSortedRowModel(sortFns), filteredRowModel: createFilteredRowModel(filterFns), paginatedRowModel: createPaginatedRowModel(), facetedRowModel: createFacetedRowModel(), facetedUniqueValuesRowModel: createFacetedUniqueValuesRowModel() })` — **confirm every export name against the installed package's `.d.ts` and the v9 docs; if a name differs, use the real one and record the mapping in the report**. Export the `features` type alias (`export type DataTableFeatures = typeof dataTableFeatures`) for Task 2.
- Produces (report): the part names of the five newly synced namespaces (`Dialog`, `TagsInput`, `NumberInput`, `Textarea` (flat?), `RadioGroup`) exactly as `src/components/ui/index.ts` exports them, for Tasks 3–5.

- [ ] **Step 1: Write the failing smoke test** `table-features.test.tsx`: render a tiny component that calls `useTable({ features: dataTableFeatures, columns: [{ accessorKey: 'name', header: 'Name' }], data: [{ id: '1', name: 'b' }, { id: '2', name: 'a' }], getRowId: (r) => r.id, initialState: { sorting: [{ id: 'name', desc: false }] } })` and renders `table.getRowModel().rows.map((r) => r.getValue('name'))`; assert the order is `a, b`; toggle sorting via `table.setSorting([{ id: 'name', desc: true }])` → `b, a`; set `globalFilter: 'a'` → one row.
- [ ] **Step 2: Run to see it fail.** Run: `pnpm --filter @kemo/ui exec vitest run table-features`. Expected: FAIL (module not installed).
- [ ] **Step 3: Install and sync.** `pnpm --filter @kemo/ui add @tanstack/react-table@^9.3.1`; `pnpm park-ui add dialog tags-input number-input textarea radio-group`; `pnpm park-ui port` (expect `0 written` on a second run); `pnpm --filter @kemo/ui lib`. Implement `table-features.ts`.
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0; lockfile adds only the TanStack packages.
- [ ] **Step 5: Commit** `feat(ui): sync dialog and form foundations, add TanStack Table`.

---

### Task 2: `DataTable` widget

**Files:**

- Create: `packages/ui/src/widgets/data-table/{types.ts,data-table.tsx,data-table-toolbar.tsx,data-table-filters.tsx,data-table-pager.tsx,action-menu.tsx,index.ts}`
- Modify: `packages/ui/src/widgets/index.ts` (`export * from './data-table'`)
- Test: `packages/ui/src/widgets/data-table/data-table.test.tsx`

**Interfaces:**

- Consumes: `dataTableFeatures` (Task 1); Park `Table`, `Checkbox`, `Menu`, `IconButton`, `Button`, `Input`, `Select`, `Badge`, `Pagination`, `Drawer`, `Card`, `Text`; `useMediaQuery`/`MEDIA_LG` from `../../layouts/app-shell`; `LinkComponent` from `../../pages/auth/types`.
- Produces (`types.ts`, verbatim from the spec): `DataTableColumn<T>`, `DataTableFilter<T>`, `ActionItem`, `DataTableProps<T extends { id: string }>`, plus `Option = { value: string; label: string }`.
- Produces: `DataTable<T>(props)`; `ActionMenu({ label, items, trigger?: 'icon' | 'button', buttonLabel?, disabled?, groupLabel? })` (shared by rows, bulk and later OIDC); `DataTableFilters({ table, filters, search })` (rail body, also rendered inside the Drawer); `DataTablePager({ table, total })`.
- DOM contract: `Grid gridTemplateColumns={{ base: '1fr', lg: '12rem minmax(0, 1fr)' }} gap="6"`; rail `aside aria-label="Filters"` (hidden below `lg`); toolbar `HStack`: `Text color="fg.muted"` "{n} {plural}" + `Text as="span" color="fg.default"` " · {k} selected"; a polite live region (`srOnly`) with "{n} {plural}, {k} selected"; right: below `lg` an `outline` "Filters" `Button` (with a `Badge` count of active filters) opening a `Drawer placement="start"` containing `DataTableFilters`; "Bulk actions" `ActionMenu trigger="button"` (`disabled` when nothing is selected; first item group labelled "{k} {plural}"; last group "Clear selection"); `addAction` → `Button variant="solid"` "+ {label ?? `Add ${singular}`}"; `toolbarStart`/`toolbarEnd` slots. Table in `Card.Root variant="outline"`: header `Checkbox` `aria-label="Select all on this page"` with `checked`/`indeterminate` from `table.getIsAllPageRowsSelected()`/`getIsSomePageRowsSelected()`; sortable `Table.Header`s rendered as `button`s with `aria-sort` (`ascending` | `descending` | none) and an arrow icon; row `Checkbox` `aria-label={`Select ${rowLabel(row)}`}`; selected rows `data-selected` + `bg: 'gray.subtle.bg'`; last cell `ActionMenu trigger="icon"` `aria-label={`Actions for ${rowLabel(row)}`}`; empty states per spec. Footer: "{from}–{to} of {total}" + Park `Pagination` (`count`, `pageSize`, 1-based `page`).
- Behaviour: global filter over `search.keys`; column filters keyed by `filter.id` using TanStack `filterFn: 'arrIncludesSome'` for checkbox filters (value = selected array) and `'equalsString'` for select; facet counts from `column.getFacetedUniqueValues()` (which respect other filters by construction); selection state `{ [id]: true }` mapped to `selectedIds` (controlled when given, else internal); `initialSort`; `pageSize` default 10; `rowLabel` default `(row) => String((row as { name?: string }).name ?? row.id)`.

- [ ] **Step 1: Write the failing tests** (`data-table.test.tsx`, fixture: 25 users with `name`, `role`, `source`, `status`; columns Name/Role/Status; filters Status ☐ and Source ☐ and Role ▾; search on name+email):
  - `sorts by a column both ways with aria-sort`: click "Name" header → first row "Aaron…", `aria-sort="ascending"`; click again → descending.
  - `searches rows`: type "priya" in "Search users" → one row, toolbar "1 user".
  - `filters by status facet with counts`: the "Disabled" checkbox label contains its count; check it → only disabled rows.
  - `facet counts respect other filters`: check Source "OIDC" → the Status "Active" count equals the number of active OIDC rows.
  - `selects rows and enables bulk actions`: "Bulk actions" disabled; check two rows → enabled, toolbar " · 2 selected", open the menu → group label "2 users"; `onSelectionChange` called with the two ids.
  - `header checkbox selects the page and shows indeterminate`.
  - `keeps hidden rows in the selection count`: select a row, type a search that hides it → toolbar still says "1 selected" and "Bulk actions" stays enabled.
  - `selection survives paging`: select on page 1, go to page 2 and back → still checked.
  - `row actions menu lists items and calls onSelect`: open "Actions for Priya Natarajan" → "Disable" → handler called with the row.
  - `paginates`: footer "1–10 of 25", click "Next page" → "11–20 of 25".
  - `shows the empty filtered state with Clear filters`: search "zzz" → "No users match these filters", click "Clear filters" → rows back.
  - `shows the empty data state`: `rows={[]}` → "No users yet" + "+ Add user".
  - `moves filters into a drawer below lg`: `setMediaMatches(MEDIA_LG, false)` → no `complementary` landmark; click "Filters" → `dialog` with the "Status" group.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run data-table`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0, no `act()`/Ark warnings.
- [ ] **Step 5: Commit** `feat(ui): add DataTable on TanStack Table with filters, selection and actions`.

---

### Task 3: Access page shell, dialogs, and the Users tab (proves the entity pattern)

**Files:**

- Create: `packages/ui/src/pages/access/{types.ts,access-tabs.ts,access-page.tsx,entity-dialog.tsx,confirm-dialog.tsx,entity-tab.tsx,forms/form-fields.tsx,forms/user-form.tsx,schemas.ts,tabs/users-tab.tsx,index.ts}`
- Modify: `packages/ui/src/index.ts` (`export * from './pages/access'`)
- Test: `packages/ui/src/pages/access/{access-page,entity-dialog,users-tab}.test.tsx`

**Interfaces:**

- Consumes: `DataTable`, `ActionItem`, `Option` (Task 2); Park `Tabs`, `Dialog`, `Field`, `Input`, `Select`, `Switch`, `TagsInput`, `Button`, `Badge`; `PageHeader`; `StatCard` types; react-hook-form + zod as in `pages/auth`.
- Produces (`types.ts`): every entity interface from the spec's data model (with `OAuthApp.description?`), `EntityStatus`, `Option`, `AccessTabId`, `EntityTabProps<T, V>`.
- Produces: `accessTabs: { id: AccessTabId; label: string }[]` (ten, in spec order, labels "Overview", "Users", "Groups", "Roles", "Permissions", "Audit", "OIDC", "Service accounts", "OAuth apps", "Settings"); `AccessPage({ activeTab, tabHref, linkComponent?, title = 'Access', description = 'Users, groups, roles and how people sign in', children })` — `PageHeader` + `Tabs.Root value={activeTab}` with `Tabs.List overflowX="auto"` of `Tabs.Trigger value={id} asChild` → `LinkComponent href={tabHref(id)}`; `Tabs.Content value={activeTab}` holds `children`. `EntityDialog({ open, onOpenChange, title, description?, children })` (Park Dialog, `lazyMount` + `unmountOnExit`, `Dialog.Title`/`Description`, close button). `ConfirmDialog({ open, onOpenChange, title, description, confirmLabel, tone = 'danger', onConfirm })`. `form-fields.tsx`: `TextField`, `SelectField`, `SwitchField`, `TagsField` wrappers over Park `Field` + the inputs, bound to react-hook-form (`Controller` for Select/Switch/Tags). `schemas.ts`: `userSchema` (`name` 1–64, `email` valid, `role` non-empty, `source` enum, `groups` string[], `sendInvite` boolean) and `UserValues`. `entity-tab.tsx` (private): `createEntityTab<T, V>({ entity, columns, filters, search, rowLabel, Form, schemaDefaults, toValues(row): V, rowActions(ctx), bulkActions(ctx) })` returning a component that wires `DataTable` + `EntityDialog` (add/edit/clone) + `ConfirmDialog` (delete) + an optional extra dialog slot; it handles the rejected-submit error (message above the footer, inputs kept). `AccessUsersTab` built with it per the spec table (columns Name with email beneath, Role via `roles` options, Source Badge, Status Badge, Last sign-in; filters Status/Source/Role; actions Edit/Clone/Disable|Enable/Delete; bulk Enable/Disable/Add to group…/Assign role…/Delete; the two "…" items open a one-`Select` dialog and call `onAddToGroup`/`onAssignRole`).

- [ ] **Step 1: Failing tests.** `access-page.test.tsx`: renders ten links with hrefs from `tabHref` (`/access/users` …), the active tab has `aria-selected="true"`, children render. `entity-dialog.test.tsx`: opens with title, traps focus on the first field (first `textbox` has focus), Escape calls `onOpenChange(false)`. `users-tab.test.tsx`: columns and badges render; "+ Add user" opens "Add user"; submitting empty shows "Enter the name." (or the schema's message) and does not call `onCreate`; a valid submit calls `onCreate` with parsed values and closes; "Edit" pre-fills the name; `keeps input and shows the error when submit rejects` (`onCreate` rejects with `new Error('Email already in use')` → dialog open, name still typed, text visible); "Delete" → confirm "Delete Priya Natarajan?" → `onDelete(['u1'])`; bulk "Assign role…" → dialog with a Select → `onAssignRole(ids, roleId)`.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run access-page entity-dialog users-tab`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add AccessPage, entity dialogs and the Users tab`.

---

### Task 4: The other five entity tabs

**Files:**

- Create: `packages/ui/src/pages/access/forms/{group-form,role-form,permission-form,service-account-form,oauth-app-form}.tsx`, `packages/ui/src/pages/access/tabs/{groups-tab,roles-tab,permissions-tab,service-accounts-tab,oauth-apps-tab}.tsx`
- Modify: `packages/ui/src/pages/access/schemas.ts`, `packages/ui/src/pages/access/index.ts`
- Test: `packages/ui/src/pages/access/tabs/entity-tabs.test.tsx`

**Interfaces:**

- Consumes: `createEntityTab`, form fields, dialogs (Task 3); Park `Textarea`, `NumberInput`, `RadioGroup`, `Checkbox`.
- Produces: schemas + Values for group (`name`, `description?`, `roles[]`), role (`name`, `description?`, `permissions[]` ≥ 1), permission (`name` matching `/^[a-z]+\.[a-z]+$/`, `resource`, `action` enum, `description?`), service account (`name`, `description?`, `role`, `tokenLifetimeDays` 1–365), OAuth app (`name`, `type` enum, `redirectUris[]` each a URL (≥ 1 unless `type === 'machine'`), `scopes[]`, `description?`); the five tab components per the spec table (`AccessGroupsTab`, `AccessRolesTab` (built-in rules), `AccessPermissionsTab`, `AccessServiceAccountsTab` (+ "Rotate token"), `AccessOAuthAppsTab` (+ "Rotate secret")).

- [ ] **Step 1: Failing tests** (one `describe` per tab): each renders its columns and opens its Add dialog; one validation case each (role needs a permission; permission name format; OAuth web app needs a redirect URI; service account lifetime range); `skips built-in roles in bulk delete` (select a built-in and a custom role → bulk Delete → confirm text "2 roles selected; 1 built-in role will be skipped" → `onDelete` gets only the custom id); built-in role row menu has Edit and Clone only; "Rotate token"/"Rotate secret" call their handlers.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run entity-tabs`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add the Groups, Roles, Permissions, Service accounts and OAuth apps tabs`.

---

### Task 5: Overview, Audit, OIDC and Settings tabs

**Files:**

- Create: `packages/ui/src/pages/access/tabs/{overview-tab,audit-tab,oidc-tab,settings-tab}.tsx`, `packages/ui/src/pages/access/forms/{audit-forwarding-form,oidc-provider-form,settings-form}.tsx`
- Modify: `packages/ui/src/pages/access/schemas.ts`, `packages/ui/src/pages/access/index.ts`
- Test: `packages/ui/src/pages/access/tabs/{overview-tab,audit-tab,oidc-tab,settings-tab}.test.tsx`

**Interfaces:**

- Consumes: `StatCard`, `ActivityFeed`, `EventStream`, `DataTable`, `ActionMenu`; Park `SegmentGroup`, `PasswordInput`, `NumberInput`, `Switch`, `Select`.
- Produces: `AccessOverview`, `AccessAudit`, `AccessOidc`, `AccessSettings` with the spec's props; schemas `auditForwardingSchema`, `oidcProviderSchema` (`issuer` URL, `clientId`, `clientSecret` non-empty on create, `scopes[]` default `['openid','profile','email','groups']`, `groupClaim`, `autoCreateUsers`), `accessSettingsSchema` (enums as in the type; `smtp.port` 1–65535; `smtp.from` non-empty when `requireVerifiedEmail`).

- [ ] **Step 1: Failing tests.** Overview: four stat values, the activity actors, the stream items, `role="status"` when `live`. Audit: form pre-filled from `forwarding`, "Save" calls `onSaveForwarding` with values, "Send test event" calls `onSendTest`, segment "4xx–5xx" narrows the stream to status ≥ 400, "Last delivery" text. OIDC: one row per provider with the badge text per state ("Synced", "Syncing · 61%", "Error · invalid client secret", "Disabled"), "Sync all" and "+ Add provider" (dialog validates the issuer URL), row menu "Sync now" → `onSyncNow(id)`. Settings: "Save settings" disabled until a field changes, then `onSave` receives the values; "Discard changes" resets; "Send test email" calls its handler.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run overview-tab audit-tab oidc-tab settings-tab`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add the Access Overview, Audit, OIDC and Settings tabs`.

---

### Task 6: Preview route, demo state, mocks, panel, README, e2e

**Files:**

- Create: `apps/preview/src/app/access/[[...tab]]/page.tsx`, `apps/preview/src/components/access/access-demo.tsx`, `apps/preview/src/lib/mock-access.ts`, `apps/preview/src/lib/access-reducer.ts`
- Modify: `apps/preview/src/lib/mock-dashboard.ts` (Access `href: '/access'`), `apps/preview/src/components/preview-panel.tsx` (`{ href: '/access', label: 'Access' }` after Dashboard), `apps/preview/e2e/smoke.spec.ts`, `README.md`
- Test: `apps/preview/e2e/smoke.spec.ts`

**Interfaces:**

- Consumes: everything exported by Tasks 2–5; `ConsoleFrame`; `useLiveEvents`; `NextLink`; `notFound` from `next/navigation`.
- Produces: `generateStaticParams` returning `[{ tab: [] }, ...accessTabs.map((t) => ({ tab: [t.id] }))]`; the page reads `params.tab?.[0] ?? 'overview'`, calls `notFound()` for unknown ids, renders `<AccessDemo tab={id} />`. `mock-access.ts`: deterministic generators (seeded name lists, no `Math.random`) for the counts in the spec, plus `oidcProviders`, `auditEvents` (+ rotation), `signIns`, `forwardingDefaults`, `settingsDefaults`, `roleOptions`, `groupOptions`, `scopeOptions`, `resources`. `access-reducer.ts`: `AccessState` and `accessReducer` with actions `create/update/clone/setStatus/delete` per entity, `addToGroup`, `assignRole`, `rotateToken`, `rotateSecret`, `providerCreate/Update/Remove/SetEnabled/SyncStart/SyncDone`, `saveForwarding`, `saveSettings`. `AccessDemo` (`'use client'`): `useReducer`, the live API stream via `useLiveEvents`, a 2 s timeout to finish syncs, a counter so "Send test event" rejects every third call with "Could not reach splunk.acme.dev:8088", a "token/secret revealed" `EntityDialog` after rotate, and `AccessPage activeTab tabHref={(t) => (t === 'overview' ? '/access' : `/access/${t}`)} linkComponent={NextLink}` inside `ConsoleFrame active="access"`.
- e2e: `ROUTES` gains `/access`, `/access/users`, `/access/groups`, `/access/roles`, `/access/permissions`, `/access/audit`, `/access/oidc`, `/access/service-accounts`, `/access/oauth-apps`, `/access/settings` (+10). Named tests in `describe('access page')`: `access tabs are links`; `users table searches and filters`; `bulk actions follow the selection`; `add user through the dialog`; `row actions disable a user`; `overview shows the widgets`; `audit layout and oidc badges`; `unknown access tab is a 404` (`/access/nope` → status 404 and "There's nothing at this address."); `access at 375` (tab strip scrolls: the "Settings" tab link is reachable by scrolling the list; "Filters" opens the drawer; `scrollWidth === 375`). Expected total: 44 + 10 + 9 = 63.
- README "## Access page and DataTable" after the status/console section; roadmap updated.

- [ ] **Step 1: Write the failing e2e tests and ROUTES entries first**, build, run on :3100 → the new tests fail (404s), 44 pass.
- [ ] **Step 2: Implement** mocks, reducer, demo, route, nav/panel, README.
- [ ] **Step 3: Run everything.** `pnpm --filter @kemo/ui lib && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`, then Playwright on :3100. Expected: 63 passed; zero console/page errors on looped routes. Screenshot `/access/users` (1440, 1023, 375, light + dark), `/access` and `/access/audit` (1440), the Add user dialog open (1440); compare with `docs/superpowers/specs/assets/2026-11-11-access-*.html`.
- [ ] **Step 4: Commit** `feat(preview): add the Access page demo`.

---

### Task 7: Final verification

- [ ] **Step 1:** `make check`, `pnpm build` + Playwright on :3100, `make container-build`. Expected: exit 0 each; 63 e2e passed.
- [ ] **Step 2:** `git status --porcelain` empty; `git log --oneline` shows one commit per task plus review fixes.
