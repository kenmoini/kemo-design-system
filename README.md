# kemo-design-system

A React design system and the live preview app used to design with it. `@kemo/ui` is a Park UI
component library (Ark UI headless components styled with Panda CSS recipes) with a fixed theme.
`@kemo/preview` is a Next.js app that renders the components on standalone pages and the first
page set, the auth pages: Login, Forgot Password, Register and Complete Profile (for OIDC logins
whose scopes or mappers leave the profile incomplete). Other Kemo apps are meant to consume
`@kemo/ui` so a token or component change lands everywhere.

This repository holds the tooling, theme, components, auth pages, the application shell and
dashboard widgets, the preview and CI (see [Auth pages](#auth-pages),
[Application shell and dashboard widgets](#application-shell-and-dashboard-widgets) and
[Roadmap](#roadmap)).

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
apps/preview/        @kemo/preview: component pages, auth and dashboard demos, Playwright e2e suite
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

`@kemo/ui` is not published yet (see [Roadmap](#roadmap), item 4), so for now only apps inside
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
from these parts. The demo is in `apps/preview/src/components/dashboard/` and its mock data in
`apps/preview/src/lib/mock-dashboard.ts`. `apps/preview/src/lib/use-live-events.ts` prepends a
mock event to the stream every 4 seconds (keeping the newest 20) and takes a `paused` option; the
demo pauses it while the pointer is over the Event stream card or focus is inside it, so its live
announcements can be stopped. The controls are inert: the selects (environment, workspace, time
range, service), the table tabs and the pager hold local state, and the buttons do nothing. The
demo builds its selects from Park's `Select` with `createListCollection` and `Portal`, which
`@kemo/ui` re-exports from Ark so a consumer needs no direct `@ark-ui/react` dependency.

## Testing

| Command                      | What it runs                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `make test` (`pnpm test`)    | Vitest in `packages/ui`, then Node's test runner for `scripts/`    |
| `pnpm test:scripts`          | Only the `scripts/park-ui` tests                                   |
| `make e2e-install`           | Once: installs Chromium for Playwright (`pnpm e2e:install`)        |
| `make e2e` (`pnpm test:e2e`) | Builds, then runs the Playwright smoke suite in `apps/preview/e2e` |
| `make check`                 | Lint, format check, typecheck and unit tests                       |

The e2e suite loads every route (landing page, auth pages, component pages) and fails on any
console error or uncaught page error. It also checks the theme (font, radii), dark mode through the
preview panel's theme toggle, and that the panel navigates, closes and marks the current page. On
the auth pages, where any uncaught page error (such as an escaped `onSubmit` rejection) fails the
test, it checks validation and the mock error on every form, the sent state and that its heading
takes focus, the read-only email, that a click on the terms link leaves the checkbox alone, and
that the drawer stays dark in a light host, ignores Escape, fills a 375px viewport with the paired
fields stacked, and leaves the preview panel usable. On the dashboard it checks the shell's
landmarks and the nine card titles, the chart's table toggle, that dark mode changes the series
colours, the icon rail just below `lg` (1023px), the navigation drawer and no horizontal overflow
at 375px, and that the live event stream grows. It runs against a built preview, so build first
(`make e2e` does).

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
4. Publishing `@kemo/ui`, once the package prefix is decided.
