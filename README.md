# kemo-design-system

A React design system and the live preview app used to design with it. `@kemo/ui` is a Park UI
component library (Ark UI headless components styled with Panda CSS recipes) with a fixed theme.
`@kemo/preview` is a Next.js app that renders the components on standalone pages and the first
page set, the auth pages: Login, Forgot Password, Register and Complete Profile (for OIDC logins
whose scopes or mappers leave the profile incomplete). Other Kemo apps are meant to consume
`@kemo/ui` so a token or component change lands everywhere.

This repository holds the tooling, theme, components, auth pages, the application shell and
dashboard widgets, status pages and console pages, the Access page and its `DataTable`, the
Deployments pages with their YAML editor and schema browser, the preview and CI (see
[Auth pages](#auth-pages),
[Application shell and dashboard widgets](#application-shell-and-dashboard-widgets),
[Status pages and console pages](#status-pages-and-console-pages),
[Access page and DataTable](#access-page-and-datatable),
[Deployments pages, YamlEditor and SchemaBrowser](#deployments-pages-yamleditor-and-schemabrowser)
and [Roadmap](#roadmap)).

## Stack and design language

| Setting              | Value                                         | Where it lives                                                                                                                                    |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component foundation | Park UI (Ark UI headless + Panda CSS recipes) | `packages/ui/src/components/ui`, `packages/ui/src/theme`                                                                                          |
| Font family          | DM Sans                                       | `fonts.body` / `fonts.heading` tokens resolve to `var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif`; the preview sets the var |
| Gray color           | Neutral (Radix 12-step)                       | `semanticTokens.colors.gray` aliases `neutral`                                                                                                    |
| Accent color         | Neutral                                       | `colorPalette: 'gray'` on `html`, `.dark` and `.light` in the global CSS                                                                          |
| Radius               | XS                                            | `radii.l1 = 0.0625rem`, `l2 = {radii.xs}` (0.125rem), `l3 = {radii.sm}` (0.25rem)                                                                 |

Palettes shipped with the theme: neutral, red, green, blue, orange, amber. Charts use their own
series tokens, `colors.chart.1` to `chart.5`.

Main versions: Next.js 16.4.5, React 19.3.1, Panda CSS 2.5.0, Ark UI 5.40.0, Recharts 3.10, TypeScript 5.9.3,
Vitest 5.1, Playwright 1.65, ESLint 10, Prettier 3.9, pnpm 12.4.2. Node 24 is what CI and the
container use; the repo requires Node >= 24 and works on newer releases.

## Repo layout

```
apps/preview/        @kemo/preview: component pages, auth, dashboard and blog demos, Playwright e2e suite
packages/ui/         @kemo/ui: theme, Park UI components, Panda config (`panda lib` output in dist/)
scripts/park-ui/     Park UI registry sync and the Panda v2 port transform (with tests)
docs/superpowers/    Design specs and plans (scaffold, auth pages, dashboard)
Makefile             Front door for every task below
```

## Quickstart

```sh
make install && make dev
```

Open http://localhost:3000. Every preview page renders on its own, without a header. The round
button in the bottom-right corner opens the preview panel, a drawer with links to the overview
dashboard (`/dashboard`), the auth pages (`/login`, `/register`, `/forgot-password`,
`/complete-profile`), the component pages
(`/components/buttons`, `/components/forms`, `/components/surfaces`, `/components/typography`)
and the theme toggle. `make help` lists every target. Every target is a thin wrapper over a
`pnpm` script, so `pnpm dev`, `pnpm build` and so on work the same way.

## Dev workflow

`make dev` first runs `pnpm --filter @kemo/ui lib`, then starts two watchers together with
`concurrently`:

- `pnpm --filter @kemo/ui watch` runs `panda codegen && panda lib --watch`. `panda lib --watch`
  re-emits the manifest in `packages/ui/dist/panda` whenever recipes or tokens change, but it does
  not re-run codegen. After adding a recipe variant or a token, run `make codegen` (or restart
  `make dev`) so the generated `styled-system` code knows about it.
- `pnpm --filter @kemo/preview dev` runs Next.js (Turbopack) with the Panda PostCSS plugin.

`lib` runs first because the preview's `panda codegen` reads the design-system manifest
(`dist/panda/lib.json`) through `designSystem: '@kemo/ui'`. Without it Panda fails with
`design_system_manifest_not_found`. `pnpm install` only runs `panda codegen` in `packages/ui` (its
`prepare` script), not `panda lib`, which is why `make install` also runs `lib`.

CSS from a change in `packages/ui` can lag: the edit is picked up by `panda lib`, which rewrites
the manifest, and only then does the preview's Panda plugin regenerate CSS. Give it a moment
before assuming a change did not apply.

`make build` builds `@kemo/ui` and then the preview. `make start` runs `next start` on the result.
The preview uses `output: 'standalone'`, so `next start` prints a warning about it. It still
serves; the container runs the real standalone server.

`next dev` and `next build` download DM Sans through `next/font/google`, so they need outbound
network access.

## Adding Park UI components

Components are copied from Park UI's public registry into `packages/ui/src/components/ui` and owned
in-repo.

```sh
make park-ui-add COMPONENTS="dialog menu"
pnpm format
```

The target runs `node scripts/park-ui/sync.mjs add dialog menu` followed by `panda codegen` in
`@kemo/ui`. It needs network access. `pnpm park-ui init|add <ids...> [--force] [--with-colors]|port`
exposes the script directly. Existing files that differ from the registry are skipped unless you
pass `--force`.

`--force` overwrites the requested items' files where they differ from the registry. The port
still runs, but any other local edit to a Park file is lost, so check `git diff` after a forced run.
`packages/ui/src/theme/tokens/fonts.ts` (DM Sans) and `packages/ui/src/theme/radii.ts` (XS radii)
are ours even though they sit at Park theme paths. Park's `__init` does not ship them today; if it
ever does, `pnpm park-ui init --force` will overwrite them.

`init` and `add` print a line such as `note      card needs packages: @ark-ui/react, react` for
each registry item with npm dependencies. The script does not install them: add any that
`packages/ui/package.json` does not already list with `pnpm --filter @kemo/ui add <pkg>`.

Park's registry targets Panda v1, so the script ports each file to the v2 API:

- `createStyleContext` becomes `createSlotRecipeContext`
- type imports from `@pandacss/dev` become `@pandacss/types`
- bare `styled-system/*` imports become relative imports
- the checkbox control nesting is fixed
- `'PasswordInput'` is added to the input recipe's `jsx` list
- `Card.Footer` renders a `div` instead of Park's `h3`, so footer buttons are not inside a heading

It also scans the incoming recipes for color palettes the theme does not ship. Park's alert recipe,
for example, needs blue and orange. A missing palette stops the add and tells you to re-run with
`--with-colors` so the palette is copied in. Keep the palette set deliberate: adding one grows
every consumer's CSS.

`make park-ui-port` re-applies the port to files already in the repo. Run `pnpm format` after an
add, because the barrel files are written unformatted.

## Consuming @kemo/ui from another app

`@kemo/ui` is not published yet (see [Roadmap](#roadmap), item 8), so for now only apps inside
this workspace (`apps/*` or `packages/*`) can consume it, the way `apps/preview` does.

1. Add `"@kemo/ui": "workspace:*"` to the app's dependencies, and the dev dependencies
   `@pandacss/dev`, `@pandacss/preset-base` and `@pandacss/preset-panda` (all `^2.5.0`).
2. Point Panda at the package. No presets are needed, and `@kemo/ui` must not be in `include`.
   Set `jsxFramework: 'react'`, as the preview does: it is the setting that makes Panda extract
   style props and recipe variants from JSX. The library's preset carries the same value; stating
   it keeps the app's config explicit.

   ```ts
   // panda.config.ts
   import { defineConfig } from '@pandacss/dev'

   export default defineConfig({
     designSystem: '@kemo/ui',
     include: ['./src/**/*.{ts,tsx}'],
     outdir: 'styled-system',
     jsxFramework: 'react',
   })
   ```

   Do not set `prefix` or `hash`. The components get their class names at runtime from
   `packages/ui/styled-system`, which is generated from the library's config (neither option is
   set there), so the app's CSS has to use the same class names. If they differ, Panda warns with
   `design_system_option_mismatch` and the components render unstyled.

3. Run `panda codegen` before `dev`, `build` and `typecheck`; the preview does it in its `predev`,
   `prebuild` and `pretypecheck` scripts. Codegen writes the app's own `styled-system/`, and that
   is where `css`, `cva`, `styled`, `Stack` and the other helpers come from: its `css`, `jsx`,
   `patterns` and `recipes` modules re-export the matching `@kemo/ui/*` modules. Importing from
   `@kemo/ui/css`, `@kemo/ui/jsx`, `@kemo/ui/patterns`, `@kemo/ui/recipes` or `@kemo/ui/tokens`
   directly works too; Panda extracts styles from both import paths.
4. Use the PostCSS plugin `@pandacss/dev/postcss` and declare the layer order in the global CSS:

   ```css
   @layer reset, base, tokens, recipes, utilities;
   ```

5. Transpile the package. Its main export is TypeScript source (`"."` in
   `packages/ui/package.json` points at `./src/index.ts`), so the app's bundler has to compile it.
   In Next.js:

   ```ts
   // next.config.ts
   const nextConfig = { transpilePackages: ['@kemo/ui'] }
   ```

   With another bundler, make sure it transpiles TypeScript and TSX from `@kemo/ui` instead of
   treating the package as prebuilt JavaScript.

6. Provide DM Sans. The `fonts.body` and `fonts.heading` tokens are
   `var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif`. In Next.js use
   `next/font/google` (`DM_Sans` with `variable: '--font-dm-sans'`) and put its class on `<html>`.
   Elsewhere, a Google Fonts `<link>` or `@fontsource/dm-sans` registers the family as `DM Sans`,
   which the tokens pick up without the variable. `@fontsource-variable/dm-sans` registers
   `DM Sans Variable` instead, so with it set `--font-dm-sans: 'DM Sans Variable'`. If no DM Sans
   is loaded, text falls back to `ui-sans-serif, system-ui, sans-serif`.

The preset also carries a `jsxMatchTag` rule, `{ from: 'recharts', ignore: true }`, that stops Panda
treating Recharts props as style props. `jsxMatchTag` replaces rather than merges, so an app that
defines its own `jsxMatchTag` must include that rule in it.

Panda's `jsx` tracking covers the Park components by name. Add `staticCss: { recipes: '*' }` to
the app config only if you need every recipe variant pre-generated; the preview does, for its
component pages.

### Auth pages

`@kemo/ui` exports `SignInPage`, `RegisterPage`, `ForgotPasswordPage` and `CompleteProfilePage`
(client components), the `AuthLayout` shell they share, and their zod schemas. Each page is a
full-viewport gradient with an always-open drawer on the start side that stays in dark mode whatever
the host theme; it has no close button and Escape does not dismiss it.

The pages are presentational: they validate their form and call `onSubmit(values)`, and the host
does the rest, passing back `error` and `isSubmitting` and supplying `brand`, `logo`, `footer`,
`links` (hrefs) and, on sign in and register, single sign-on `providers`
(`{ id, label, icon?, onSelect }`; the icon is decorative and hidden from assistive technology).

Every page follows one submit contract: `onSubmit` may resolve or reject; a rejection keeps the
form, is passed to the optional `onSubmitError(error)`, and the page shows whatever you pass as
`error`. A rejection never escapes as an unhandled promise rejection, so a handler such as
`async (values) => { await signIn(values) }` can simply throw on bad credentials; set `error` from
`onSubmitError` (or catch inside `onSubmit`). `error` stays on screen until you change it. While
`onSubmit` is pending the submit button shows a spinner and ignores clicks; `isSubmitting`
overrides that state when you track it yourself.

Page-specific props are typed in `packages/ui/src/pages/auth/*-page.tsx`:

- `ForgotPasswordPage` shows its "Check your email" state once `onSubmit` resolves; a rejection
  keeps the form. `sent` forces the confirmation state on or off instead.
- `CompleteProfilePage` takes `identity` (`{ provider, email }`, shown in a chip and as the
  read-only Email field), optional `defaultValues` to prefill the username and names, and
  `onSignOut`, called by its "Sign out" button. It renders no links, so it accepts `linkComponent`
  only for symmetry with the other pages.

Hosting notes:

- The pages use the `fonts.body` token, so they need DM Sans as described in step 6 above
  (`--font-dm-sans`).
- Links render as Park's `Link` with a plain `href`. Pass the router's link as `linkComponent` for
  client-side navigation; in Next.js that is `linkComponent={NextLink}` (`next/link`). It receives
  `href`, `className` and `children`.
- On load the drawer focuses the element marked `data-autofocus`, which on every page is the first
  field. Without one (an `AuthLayout` you fill yourself) it focuses the first tabbable element, so
  give a linked logo `data-no-autofocus` to keep focus off it. When a page changes state (the sent
  state), focus moves to the new heading.

The preview wires each page to mock handlers: the route files in `apps/preview/src/app/(auth)`
render client demos from `apps/preview/src/components/auth/*-demo.tsx`, which use the mock data in
`apps/preview/src/lib/mock-auth.ts` and the `useMockSubmit` hook in
`apps/preview/src/lib/use-mock-submit.ts`. Submits resolve after 600 ms. One whose identifier or
email starts with `fail` (on complete profile, the username) rejects instead, and the demo shows
"Something went wrong. Try again." through `onSubmitError`. The two providers log to the console.

## Application shell and dashboard widgets

`@kemo/ui` also ships the signed-in surface of an app. Everything is presentational: data in through
props, nothing fetched.

- Shell: `AppShell` with `TopBar`, `SideNav`, `PageHeader` and `PageFooter` (each usable on its
  own), plus `AppShellProvider`, `useAppShell()`, `SkipLink` and `useMediaQuery`. `AppShell`
  renders the landmarks (`header`, `nav aria-label="Primary"`, `main`, `footer`) and a "Skip to
  content" link, and owns the responsive behaviour: a 240px side navigation from `lg`, a 56px icon
  rail from `md` (or when collapsed), and a drawer opened from the top bar below `md`.
- Widgets: `StatCard`, `ChartCard`, `LineChart`, `BarChart`, `DonutGauge`, `ArcGauge`,
  `SegmentedBar`, `StatusGrid`, `ProgressList`, `RankedBars`, `SmallMultiples`, `Sparkline`,
  `CalendarHeatmap`, `DataTableCard`, `EventStream`, `ActivityFeed`, `AlertBanner`, `EmptyState`
  and `QuickActions`, with the chart helpers `seriesColors`, `colorForSeries`, `foldSeries` and
  `ChartTooltip` and the types `Series`, `Point`, `TableData`, `Column`, `Delta` and `StatusTone`.
  `LineChart` and `BarChart` are built on Recharts; the rest is hand-rolled SVG and CSS.

Chart rules:

1. Series take the tokens `chart.1` to `chart.5` in a fixed order, never cycled; a sixth series
   and beyond fold into a gray "Other", and dark mode is the token flip.
2. The status palette (`green.9`, `amber.9`, `red.9`, `gray.6`) is reserved for state, never a
   series, and always comes with a label or glyph.
3. A chart with two or more series gets a legend, and every `ChartCard` has a "View as table"
   toggle that shows the same data as a table (the keyboard and screen-reader channel).

Using the shell in an app:

```tsx
'use client'
import { AppShell, type NavGroup, PageFooter, PageHeader, SideNav, TopBar } from '@kemo/ui'
import NextLink from 'next/link'
import type { ReactNode } from 'react'

const account = { initials: 'KM', name: 'Ken M.', menu: [{ label: 'Sign out' }] }
const status = { tone: 'good', text: 'All systems normal' } as const

export function Shell({ nav, children }: { nav: NavGroup[]; children: ReactNode }) {
  return (
    <AppShell
      topBar={<TopBar brand={{ name: 'Acme' }} account={account} />}
      sideNav={<SideNav groups={nav} linkComponent={NextLink} />}
      footer={<PageFooter product="Acme" version="v1.0.0" status={status} links={[]} />}
    >
      <PageHeader title="Overview" />
      {children}
    </AppShell>
  )
}
```

`linkComponent` is the router's link, used for every side-navigation item. It receives `href`,
`className`, `aria-current`, `onClick` and `children`, so it must forward the rest of its props and
its `ref` to the `<a>`; Next.js's `Link` does. Mark the current page with `active: true` on its nav
item.

The preview's `/dashboard` is the full example: a 12-column grid with every widget, built only
from these parts. The demo is in `apps/preview/src/components/dashboard/`, its shell
(`ConsoleFrame`, shared with the FAQ and Blank page demos) in
`apps/preview/src/components/console/console-frame.tsx` and its mock data in
`apps/preview/src/lib/mock-dashboard.ts`. `apps/preview/src/lib/use-live-events.ts` prepends the
next event of the `rotation` it is given every 4 seconds (keeping the newest 20) and takes a `paused`
option; the demo
pauses it while the pointer is over the Event stream card or focus is inside it, so its live
announcements can be stopped. The controls are inert: the selects (environment, workspace, time
range, service), the table tabs and the pager hold local state, and the buttons do nothing. The
demo builds its selects from Park's `Select` with `createListCollection` and `Portal`, which
`@kemo/ui` re-exports from Ark so a consumer needs no direct `@ark-ui/react` dependency.

## Status pages and console pages

Two more page families, presentational like the auth pages (the host supplies actions and data):

- Status pages, shown bare (no shell): `UnauthorizedPage` (401), `ForbiddenPage` (403),
  `NotFoundPage` (404), `ServerErrorPage` (500), `UnavailablePage` (503) and `MaintenancePage`, all
  thin wrappers over `StatusLayout`, plus `statusCopy` (the pinned copy), `mergeActions`,
  `StatusActionButton` (one action as a link or button) and the types `StatusAction`,
  `StatusActionButtonProps`, `StatusLayoutProps`, `StatusPageProps`, `StatusPageTone` and
  `MaintenancePageProps`. Each is the Nightfall gradient muted by the `gradients.status` token, in
  forced dark mode, with a decorative watermark, the message bottom-left and the request id and
  version in the footer.
- Console pages, rendered inside your `AppShell`: `FaqPage` (a topic index beside always-open,
  linkable answers), `BlankPage`, the `useCurrentSection` hook behind the index, and the types
  `FaqTopic`, `FaqQuestion`, `FaqPageProps` and `BlankPageProps`.

Every status page string is a prop. `actions` merge into the page's defaults by label, so
`{ label: 'Try again', onSelect: reset }` wires the default "Try again" and keeps the others; an
unknown label is appended. An action with `href` renders through `linkComponent`, one with
`onSelect` is a button, and one with neither is an inert button: there is no built-in
`history.back()` or reload. `MaintenancePage` adds `startedAt` and `expectedBackAt` (formatted
strings), and `refreshIntervalMs` calls `onRefresh` (default: reload) on that interval.

Wiring Next.js's boundaries, as the preview does:

```tsx
// app/error.tsx: Next renders this when a route below the root layout throws.
'use client'
import { ServerErrorPage } from '@kemo/ui'
import NextLink from 'next/link'

type Props = { error: Error & { digest?: string }; reset: () => void }

export default function ErrorBoundary({ error, reset }: Props) {
  const actions = [
    { label: 'Try again', onSelect: reset },
    { label: 'Go to dashboard', href: '/dashboard' },
  ]
  return <ServerErrorPage requestId={error.digest} actions={actions} linkComponent={NextLink} />
}
```

`app/not-found.tsx` stays a server component because only server files can export `metadata`; Next
answers unmatched URLs with a 404 status either way. Render `NotFoundPage` from a small
`'use client'` component when you pass `linkComponent={NextLink}`: a server component can't hand a
function to a client component. Only server errors carry `error.digest`; without one the footer
shows no request id. Next 16.3 and later also pass `retry`, which re-fetches the segment before
rendering it again.

The FAQ takes its questions as data:

```ts
interface FaqTopic {
  id: string // becomes the anchor #topic-{id}
  label: string
  questions: FaqQuestion[]
}
interface FaqQuestion {
  id: string // becomes the anchor #q-{id}
  question: string
  answer: ReactNode
}
```

Topic and question ids must be unique across the page, because they become DOM ids. `FaqPage` also
takes `title` (default "Frequently asked questions"), `description`, one outline `action` and
`linkComponent`. The index is a sticky column from `lg` and a scrollable row below it. It marks the
topic in view, or the one the URL hash names until the reader scrolls, so a clicked topic is marked
even when the page is too short to bring it to the top.

`BlankPage` is the starter for a new screen: a `PageHeader` (`title`, `context`, one solid `action`)
over a dashed `EmptyState` (`emptyMessage`, `emptyAction`) that your `children` replace. Copy
`apps/preview/src/components/console/blank-demo.tsx` to begin one.

In the preview, `/maintenance` and `/errors/401` to `/errors/503` render
`apps/preview/src/components/status/status-demo.tsx` with the props in
`apps/preview/src/lib/mock-status.ts`; `apps/preview/src/app/not-found.tsx` and `error.tsx` are the
real boundaries, and `/errors/throw` throws on render to show the second. `/faq` and `/blank`
render the demos in `apps/preview/src/components/console/` inside `ConsoleFrame`, with "Help"
current on the FAQ, and the questions are in `apps/preview/src/lib/mock-faq.ts`.

## Access page and DataTable

The console's Access page, and the table every later list page starts from. Presentational like the
rest: rows and handlers come in through props, and the host keeps the state.

- `DataTable` (widget): a Park `Table` with sortable headers, a search box, checkbox and select
  filters with live counts (a rail from `lg`, a "Filters" drawer below), row selection that
  survives paging and filtering, a "Bulk actions" menu, per-row action menus, an "+ Add" button,
  pagination (10 rows a page) and a polite live region. Also `ActionMenu`, `DataTableFilters`,
  `DataTablePager`, `dataTableFeatures` and the types `DataTableProps`, `DataTableColumn`,
  `DataTableFilter`, `ActionItem` and `Option`.
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

## Deployments pages, YamlEditor and SchemaBrowser

The console's Deployments pages: a list of Kubernetes `apps/v1` Deployments across the clusters and
namespaces a reader picks, and a page per Deployment with Overview, YAML and Events tabs. They bring
the design system its code editor, a CodeMirror 6 YAML editor with JSON Schema lint, hover and
completion, and a schema browser that shows each field's type, description, enum and default.
Presentational like the rest: the host fetches, derives and keeps every value, and gets every action
back as a callback. Exports from `@kemo/ui`:

- Deployment-specific (`pages/deployments`): `DeploymentsListPage` (header with "+ Create
  deployment", the `ScopeBar` of Clusters and Namespaces pickers, then a `DataTable` with Status,
  Labels and Namespace filters, row actions Scale…, Restart, Pause|Resume, Edit YAML and Delete,
  and bulk Restart, Pause, Resume and Delete), `DeploymentDetailPage` (the shell, the actions and
  the three tabs), `DeploymentOverview` (tiles, details, conditions, related objects), `ScaleDialog`,
  the cells `DeploymentStatusBadge`, `ReadyCell`, `LabelChips` and `AgeCell`,
  `deploymentStatusOptions`, the bundled `deploymentSchema`, `scopedNamespaces` and
  `CREATED_BY_ANNOTATION` (the annotation the Overview reads "by {creator}" from).
- Kind-agnostic (`pages/resources`): `ResourceDetailShell` (breadcrumb, name and status badge,
  context line, actions, tab links), `ResourceYamlTab` (Save, Reload, Download, the status line,
  the editor, its problems and the schema browser; also a create mode), `ResourceEventsTab` (type
  and scope filters, a live mode that holds still for a reader), `ShortcutsDialog`,
  `SchemaRegistry`, `schemaFor`, `defaultSchemaRegistry` and `downloadText`.
- Widgets: `YamlEditor`, `useYamlDocument`, `SchemaBrowser` and `resolveNode`; `DataTable` gains a
  `tags` filter kind (`key=value` chips; a row matches when it has every chip) and a `countLabel`.
- Helpers (`lib/kubernetes`, no UI): the types (`DeploymentResource`, `DeploymentSummary`,
  `RelatedObjects`, `K8sEvent`, `ScopeValue`, `ClusterOption`, …), `deploymentStatus`,
  `summarize`, `cleanResource`, `cleanYaml`, `toYaml`, `parseYaml`, `pathAtOffset`,
  `offsetForPath` and `relativeAge`.

`YamlEditor` imports CodeMirror with `import()` once it mounts, so only a page that shows an editor
loads it, and until then (and on the server) it renders the text in a `pre` of the same height, so
the YAML tab prerenders and hydrates without a jump; no `next/dynamic` is needed. Its theme is a
CodeMirror theme and highlight style built from Park tokens' CSS variables (`token.var`), so the
light and dark switch on `<html>` recolours it with no second theme: keys `fg.default`, strings
`green.11`, numbers `amber.11`, booleans and null `blue.11`, comments `fg.subtle`, the cursor line
`gray.a2`, the selection `blue.a4`, errors underlined `red.9`. Save in the YAML tab waits for the
editor to load, then checks the text it sends against the schema (the linter itself runs half a
second after an edit).

A host wires the list to its data and keeps the scope:

```tsx
'use client'
import { type DeploymentSummary, DeploymentsListPage, type ScopeValue, summarize } from '@kemo/ui'
import NextLink from 'next/link'
import { useState } from 'react'
import { api, clusters, useDeployments } from './api' // your client

const detailHref = (row: DeploymentSummary) =>
  `/deployments/${row.cluster}/${row.namespace}/${row.name}`

// `now`: the server's time (an ISO string), so the server and client renders agree on the ages.
export function Deployments({ now }: { now: string }) {
  const [scope, setScope] = useState<ScopeValue>({ clusters: [], namespaces: [] }) // [] is "All"
  const items = useDeployments(scope) // { cluster, resource }[] in the scope
  return (
    <DeploymentsListPage
      scope={scope}
      onScopeChange={setScope} // persist it: the preview keeps it in localStorage
      clusters={clusters} // { id, label, namespaces }[]
      rows={items.map(({ cluster, resource }) => summarize(resource, cluster))}
      now={now}
      detailHref={detailHref} // its YAML tab is `${detailHref(row)}/yaml`
      createHref="/deployments/new"
      linkComponent={NextLink}
      onScale={(id, replicas) => api.scale(id, replicas)} // a rejection shows in the dialog
      onRestart={(ids) => api.restart(ids)}
      onSetPaused={(ids, paused) => api.setPaused(ids, paused)}
      onDelete={(ids) => api.delete(ids)}
    />
  )
}
```

The detail page takes the Deployment, its summary, the objects around it (the host derives them:
the library renders what it is given), its events, and the YAML as text with the host's draft:

```tsx
<DeploymentDetailPage
  deployment={resource}
  cluster={cluster}
  summary={summarize(resource, cluster)}
  related={related} // RelatedObjects: pods, replicaSets, services, ingresses, configMaps, …
  events={events} // K8sEvent[]: the Deployment's and its ReplicaSets' and Pods'
  liveEvents // a streaming note; the rows hold still while the pointer or focus is on them
  tab={tab} // 'overview' | 'yaml' | 'events', from the URL
  tabHref={(t) => (t === 'overview' ? base : `${base}/${t}`)}
  listHref="/deployments"
  linkComponent={NextLink}
  now={now}
  schema={schemaFor(defaultSchemaRegistry, 'apps/v1', 'Deployment') ?? deploymentSchema}
  yamlText={yamlText} // the server copy, e.g. toYaml(resource)
  draft={draft} // the host keeps the edit, so it outlasts a tab switch
  onDraftChange={setDraft} // undefined once saved, discarded or undone
  onSaveYaml={(text) => api.apply(text)} // a rejection keeps the draft and shows its message
  serverChanged={serverChanged} // "Server copy changed · Reload to see it"
  onScale={(id, replicas) => api.scale(id, replicas)}
  onRestart={(ids) => api.restart(ids)}
  onSetPaused={(ids, paused) => api.setPaused(ids, paused)}
  onDelete={(ids) => api.delete(ids).then(() => router.push('/deployments'))}
/>
```

Hold the draft (and anything else that must outlast a tab) above the `[[...tab]]` page, in a layout
or a store: Next remounts a page when its params change. Save is disabled until the text differs
from `yamlText` and blocked while the editor reports a problem; Reload asks before it discards a
draft. "Download YAML" saves the text as shown; "Download clean YAML" saves `cleanYaml(resource)`,
the resource without `metadata.uid`, `resourceVersion`, `generation`, `creationTimestamp`,
`managedFields`, `selfLink`, the `kubectl.kubernetes.io/last-applied-configuration` annotation and
`status`, keys in their original order and indented by two spaces (`cleanResource` returns the
same as an object).

The YAML tab, the editor and the schema browser take any JSON Schema (draft-07 style, such as a
CRD's `openAPIV3Schema` or one converted from a cluster's OpenAPI v3), resolving `$ref`, `allOf`,
`properties`, `items`, `additionalProperties` and `oneOf`/`anyOf`, and ignoring the
`x-kubernetes-*` extensions. A `SchemaRegistry` holds one per kind, keyed
`{apiVersion}/{kind}`; `defaultSchemaRegistry` has the bundled `apps/v1/Deployment` (trimmed to the
fields a Deployment author touches, every one with its description), and a host adds its own:

```ts
import { defaultSchemaRegistry, schemaFor, type SchemaRegistry } from '@kemo/ui'
import httpRouteSchema from './schemas/httproute.json'

const registry: SchemaRegistry = {
  ...defaultSchemaRegistry,
  'gateway.networking.k8s.io/v1/HTTPRoute': httpRouteSchema,
}
// undefined for an unknown kind: the editor still flags YAML syntax, with no schema lint or browser
const schema = schemaFor(registry, resource.apiVersion, resource.kind)
```

Only the list's columns and the Overview know what a Deployment is. A page for another kind, a
Gateway API object or a CRD, composes `ResourceDetailShell` with its own overview and actions and
reuses `ResourceYamlTab` (with its schema) and `ResourceEventsTab` (`parentKind` names the
object, `childKinds` the kinds counted as its children) unchanged.

In the preview, `/deployments`, `/deployments/new` and
`/deployments/{cluster}/{namespace}/{name}[/yaml|/events]` are
`apps/preview/src/app/deployments/`: the segment's `layout.tsx` renders `DeploymentsDemoShell`
(the console frame and the state), so the list, the create page and the detail tabs share one
state and a YAML draft survives a trip to another tab or page; the detail route prerenders the
three tabs of every seeded Deployment with `generateStaticParams` and answers an unknown cluster,
namespace or tab with `notFound()`. A name the server has not prerendered is checked in the
browser instead, where the Deployments created during the visit live: an unknown one shows the 404
page once the page has hydrated. The demos are in `apps/preview/src/components/deployments/`, and
every control works on in-memory state through `deploymentsReducer` in
`apps/preview/src/lib/deployments-reducer.ts`: the scope (kept in `localStorage` under
`kemo.deployments.scope`), Scale, Restart (the rollout runs for three seconds), Pause and Resume,
Delete, the YAML draft per Deployment, Save (kind, name and namespace can't change; a new pod
template rolls out like a restart), Create, and the live events of the Events tab. The mock data,
generated from seed lists and a string hash so the server and client renders match, is in
`apps/preview/src/lib/mock-deployments.ts`: 3 clusters, 45 Deployments (38 available, 4
progressing, 2 degraded, 1 paused; three run a sidecar), the objects around each, derived from
their specs (`relatedFor`: pods, ReplicaSets, the Service whose selector matches, an Ingress, the
ConfigMaps, Secrets and PVCs the pods read, an autoscaler for a few, the service account) and 8 to
14 events each (`eventsFor`).

## Blog pages

A blog family, presentational like the others: posts and comments come in as props, the host
supplies the routes, `linkComponent`, and what happens on subscribe and on a new comment. Three
variations of the same index and post pages, picked with `variant` or rendered directly:

| `variant`        | Title               | Index                                          | Post                                 |
| ---------------- | ------------------- | ---------------------------------------------- | ------------------------------------ |
| `editorial-list` | Editorial list      | Featured block, topic buttons, dated rows      | Single column, byline, previous/next |
| `magazine-grid`  | Magazine grid       | Hero, topic tabs, three-column cards, paginate | Cover banner, share and copy link    |
| `journal-rail`   | Journal with a rail | Rail (topics, subscribe) beside a feed         | Rail with "On this page" and details |

Exports from `@kemo/ui`: `BlogIndexPage` and `BlogPostPage` (each renders the variation named by
`variant`), `BlogLayout` (the top bar and footer), `BlogComments`, `SubscribeForm`, `BlogCover`,
`BlogProse`, `blogVariants` (the ids, titles and descriptions above) and the types `BlogVariant`,
`BlogPost`, `BlogBlock`, `BlogComment`, `BlogAuthor`, `BlogTopic`, `BlogCoverSpec`,
`BlogChromeProps` (the props every page shares), `BlogIndexPageProps`, `BlogPostPageProps`,
`BlogLayoutProps`, `BlogCoverProps`, `SubscribeFormProps` and `BlogCommentsProps`.

A post is data, and its body is a list of typed blocks:

```ts
interface BlogPost {
  slug: string // unique; keys, and the cover preset when `cover` is omitted
  title: string
  summary: string
  topic: BlogTopic // { id, label }
  author: BlogAuthor // { id, name, role?, avatarSrc? }
  publishedAt: string // ISO 8601; shown as an absolute UTC date, "11 Nov 2026"
  readingMinutes: number
  featured?: boolean // the newest featured post leads the index
  cover?: BlogCoverSpec
  tags?: string[]
  body: BlogBlock[]
}
// paragraph | heading (2 or 3) | list | quote | code | callout (neutral or warning) | stats | figure
```

A host wires the pages like this (the preview does it in
`apps/preview/src/components/blog/blog-demo.tsx`). The wiring lives in a `'use client'` component:
`postHref`, `linkComponent` and the handlers are functions, which a server component can't hand to
a client one. A server page can load the posts and render that component.

```tsx
'use client'
import { BlogIndexPage, BlogPostPage, type BlogChromeProps } from '@kemo/ui'
import NextLink from 'next/link'

const chrome: BlogChromeProps = {
  variant: 'editorial-list',
  brand: 'Kemo',
  indexHref: '/blog',
  postHref: (post) => `/blog/${post.slug}`,
  linkComponent: NextLink,
  onSubscribe: async (email) => {
    await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) }) // throw to fail
  },
}

<BlogIndexPage {...chrome} title="Notes from the platform team" posts={posts} />
<BlogPostPage {...chrome} post={post} posts={posts} />
```

Inline markup in a paragraph, list item, quote or callout is plain React: use the Park `Code` for
inline code and `Link` for links (`<Code>req_7f3a91</Code>`, `<Link href="/docs">the docs</Link>`),
and a `code` block for multi-line code. A cover is either a generated gradient preset
(`{ preset: 1 }` to `{ preset: 6 }`, picked from the slug when omitted) or an image
(`{ src, alt }`). On the index the topic filter is controlled whenever the `topic` key is passed,
even as `undefined` (all posts), with or without `onTopicChange`: it shows that topic until the
prop changes, so pass both for a filter the reader can move. Leave `topic` out and the filter keeps
its own state, starting at `defaultTopic`; `onTopicChange` is called on every change either way.
`indexTitle` sets the post's back link in Editorial list and Journal ("All posts" by default; the
preview passes "Platform journal" to the Journal); Magazine grid has no back link and ignores it.
`footer` fills the left of the footer row; on a Journal post it replaces the link to the older
post. The footer prints the current year; pass `year` to pin it in a statically generated page.
Omit `onSubscribe` to drop every subscribe control.

Comments are opt-in. Pass `comments` (`BlogComment[]`, oldest first on the page, one level of
replies) and `onAddComment` to `BlogPostPage` for the section and its form; omit both for none, or
pass only `comments` for a read-only thread. The host stores and returns the comments: the form
calls `onAddComment({ name, body, parentId? })`, and once it resolves the host adds the comment to
the list it passes back. Reject (an `Error`'s message is shown) to keep the text and say why.
Bodies are plain text; markup is shown as text, not rendered.

```tsx
const [comments, setComments] = useState(initial)
<BlogPostPage
  {...chrome}
  post={post}
  posts={posts}
  comments={comments}
  onAddComment={async ({ name, body, parentId }) => {
    const saved = await api.addComment(post.slug, { name, body, parentId }) // throws on failure
    setComments((current) => withComment(current, saved, parentId))
  }}
/>
```

Not included: search, topic and author pages, RSS, Markdown parsing, and comment moderation or
sign-in. A name and a comment is all the form asks for.

In the preview, `/blog` redirects to `/blog/editorial-list`; `/blog/<variation>` is the index and
`/blog/<variation>/<slug>` a post, for the three variations. The posts and comments are in
`apps/preview/src/lib/mock-blog.tsx`: eight posts across four topics, with seed comments on three of them.
An address or comment that contains "fail" is rejected, so both error states can be tried. The
preview panel lists the six pages under "Blog".

## Testing

| Command                      | What it runs                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `make test` (`pnpm test`)    | Vitest in `packages/ui`, then Node's test runner for `scripts/`    |
| `pnpm test:scripts`          | Only the `scripts/park-ui` tests                                   |
| `make e2e-install`           | Once: installs Chromium for Playwright (`pnpm e2e:install`)        |
| `make e2e` (`pnpm test:e2e`) | Builds, then runs the Playwright smoke suite in `apps/preview/e2e` |
| `make check`                 | Lint, format check, typecheck and unit tests                       |

The e2e suite loads every route (landing page, auth pages, component pages, dashboard, Access tabs,
Deployments pages, FAQ, Blank page, blog pages and status pages) and fails on any console error or uncaught page error. It also checks the
theme (font, radii), dark mode through the preview panel's theme toggle, and that the panel
navigates, closes and marks the current page. On the auth pages, where any uncaught page error (such
as an escaped `onSubmit` rejection) fails the test, it checks validation and the mock error on every
form, the sent state and that its heading takes focus, the read-only email, that a click on the
terms link leaves the checkbox alone, and that the drawer stays dark in a light host, ignores
Escape, fills a 375px viewport with the paired fields stacked, and leaves the preview panel usable.
On the dashboard it checks the shell's landmarks and the nine card titles, the chart's table toggle,
that dark mode changes the series colours, the icon rail just below `lg` (1023px), the navigation
drawer and no horizontal overflow at 375px, and that the live event stream grows. On the status and
console pages it checks that the 404 heading is light on the gradient with both actions and no
overflow at 375px, that an unknown URL answers 404 with the status page, that the error boundary
shows the 500 page and "Try again" renders the route again, the maintenance window, and that the FAQ
index jumps to a topic and marks it current (also the last topic at 1440×900, which the page cannot
scroll to the top) and a question's anchor sets the hash. On the Access page it checks that the tabs
are links that mark the current tab, that the users table searches and filters, that "Bulk actions"
follows the selection, adding a user through the dialog and disabling one from its row menu, the
Overview widgets, the Audit layout and the OIDC sync badges, that an unknown tab answers 404, and
at 375px the scrolled tab strip, the "Filters" drawer and no horizontal overflow. On the
Deployments pages it checks that a cluster scope narrows the list and survives a reload, the labels
filter, opening a Deployment from the list, switching the related kinds, editing replicas in the
YAML editor and saving after a trip to the Overview (the draft is still there), that a schema
problem blocks Save, that the schema browser follows the cursor, that "Download clean YAML" has no
`resourceVersion` or `status`, the Events filters, and at 375px the stacked scope pickers, the
"Filters" drawer and no horizontal overflow. On the blog pages
it checks every variation from index to post and back and the topic filter, pagination, the
subscribe dialog and rail (and its failure) and that focus lands on the confirmation, posting a
comment and a reply (focus returns to Reply) and posting without `crypto.randomUUID`, a rejected and
a long comment, the empty state, the Magazine post's centred reading column, the Journal's current
section, its rail resting above Copy link at the end of the post, and at 375px its rail and a Tab
order that runs down the page, Copy link and dark mode. It runs against a built preview, so build first (`make e2e` does).

## CI

GitHub Actions runs three jobs:

- `check`: install, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`
- `e2e`: `pnpm build`, `pnpm e2e:install`, `pnpm test:e2e`
- `container`: builds the image with the Containerfile and pushes it to GHCR

All of it can be reproduced locally with `make`.

## Container

The Containerfile builds on a UBI 9 Node 24 image, runs the Next.js standalone server on port
8080 as user 1001, and is built with `make container-build` and run with `make container-run`.
`CONTAINER_ENGINE` (default `podman`) and `IMAGE` (default `kemo-design-system:local`) can be
overridden, for example `make container-build CONTAINER_ENGINE=docker`. The build needs network
access because `next build` fetches DM Sans from Google Fonts.

## Roadmap

1. Done: design phase for the four auth pages (Login, Forgot Password, Register, Complete
   Profile); spec in `docs/superpowers/specs/2026-11-09-auth-pages-design.md`.
2. Done: page templates under `packages/ui/src/pages/auth`, exported from `@kemo/ui` (see
   [Auth pages](#auth-pages)).
3. Done: application shell and overview dashboard widgets, exported from `@kemo/ui`, with the
   `/dashboard` demo in the preview (see
   [Application shell and dashboard widgets](#application-shell-and-dashboard-widgets)); spec in
   `docs/superpowers/specs/2026-11-10-dashboard-design.md`.
4. Done: status pages (401, 403, 404, 500, 503, Maintenance) and console pages (FAQ, Blank page),
   exported from `@kemo/ui`, with preview routes and the preview's `not-found` and `error`
   boundaries wired to them (see [Status pages and console pages](#status-pages-and-console-pages));
   spec in `docs/superpowers/specs/2026-11-11-status-and-console-pages-design.md`.
5. Done: the Access page (ten tabs: Overview, six object tables, Audit, OIDC, Settings) and the
   `DataTable` widget on TanStack Table v9, exported from `@kemo/ui`, with the `/access` demo in the
   preview (see [Access page and DataTable](#access-page-and-datatable)); spec in
   `docs/superpowers/specs/2026-11-11-access-page-design.md`.
6. Done: blog pages in three variations (Editorial list, Magazine grid, Journal with a rail) with
   comments, exported from `@kemo/ui`, with the `/blog` demos in the preview (see
   [Blog pages](#blog-pages)); spec in `docs/superpowers/specs/2026-11-12-blog-pages-design.md`.
7. Done: the Deployments pages (list with cluster and namespace scope; detail with Overview, YAML
   and Events), the CodeMirror `YamlEditor`, the `SchemaBrowser` and the kind-agnostic resource
   tabs, exported from `@kemo/ui`, with the `/deployments` demo in the preview (see
   [Deployments pages, YamlEditor and SchemaBrowser](#deployments-pages-yamleditor-and-schemabrowser));
   spec in `docs/superpowers/specs/2026-11-11-deployments-page-design.md`.
8. Publishing `@kemo/ui`, once the package prefix is decided.
