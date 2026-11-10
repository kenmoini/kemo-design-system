# Design: application shell and overview dashboard

Date: 2026-11-10. Status: approved in chat after a visual brainstorm (direction "Console", treatment "comfortable, outlined").
Builds on: `docs/superpowers/specs/2026-11-09-design-system-scaffold-design.md` (repo conventions) and
`docs/superpowers/specs/2026-11-09-auth-pages-design.md` (page-component contract: presentational, props-driven).

## Intent

`@kemo/ui` ships the pieces an application needs for its signed-in surface: an application shell (top bar,
side navigation, page header, page footer) and a family of dashboard widgets (stat tiles, charts, status grid,
tables, streams, feeds, progress). The preview app shows an exhaustive overview dashboard built only from those
pieces, so the next app can copy it, drop widgets, or add its own. It is a demo of ensembles, not a product.

## The look (chosen: Console, comfortable and outlined)

- **Shell**: light by default, Park dark mode via the existing theme toggle. A 240px side navigation on the
  left (`gray.surface.bg`, 1px right border `border`), a 56px top bar across the content (`gray.surface.bg`, 1px
  bottom border), the page content on `canvas`, and the page footer at the end of the content column (not
  fixed). Below the `lg` breakpoint the side navigation collapses to a 56px icon rail; below `md` it is hidden
  and opened as a Park `Drawer` from a menu button in the top bar.
- **Top bar**: brand (logo slot + name), a search field (`Input` with a `Kbd` "⌘K" hint, placeholder "Search
  services, deployments, users"), an environment selector (Park `Select`, e.g. "prod-us-east"), help and
  notifications icon buttons (notifications with a count `Badge`), and an `Avatar` that opens a `Menu`
  (Profile, Settings, Sign out). A visually hidden "Skip to content" link is the first focusable element.
- **Side navigation**: groups with small muted labels ("Platform", "Manage"); items with a lucide icon, label,
  optional count badge; the active item uses `gray.subtle.bg` with `fg.default`; a footer slot (workspace
  switcher as a `Select`) and a "Collapse sidebar" control.
- **Page header**: `Heading as="h1"` "Overview" (`textStyle: 2xl`, semibold, tight tracking), a muted context
  line ("Tuesday, November 10 · updated 12 seconds ago" is rendered as two `Text` spans separated by spacing,
  not a middle dot), and an actions row on the right: time range `Select` ("Last 24 hours"), service `Select`
  ("All services"), "Export" (`outline`), "+ Add widget" (`solid`).
- **Grid**: 12-column CSS grid, `gap: 4` (16px). The approved mockup is committed at
  `docs/superpowers/specs/assets/2026-11-10-dashboard-mockup.html` (open it in a browser; the large top screen is
  the reference, the "comfortable, outlined" treatment is the chosen one). Slot map, top to bottom:
  1. `AlertBanner` (12): "Incident INC-418", checkout-api p95 latency above 300 ms, action "Open incident".
  2. Four `StatCard` (3 each): Requests per minute 12,480 ▲ 8.2% vs yesterday; Error rate 0.31% ▼ 0.04 pts; p95
     latency 184 ms ▲ 12 ms slower (bad); Active users 8,214 ▲ 3.1% this week. Each with a sparkline.
  3. `ChartCard` "Requests per minute" (8) holding a `LineChart` with three series API, Web, Jobs; `ChartCard`
     "Capacity" (4) holding a `DonutGauge` (CPU 70%, caption lines) above a `SegmentedBar` (Storage 2.4 of 4 TB:
     Objects, Databases, Logs).
  4. `ChartCard` "Deployments per day" (4) with a grouped `BarChart` (Succeeded, Rolled back, 7 days);
     `ChartCard` "Node health" (4) with a `StatusGrid` (48 cells: 45 good, 1 warning, 1 critical, 2 off, legend
     Ready / Pressure / NotReady / Cordoned); `ChartCard` "Top endpoints" (4) with `RankedBars` (5 endpoints).
  5. `DataTableCard` "Recent deployments" (8): tabs All / Production / Staging / Failed, columns Service, Version,
     Environment, By, Status (badge), Latency (sparkline), When; 5 rows, pager "Showing 5 of 128"; a card (4)
     holding `ProgressList` "Rollouts" (4 items, one failed at 41%) above `SmallMultiples` "Regions" (4 regions).
  6. `EventStream` "Event stream" (4, 5 events with critical/info/warning/good tones); `ActivityFeed`
     "Activity" (4, 5 items); a card (4) holding `CalendarHeatmap` "Deploy frequency" (16 weeks) above an
     `EmptyState` ("No scheduled maintenance. Schedule a window").
  7. `PageFooter`.
     The nine titled chart/table cards the e2e asserts are: Requests per minute, Capacity, Deployments per day,
     Node health, Top endpoints, Recent deployments, Rollouts, Event stream, Activity. Below `lg` cards span 6;
     below `md` 12.
- **Cards**: Park `Card` `outline` variant (radius `l3`), padding `4`, header row with a semibold `md` title
  and a muted `xs` caption on the right. Headline numbers `textStyle: 2xl`, semibold, tight tracking; deltas
  `xs` with ▲/▼ in `green.11`/`red.11` and a text suffix ("vs yesterday"), never color alone.
- **Footer**: `Text xs` muted: product name and version on the left, a status dot + "All systems normal" in the
  middle, links (Docs, Support, Status, Privacy) on the right with spacing, no separators.
- **Motion**: none on load. Hover tooltips on charts answer the pointer; nothing else animates.

## Chart layer (the dataviz skill's rules, applied)

- **Library**: Recharts 3.x (SVG; React 19 compatible; line, area, bar, stacked bar, pie/donut, radial gauge,
  tooltip, legend, responsive container). Sparklines, arc gauges, the status grid, the segmented bar and the
  calendar heatmap are hand-rolled SVG/CSS components in `@kemo/ui` (simpler, lighter, token-driven).
- **Series palette** (categorical, fixed order, never cycled; validated with the dataviz validator on Park's
  `#fcfcfc` light and `#191919` dark surfaces): semantic tokens `colors.chart.1 … chart.5` with values
  light/dark `#2a78d6`/`#3987e5`, `#eb6834`/`#d95926`, `#1baf7a`/`#199e70`, `#eda100`/`#c98500`,
  `#e87ba4`/`#d55181`. A sixth series folds into "Other". Charts read these through CSS variables so dark mode
  is the token flip. Ink: `fg.default`, `fg.muted`, `fg.subtle`; gridlines `border`; axis baseline `gray.7`.
- **Status palette** (reserved, never a series): Park `green.9` (good), `amber.9` (warning; palette synced
  from the registry), `red.9` (critical), `gray.6` (unknown/off). Always paired with a label or icon.
- **Marks**: 2px lines, no dots except on hover; bars with 4px rounded data-ends (Recharts `radius`), 2px
  surface gaps between stacked segments; ≥ 8px hover targets; a legend whenever a chart has ≥ 2 series and
  direct labels for ≤ 4; one y-axis only, ever.
- **Interaction**: crosshair + tooltip on line/area (all series at the hovered x), per-mark tooltip on bars
  and donut segments; keyboard users get the same values through the table view.
- **Table view**: every `ChartCard` has an icon toggle (`IconButton` "View as table"/"View as chart") that
  swaps the chart for a compact Park `Table` of the same data. Stat tiles with a sparkline expose the series as
  a visually hidden description.

## Goals

- `AppShell` (`TopBar`, `SideNav`, `PageHeader`, `PageFooter`) and the widget family in `@kemo/ui`, exported.
- `/dashboard` in the preview rendering the exhaustive overview from a mock data module, with a live tick
  that appends an event to the stream every few seconds.
- Unit tests per widget and shell part; Playwright e2e for the route.
- README section for the shell and widgets.

## Non-goals

- Real data, fetching, persistence, drag-and-drop layouts, saved dashboards, chart export, realtime backends.
- Charts beyond the inventory below (maps, sankeys, scatter).
- Localization and number/date formatting beyond `Intl` defaults in the preview.

## Anti-goals

- Dual y-axes, rainbow or cycled palettes, a status color used as a series inside the same chart, meaning carried
  by color alone.
- A generic "dashboard framework" (widget registry, layout engine). Widgets are plain components placed in a grid.
- Hand edits to synced Park files.

## Widget inventory (all presentational; data in, nothing fetched)

| Widget                    | Shows                                                                       | Key props                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `StatCard`                | headline number, label, delta with direction and suffix, optional sparkline | `value`, `label`, `delta?: { value: string; direction: 'up' \| 'down'; tone: 'good' \| 'bad'; suffix? }`, `sparkline?: number[]` |
| `ChartCard`               | card chrome around any chart: title, caption, table toggle                  | `title`, `caption?`, `table: { columns, rows }`, `children`                                                                      |
| `LineChart`               | up to 5 series over time with legend and crosshair tooltip                  | `series: { id, label, data: { x: string \| number; y: number }[] }[]`, `area?: boolean`                                          |
| `BarChart`                | grouped or stacked bars with legend and tooltip                             | `categories: string[]`, `series`, `stacked?: boolean`                                                                            |
| `DonutGauge` / `ArcGauge` | one ratio with a centered value and caption                                 | `value`, `max`, `label`, `tone?`                                                                                                 |
| `SegmentedBar`            | parts of a whole with legend                                                | `segments: { label, value, color? }[]`, `total`                                                                                  |
| `StatusGrid`              | N boxes in good/warning/critical/off with legend and counts                 | `cells: { id, status, label }[]`, `columns?`                                                                                     |
| `RankedBars`              | top-N horizontal bars with values                                           | `items: { label, value }[]`                                                                                                      |
| `ProgressList`            | labelled progress bars with percent or failure state                        | `items: { label, value, tone? }[]`                                                                                               |
| `SmallMultiples`          | a grid of labelled sparklines                                               | `items: { label, data: number[] }[]`                                                                                             |
| `DataTableCard`           | Park Table with tabs, status badges, inline sparkline column, pagination    | `tabs`, `columns`, `rows`, `page`, `onPageChange`                                                                                |
| `EventStream`             | time-ordered events with tone dots                                          | `events: { id, time, tone, text }[]`                                                                                             |
| `ActivityFeed`            | avatar, actor, action, relative time                                        | `items: { id, actor, initials, action, when }[]`                                                                                 |
| `CalendarHeatmap`         | weeks × days intensity cells with a Less/More legend                        | `values: { date, count }[]`, `weeks?`                                                                                            |
| `AlertBanner`             | incident summary with an action                                             | `title`, `description`, `action?`                                                                                                |
| `EmptyState`              | dashed card with a line of copy and an action link                          | `message`, `action?`                                                                                                             |
| `QuickActions`            | a small grid of outline buttons                                             | `actions: { label, onSelect }[]`                                                                                                 |

Sparkline is its own small component (`Sparkline({ data, width?, height? })`), used by `StatCard`,
`SmallMultiples` and the table.

## Shell API

- `AppShell({ topBar, sideNav, footer, children })` places the parts and owns the responsive behaviour
  (rail below `lg`, drawer below `md`, `collapsed` state with a `defaultCollapsed` prop).
- `TopBar({ brand: { logo?, name }, search?: { placeholder, onSubmit }, environment?: { options, value, onChange }, actions?: ReactNode, account: { initials, name, menu: { label, onSelect }[] } })`.
- `SideNav({ groups: { label, items: { id, label, icon, href, badge?, active? }[] }[], footer?, linkComponent? })`.
- `PageHeader({ title, context?, actions? })`, `PageFooter({ product, version, status: { tone, text }, links: { label, href }[] })`.
- Landmarks: `header`, `nav aria-label="Primary"`, `main`, `footer`; a "Skip to content" link targets `main`.

## Preview

Route `/dashboard` (Server Component page rendering a client `DashboardDemo`), fed by
`apps/preview/src/lib/mock-dashboard.ts` (static values matching the mockup) and a `useLiveEvents()` hook that
prepends a new mock event every 4 seconds (capped at 20). The floating preview panel lists it under Pages.

## Tests

- Vitest: each widget renders its data (values, labels, deltas with the suffix text, status counts, table rows);
  `ChartCard` toggles to the table view and back; `StatusGrid` legend counts match cells; `StatCard` delta tone
  is never color-only (▲/▼ glyph present); `SideNav` marks the active item with `aria-current`; `AppShell`
  renders the four landmarks and the skip link first in tab order.
- Playwright: `/dashboard` renders the `h1`, all nine widget titles, zero console errors; the table toggle on
  the requests chart shows a table; the sidebar collapses to a rail at 1024px and opens as a drawer at 375px;
  the dark theme flips the series colors (computed stroke of the first line changes).

## Decisions

1. Recharts 3.x for the composite charts; hand-rolled SVG for sparklines, gauges, status grid, segmented bar,
   heatmap. Reason: SVG + CSS variables keep charts on tokens; Recharts is React-native, composable and covers
   the inventory; the small pieces are simpler by hand.
2. Series tokens are the dataviz reference hexes (already validated), not Radix steps, so the palette's
   color-blind separation is guaranteed; status uses Park palettes so badges and grids share one color system.
3. Every chart has a table view; this is the accessibility channel the dataviz rules require.
4. Widgets are plain components; the dashboard page is a hand-laid grid, not a layout engine.
5. Park components synced for this work: `table`, `tabs`, `avatar`, `progress`, `menu`, `tooltip`,
   `pagination`, `kbd`, `select`, `switch`, `segment-group`, palette `amber`.
6. Shell parts are independent exports so an app can use `TopBar` + `SideNav` without the widgets.

## Calls made after the builder check (check these while reading)

- **Shell state**: `AppShell` owns `collapsed` (desktop) and `drawerOpen` (mobile) and exposes them through a
  context with a `useAppShell()` hook. `TopBar` renders a menu button below `md` only when inside an `AppShell`;
  `SideNav` reads the context and renders its icon-only variant when collapsed or below `lg`; `AppShell` renders
  `sideNav` a second time inside the `Drawer` below `md`. The "Collapse sidebar" control acts only at `lg` and up.
- **Palettes**: the series hexes stay as written (the dataviz reference palette keeps categorical slots and
  status steps apart by design, and status colors always carry a label or glyph); status uses Park `green.9`,
  `amber.9`, `red.9`, `gray.6`. `amber` is added with `pnpm park-ui add amber` (never `--force`); existing
  palette files are untouched.
- **Table types**: `Column<T> = { id: string; header: string; cell?: (row: T) => ReactNode; align?: 'start' | 'end' }`;
  `DataTableCard` rows are `T extends { id: string }`; `ChartCard.table` is plain data (`columns: string[]`,
  `rows: (string | number)[][]`) that each demo derives from the same mock series.
- **Controls are inert** in the demo: selects hold local state, buttons and quick actions call optional
  callbacks that the demo leaves as no-ops, `⌘K` is a visual hint with no key handler.
- **Legends and labels**: a legend on every multi-series chart; direct end-of-line labels on line charts only
  (≤ 4 series); bars rely on the legend plus tooltips.
- **Recharts specifics**: all chart components are client components; `ResponsiveContainer` with
  `initialDimension` for SSR; tests pass fixed `width`/`height` and stub `ResizeObserver` in
  `src/test/setup.ts`; `accessibilityLayer={false}` (the table view is the keyboard channel; nine extra chart
  tab stops would bury the page); stacked bars round only the top segment (custom `shape` or `radius` on the last
  `Bar`) with a 2px `stroke` in the card surface color between segments.
- **Tokens in SVG**: chart colors are passed to Recharts as `token.var('colors.chart.1')` from the generated
  `styled-system/tokens` (tracked, prefix-safe) and used in hand-rolled SVG through Panda style props
  (`stroke: 'chart.1'`); `colors.chart.*` are semantic tokens with `_light`/`_dark` values.

## Left to the builder

- Exact mock values and copy for the demo beyond what the mockup shows; lucide icon choices.
- Recharts composition details (margins, tick formatting, tooltip content component) within the rules above.
- File layout under `packages/ui/src/{layouts/app-shell,widgets}/` and barrel exports.
- The `useLiveEvents` tick implementation and its cleanup.
- Heatmap intensity steps (4 or 5) and the exact responsive column spans for the three-up rows.
