# kemo-design-system

A React design system and the live preview app used to design with it. `@kemo/ui` is a Park UI
component library (Ark UI headless components styled with Panda CSS recipes) with a fixed theme.
`@kemo/preview` is a Next.js app that renders the components on standalone pages and the first
page set, the auth pages: Login, Forgot Password, Register and Complete Profile (for OIDC logins
whose scopes or mappers leave the profile incomplete). Other Kemo apps are meant to consume
`@kemo/ui` so a token or component change lands everywhere.

This repository holds the tooling, theme, components, the page sets (auth, the application shell
and dashboard widgets, status and console pages, the Access page and its `DataTable`, the
Deployments pages with their YAML editor and schema browser, the blog pages, the forum pages), the
preview and CI. Each part has a guide under `docs/`; see [Documentation](#documentation).

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
docs/                Guides for each part of the repo; docs/gallery/ the screenshots; docs/superpowers/ the specs and plans
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

## Documentation

| Guide                                                                        | What it covers                                                                    |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| [Development](docs/development.md)                                           | The dev loop (`make dev`, codegen vs `lib`), testing, CI and the container        |
| [Adding Park UI components](docs/park-ui.md)                                 | The registry sync script and the Panda v2 port                                    |
| [Consuming @kemo/ui from another app](docs/consuming.md)                     | Wiring the design system into another Next.js app                                 |
| [Auth pages](docs/auth-pages.md)                                             | Login, Register, Forgot Password and Complete Profile                             |
| [Application shell and dashboard widgets](docs/dashboard.md)                 | `AppShell`, the widget family and the chart rules                                 |
| [Status pages and console pages](docs/status-pages.md)                       | 401, 403, 404, 500, 503, Maintenance, FAQ and the Blank page                      |
| [Access page and DataTable](docs/access-page.md)                             | The ten-tab Access page and the `DataTable` widget                                |
| [Deployments pages, YamlEditor and SchemaBrowser](docs/deployments-pages.md) | The list and detail pages, the CodeMirror editor and the pluggable schema browser |
| [Blog pages](docs/blog-pages.md)                                             | Three blog variations with comments                                               |
| [Forum pages](docs/forum-pages.md)                                           | Three forum variations: Boards, Discussions feed and Q&A desk                     |
| [Gallery](docs/gallery/README.md)                                            | A screenshot of every page, by family (`make gallery` regenerates it)             |

Design specs and implementation plans for each phase live under `docs/superpowers/`.

## Roadmap

1. Done: design phase for the four auth pages (Login, Forgot Password, Register, Complete
   Profile); spec in `docs/superpowers/specs/2026-11-09-auth-pages-design.md`.
2. Done: page templates under `packages/ui/src/pages/auth`, exported from `@kemo/ui` (see
   [Auth pages](docs/auth-pages.md)).
3. Done: application shell and overview dashboard widgets, exported from `@kemo/ui`, with the
   `/dashboard` demo in the preview (see
   [Application shell and dashboard widgets](docs/dashboard.md)); spec in
   `docs/superpowers/specs/2026-11-10-dashboard-design.md`.
4. Done: status pages (401, 403, 404, 500, 503, Maintenance) and console pages (FAQ, Blank page),
   exported from `@kemo/ui`, with preview routes and the preview's `not-found` and `error`
   boundaries wired to them (see [Status pages and console pages](docs/status-pages.md));
   spec in `docs/superpowers/specs/2026-11-11-status-and-console-pages-design.md`.
5. Done: the Access page (ten tabs: Overview, six object tables, Audit, OIDC, Settings) and the
   `DataTable` widget on TanStack Table v9, exported from `@kemo/ui`, with the `/access` demo in the
   preview (see [Access page and DataTable](docs/access-page.md)); spec in
   `docs/superpowers/specs/2026-11-11-access-page-design.md`.
6. Done: blog pages in three variations (Editorial list, Magazine grid, Journal with a rail) with
   comments, exported from `@kemo/ui`, with the `/blog` demos in the preview (see
   [Blog pages](docs/blog-pages.md)); spec in `docs/superpowers/specs/2026-11-12-blog-pages-design.md`.
7. Done: the Deployments pages (list with cluster and namespace scope; detail with Overview, YAML
   and Events), the CodeMirror `YamlEditor`, the `SchemaBrowser` and the kind-agnostic resource
   tabs, exported from `@kemo/ui`, with the `/deployments` demo in the preview (see
   [Deployments pages, YamlEditor and SchemaBrowser](docs/deployments-pages.md));
   spec in `docs/superpowers/specs/2026-11-11-deployments-page-design.md`.
8. Done: the forum pages in three variations (Boards, Discussions feed, Q&A desk), each a front
   page, a category page, a topic page and a composer, exported from `@kemo/ui`, with the `/forum`
   demos in the preview (see [Forum pages](docs/forum-pages.md)); spec in
   `docs/superpowers/specs/2026-11-12-forum-pages-design.md`.
9. Publishing `@kemo/ui`, once the package prefix is decided.
