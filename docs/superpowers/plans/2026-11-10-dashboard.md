# Application Shell and Overview Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an application shell (`AppShell`, `TopBar`, `SideNav`, `PageHeader`, `PageFooter`) and a dashboard widget family in `@kemo/ui`, then render the exhaustive overview dashboard at `/dashboard` in the preview from mock data.

**Architecture:** Shell parts are independent Park compositions coordinated by a small context in `AppShell` (collapsed rail, mobile drawer). Widgets are presentational, data-in components; composite charts use Recharts 3 (SVG, token colors via generated CSS variables), small marks are hand-rolled SVG/CSS. The preview page is a hand-laid 12-column grid over a mock data module with a live event tick.

**Tech Stack:** React 19, Panda CSS 2.5 (`@kemo/ui`), Park UI / Ark UI 5 (newly synced: table, tabs, avatar, progress, menu, tooltip, pagination, kbd, select, switch, segment-group; palette amber), Recharts 3.10, lucide-react, Vitest + Testing Library, Next.js 16 preview, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-10-dashboard-design.md` (mockup: `docs/superpowers/specs/assets/2026-11-10-dashboard-mockup.html`)

## Global Constraints

- Series tokens, verbatim, as semantic tokens `colors.chart.1 … chart.5` with `_light`/`_dark`: `#2a78d6`/`#3987e5`, `#eb6834`/`#d95926`, `#1baf7a`/`#199e70`, `#eda100`/`#c98500`, `#e87ba4`/`#d55181`. Status: `green.9` good, `amber.9` warning, `red.9` critical, `gray.6` off. Chart ink `fg.default`/`fg.muted`/`fg.subtle`, gridlines `border`, baseline `gray.7`.
- Chart rules: one y-axis; legend on every multi-series chart; direct end-of-line labels on line charts only (≤ 4 series); 2px lines, no dots except hover; bars with 4px rounded data-ends (stacked: top segment only) and 2px surface-colored strokes between segments; tooltips on line/area/bar/donut; a sixth series folds into "Other"; status colors never a series; every `ChartCard` has a table toggle.
- Recharts: `recharts ^3.10.1` as a dependency of `@kemo/ui`; chart components are `'use client'`; `ResponsiveContainer` with `initialDimension`; `accessibilityLayer={false}`; tests pass fixed `width`/`height`; `ResizeObserver` and `matchMedia` stubs in `packages/ui/src/test/setup.ts`. Colors reach Recharts as `token.var('colors.chart.N')` from `../../../styled-system/tokens`; hand-rolled SVG uses Panda style props.
- File layout: `packages/ui/src/layouts/app-shell/` and `packages/ui/src/widgets/` (one component per file, tests alongside), barrels `layouts/app-shell/index.ts` and `widgets/index.ts`, re-exported from `src/index.ts`. Inside `packages/ui/src`: relative `styled-system` imports only, Park components from `../../components/ui`, tokens only, no hand edits to synced files (`pnpm park-ui add …`, never `--force`).
- Shell layout: side nav 240px (`gray.surface.bg`, right border `border`), rail 56px below `lg`, drawer below `md`; top bar 56px (`gray.surface.bg`, bottom border); content on `canvas`; footer at the end of the content column. Landmarks `header`, `nav aria-label="Primary"`, `main id="main"`, `footer`; "Skip to content" link first in tab order.
- Grid: 12 columns, `gap: 4`; cards `Card` `outline`, padding `4`; headline numbers `textStyle: 2xl` semibold tight; deltas `xs` with ▲/▼ glyph plus text, `green.11`/`red.11`. No load animation. Copy strings and mock values as listed in the spec's slot map.
- Preview route `/dashboard` is a Server Component page rendering a client `DashboardDemo`; mock data in `apps/preview/src/lib/mock-dashboard.ts`; `useLiveEvents()` in `apps/preview/src/lib/use-live-events.ts` prepends a mock event every 4 s, capped at 20. Preview panel gets a "Dashboard" entry under Pages.
- Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; root `pnpm lint` has `--max-warnings 0`; Panda ESLint plugin active (tokens only, no dynamic styling: pick colors from a fixed map, never template strings).
- Every task ends green on `pnpm --filter @kemo/ui lib`, `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`; preview tasks also `pnpm build` and Playwright against a production build on :3100 via the scratch config outside the repo (a user `next dev` may hold :3000; never stop it; sandbox disabled for build/e2e).
- One commit per task on `main`, conventional messages as given.

## Review Focus

1. Single-series charts must not show a legend, and a sixth series folds into "Other" rather than inventing a hue. Pinned in Task 4 tests `renders no legend for one series` and `folds extra series into Other`.
2. Empty data (`series: []`, `cells: []`, `items: []`) must render a quiet "No data" line, not a broken SVG or a crash. Pinned in Task 4/5 tests `shows No data when empty` for `LineChart`, `BarChart`, `StatusGrid`, `RankedBars`.
3. Dark theme must restyle chart strokes (token flip reaches SVG). Pinned in Task 7 e2e `dark theme flips series colors`.
4. Keyboard path: skip link first, `aria-current` on the active nav item, the table toggle reachable and announcing its state. Pinned in Task 2 tests (`skip link is the first tab stop`, `active item has aria-current`) and Task 3 (`table toggle is a labelled button with aria-pressed`).
5. Narrow viewport: the side nav becomes a drawer, the grid stacks, no horizontal scroll. Pinned in Task 7 e2e `dashboard stacks at 375px`.

---

### Task 1: Foundations (Park sync, chart tokens, Recharts, test stubs)

**Files:**

- Create: `packages/ui/src/theme/tokens/chart.ts`
- Modify: `packages/ui/panda.config.ts` (add `chart` under `theme.extend.semanticTokens.colors`), `packages/ui/package.json` (add `recharts`), `packages/ui/src/test/setup.ts` (stubs), `packages/ui/src/theme/theme.test.ts`
- Synced by `pnpm park-ui add table tabs avatar progress menu tooltip pagination kbd select switch segment-group` and `pnpm park-ui add amber --with-colors`: `packages/ui/src/components/ui/*.tsx`, `src/theme/recipes/*.ts`, `src/theme/colors/amber.ts`, barrels.

**Interfaces:**

- Produces `chart` = `defineSemanticTokens.colors({ 1: { value: { _light: '#2a78d6', _dark: '#3987e5' } }, 2: …, 3: …, 4: …, 5: … })` registered as `semanticTokens.colors.chart`, so `token.var('colors.chart.1')` is `var(--colors-chart-1)` and Panda style props accept `stroke: 'chart.1'`.
- Produces test stubs: `globalThis.ResizeObserver` (observe/unobserve/disconnect no-ops) and `window.matchMedia` returning `{ matches: false, media, addEventListener, removeEventListener }` with an exported helper `setMediaMatches(query: string, matches: boolean)` in `src/test/media.ts` that later tests use to simulate breakpoints.
- Produces the Park namespaces `Table`, `Tabs`, `Avatar`, `Progress`, `Menu`, `Tooltip`, `Pagination`, `Select`, `SegmentGroup`, `Switch` and flat `Kbd` from `../../components/ui` (exact export shapes come from the registry; record them in the report for later tasks).

- [ ] **Step 1: Failing test.** In `theme.test.ts` add: `token('colors.chart.1')` is a string starting with `var(`; `token.var('colors.chart.5')` equals `var(--colors-chart-5)`; `token.var('colors.amber.9')` equals `var(--colors-amber-9)`.
- [ ] **Step 2: Run to see it fail.** Run: `pnpm --filter @kemo/ui test`. Expected: FAIL (tokens undefined).
- [ ] **Step 3: Sync and implement.** Run the two `pnpm park-ui add …` commands (sandbox disabled; then `pnpm format`), add `chart.ts` and wire it, add `recharts ^3.10.1` (`pnpm --filter @kemo/ui add recharts`), add the stubs and `media.ts`.
- [ ] **Step 4: Generate and test.** Run: `pnpm --filter @kemo/ui lib && pnpm --filter @kemo/ui test && pnpm park-ui port`. Expected: codegen without unknown-token diagnostics; tests PASS; port prints 0 written.
- [ ] **Step 5: Checks.** Run: `pnpm typecheck && pnpm lint && pnpm format:check`. Expected: exit 0 (if the Panda ESLint plugin flags a synced file, scope the narrowest rule override as Task 4 of the scaffold did, and report it).
- [ ] **Step 6: Commit** `feat(ui): sync dashboard Park components, add chart tokens and Recharts`.

---

### Task 2: Application shell

**Files:**

- Create: `packages/ui/src/layouts/app-shell/{types.ts,app-shell-context.tsx,app-shell.tsx,top-bar.tsx,side-nav.tsx,page-header.tsx,page-footer.tsx,skip-link.tsx,index.ts}`
- Modify: `packages/ui/src/index.ts` (`export * from './layouts/app-shell'`)
- Test: `packages/ui/src/layouts/app-shell/app-shell.test.tsx`, `side-nav.test.tsx`, `top-bar.test.tsx`

**Interfaces:**

- `types.ts`: `NavItem { id: string; label: string; icon: ReactNode; href: string; badge?: number | string; active?: boolean }`, `NavGroup { label: string; items: NavItem[] }`, `TopBarProps { brand: { logo?: ReactNode; name: string }; search?: { placeholder: string; onSubmit?: (query: string) => void }; environment?: { options: { value: string; label: string }[]; value: string; onChange?: (value: string) => void }; actions?: ReactNode; account: { initials: string; name: string; menu: { label: string; onSelect?: () => void }[] } }`, `SideNavProps { groups: NavGroup[]; footer?: ReactNode; linkComponent?: LinkComponent }` (reuse `LinkComponent` from `../../pages/auth/types`), `PageHeaderProps { title: string; context?: ReactNode; actions?: ReactNode }`, `PageFooterProps { product: string; version: string; status: { tone: 'good' | 'warning' | 'critical'; text: string }; links: { label: string; href: string }[] }`, `AppShellProps { topBar: ReactNode; sideNav: ReactNode; footer?: ReactNode; defaultCollapsed?: boolean; children: ReactNode }`.
  Breakpoints come from a `useMediaQuery(query: string): boolean` hook (SSR/initial default `false`) over `window.matchMedia`; with `md = useMediaQuery('(min-width: 48em)')` and `lg = useMediaQuery('(min-width: 64em)')`: `isMobile = !md`, `isRail = md && (!lg || collapsed)`.
- `app-shell.tsx`: renders `SkipLink` (href `#main`, text "Skip to content"), `header` (the `topBar`), `nav aria-label="Primary"` (the `sideNav`, hidden below `md`), a Park `Drawer` (`placement="start"`) containing `sideNav` again below `md` with `open={drawerOpen}`, `main id="main"` with `children`, and `footer` when given. Grid: `gridTemplateColumns` `240px 1fr` / rail `56px 1fr` / mobile `1fr`.
- `top-bar.tsx`: as the spec's Top bar; a menu `IconButton` "Open navigation" shown only when `useAppShell()?.isMobile`; search is `Input` inside `Field`-less `InputGroup`/`Kbd` end element; environment `Select`; account `Avatar` as `Menu.Trigger`.
- `side-nav.tsx`: groups → `Text` label (hidden in rail) + items as `AuthLink`-style links with icon, label (hidden in rail, shown as `Tooltip` instead), `Badge` count; active item `aria-current="page"` and `gray.subtle.bg`; footer slot; "Collapse sidebar"/"Expand sidebar" `Button variant="plain"` shown only when `matches(lg)`.
- `page-header.tsx`, `page-footer.tsx`, `skip-link.tsx` (visually hidden until focused).

- [ ] **Step 1: Failing tests.** `app-shell.test.tsx`: renders `banner`, `navigation` (name "Primary"), `main`, `contentinfo` landmarks; the first `user.tab()` focuses the link "Skip to content"; with `setMediaMatches('(min-width: 48em)', false)` the top bar's "Open navigation" button appears and clicking it opens a dialog containing the nav links; with md true and lg false the nav has `data-rail="true"`. `side-nav.test.tsx`: active item has `aria-current="page"`; badge text renders; "Collapse sidebar" toggles `data-rail`. `top-bar.test.tsx`: account menu opens on click and lists the items; environment select shows the value.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run app-shell side-nav top-bar`. Expected: FAIL.
- [ ] **Step 3: Implement** per Interfaces.
- [ ] **Step 4: Test and checks.** Run: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add AppShell with TopBar, SideNav, PageHeader and PageFooter`.

---

### Task 3: Card-level widgets (Sparkline, StatCard, ChartCard, AlertBanner, EmptyState, QuickActions)

**Files:**

- Create: `packages/ui/src/widgets/{types.ts,sparkline.tsx,stat-card.tsx,chart-card.tsx,alert-banner.tsx,empty-state.tsx,quick-actions.tsx,index.ts}`
- Modify: `packages/ui/src/index.ts` (`export * from './widgets'`)
- Test: `packages/ui/src/widgets/{sparkline,stat-card,chart-card,alert-banner,empty-state,quick-actions}.test.tsx`

**Interfaces:**

- `types.ts`: `Tone = 'good' | 'bad' | 'neutral'`, `StatusTone = 'good' | 'warning' | 'critical' | 'off'`, `Delta { value: string; direction: 'up' | 'down'; tone: Tone; suffix?: string }`, `Point { x: string | number; y: number }`, `Series { id: string; label: string; data: Point[] }`, `TableData { columns: string[]; rows: (string | number)[][] }`, `Column<T> { id: string; header: string; cell?: (row: T) => ReactNode; align?: 'start' | 'end' }`.
- `Sparkline({ data: number[]; width?: number; height?: number; label?: string })` → inline `svg` (`role="img"` with `aria-label` when given, else `aria-hidden`), 1.5px `stroke: 'chart.1'` polyline, no axes.
- `StatCard({ value: string; label: string; delta?: Delta; sparkline?: number[] })` → `Card.Root variant="outline"`; delta glyph ▲/▼ + value + suffix, color `green.11`/`red.11` by `tone`; sparkline labelled "{label} trend".
- `ChartCard({ title: string; caption?: string; table: TableData; children: ReactNode })` → header row, `IconButton variant="plain"` with `aria-label` "View as table"/"View as chart" and `aria-pressed`, body swaps between `children` and a compact Park `Table` built from `table`.
- `AlertBanner({ title; description; action?: { label; onSelect } })` → Park `Alert` `status="error"` `variant="surface"` with the action `Button`.
- `EmptyState({ message: string; action?: { label; onSelect } })`; `QuickActions({ actions: { label: string; onSelect?: () => void }[] })` (two-column grid of `outline` buttons).

- [ ] **Step 1: Failing tests** per component: StatCard renders value, label, "▲ 8.2% vs yesterday" with the up glyph; ChartCard toggle flips `aria-pressed` and shows a table with the given headers and a cell value, then back; Sparkline renders a `polyline` with N points; AlertBanner renders title and calls `onSelect`; EmptyState and QuickActions render text and fire callbacks.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run widgets`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add StatCard, ChartCard, Sparkline and small dashboard widgets`.

---

### Task 4: Charts (LineChart, BarChart, DonutGauge, ArcGauge, SegmentedBar)

**Files:**

- Create: `packages/ui/src/widgets/{chart-colors.ts,chart-tooltip.tsx,line-chart.tsx,bar-chart.tsx,donut-gauge.tsx,arc-gauge.tsx,segmented-bar.tsx}`
- Modify: `packages/ui/src/widgets/index.ts`
- Test: `packages/ui/src/widgets/{line-chart,bar-chart,donut-gauge,segmented-bar}.test.tsx`

**Interfaces:**

- `chart-colors.ts`: `export const seriesColors = [token.var('colors.chart.1'), …, token.var('colors.chart.5')] as const`; `export function colorForSeries(index: number): string` (index ≥ 5 → `token.var('colors.gray.8')` for "Other"); `export function foldSeries(series: Series[], max = 5): Series[]` (sums the 6th+ into `{ id: 'other', label: 'Other' }` point-wise by x).
- `chart-tooltip.tsx`: a Recharts `content` component rendering a small `Card`-styled box with the x label and one row per series (color swatch, label, value), tokens only.
- `LineChart({ series: Series[]; area?: boolean; height?: number; width?: number; valueFormatter?: (n: number) => string })` → `'use client'`; Recharts `LineChart`/`AreaChart` in `ResponsiveContainer` (fixed size when `width`/`height` given), `CartesianGrid` horizontal only (`stroke: border`), `XAxis`/`YAxis` with `fg.subtle` ticks, one `Line` per folded series (`strokeWidth 2`, `dot={false}`, `activeDot r=4`), direct end label per series via `LabelList`/custom label at the last point, `Legend` only when `series.length > 1`, `Tooltip content={ChartTooltip}`, `accessibilityLayer={false}`; renders `Text color="fg.subtle"` "No data" when `series` is empty.
- `BarChart({ categories: string[]; series: Series[]; stacked?: boolean; height?; width?; valueFormatter? })` → one `Bar` per folded series, `radius` `[4,4,0,0]` (stacked: only the last `Bar` gets it), `stroke` the card surface (`token.var('colors.gray.surface.bg')`) `strokeWidth 2` when stacked, legend when > 1 series, tooltip, "No data" when empty.
- `DonutGauge({ value: number; max: number; label: string; caption?: ReactNode; tone?: StatusTone })` and `ArcGauge` (270° arc) → hand-rolled SVG circles with `stroke-dasharray`, centered percentage text, `role="img"` `aria-label` "{label}: {value} of {max}".
- `SegmentedBar({ segments: { label: string; value: number; color?: string }[]; total: number; label?: string })` → flex bar with 2px gaps, legend row with swatches and labels.

- [ ] **Step 1: Failing tests** (fixed `width={400} height={200}`): `renders one path per series` (query `.recharts-line` count), `renders no legend for one series` / `renders a legend for two series` (legend item text), `folds extra series into Other` (6 series → 5 lines + legend item "Other"), `shows No data when empty`; BarChart: bar count = categories × series, stacked variant renders, legend rules, empty; DonutGauge `aria-label` and percentage text "70%"; ArcGauge `aria-label` "CPU: 70 of 100" and a 270° arc (`stroke-dasharray` present); SegmentedBar renders three segments with widths proportional to values and legend labels.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run chart gauge segmented`. Expected: FAIL.
- [ ] **Step 3: Implement.** If jsdom renders zero-size charts despite fixed props, assert on the Recharts wrapper classes/data rather than geometry and say so.
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0, no `act()` or Recharts warnings in output.
- [ ] **Step 5: Commit** `feat(ui): add Recharts-based LineChart and BarChart plus gauges and SegmentedBar`.

---

### Task 5: Status, progress, ranking, heatmap, small multiples

**Files:**

- Create: `packages/ui/src/widgets/{status-grid.tsx,progress-list.tsx,ranked-bars.tsx,small-multiples.tsx,calendar-heatmap.tsx}`
- Modify: `packages/ui/src/widgets/index.ts`
- Test: `packages/ui/src/widgets/{status-grid,progress-list,ranked-bars,small-multiples,calendar-heatmap}.test.tsx`

**Interfaces:**

- `StatusGrid({ cells: { id: string; status: StatusTone; label: string }[]; columns?: number; legend?: Record<StatusTone, string> })` → CSS grid of `Tooltip`-wrapped squares (`bg` by status: `green.9`/`amber.9`/`red.9`/`gray.6`), each `role="img"` `aria-label` "{label}: {legend[status]}"; legend row with counts ("45 Ready"); "No data" when empty.
- `ProgressList({ items: { label: string; value: number; tone?: StatusTone; note?: string }[] })` → Park `Progress` per item, value text right-aligned, `red.9` fill for `critical` with the note ("Failed at 41%").
- `RankedBars({ items: { label: string; value: number }[]; valueFormatter? })` → label, bar width proportional to max (`chart.1`), value; "No data" when empty.
- `SmallMultiples({ items: { label: string; data: number[] }[]; columns?: number })` → grid of label + `Sparkline`.
- `CalendarHeatmap({ values: { date: string; count: number }[]; weeks?: number; steps?: 4 | 5 })` → weeks × 7 grid, intensity classes from a fixed opacity map on `chart.1`, each cell `aria-label` "{date}: {count}", legend "Less … More".

- [ ] **Step 1: Failing tests**: StatusGrid renders 48 cells and legend counts "45 Ready", "1 Pressure", "1 NotReady", "2 Cordoned"; ProgressList renders four `progressbar` roles with `aria-valuenow`; RankedBars first bar is 100% wide; SmallMultiples renders four sparklines with labels; CalendarHeatmap renders `weeks*7` cells with `aria-label`s; empty states for StatusGrid and RankedBars.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run status progress ranked multiples heatmap`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add StatusGrid, ProgressList, RankedBars, SmallMultiples and CalendarHeatmap`.

---

### Task 6: Data widgets (DataTableCard, EventStream, ActivityFeed)

**Files:**

- Create: `packages/ui/src/widgets/{data-table-card.tsx,event-stream.tsx,activity-feed.tsx}`
- Modify: `packages/ui/src/widgets/index.ts`
- Test: `packages/ui/src/widgets/{data-table-card,event-stream,activity-feed}.test.tsx`

**Interfaces:**

- `DataTableCard<T extends { id: string }>({ title: string; caption?: string; tabs?: { id: string; label: string }[]; activeTab?: string; onTabChange?: (id: string) => void; columns: Column<T>[]; rows: T[]; page: { index: number; size: number; total: number }; onPageChange?: (index: number) => void })` → `Card` with header, Park `Tabs` (controlled), `Table` (`Table.Root/Head/Row/Header/Body/Cell`), footer with "Showing {n} of {total}" and `Pagination`.
- `EventStream({ events: { id: string; time: string; tone: 'info' | 'warning' | 'critical' | 'good'; text: string }[]; live?: boolean })` → `ol` timeline, tone dot colors `chart.1`/`amber.9`/`red.9`/`green.9`, `aria-live="polite"` region when `live`.
- `ActivityFeed({ items: { id: string; actor: string; initials: string; action: ReactNode; when: string }[] })` → list with Park `Avatar` (initials fallback).

- [ ] **Step 1: Failing tests**: DataTableCard renders headers and 5 rows, a custom `cell` renderer output (a `Badge` text), tab change callback, pager text "Showing 5 of 128" and `onPageChange(2)` on next; EventStream renders 5 items in order with a `status`/`aria-live` region when `live`; ActivityFeed renders actor names and initials.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run data-table event-stream activity`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add DataTableCard, EventStream and ActivityFeed`.

---

### Task 7: Preview dashboard route, panel entry, README, e2e

**Files:**

- Create: `apps/preview/src/app/dashboard/page.tsx`, `apps/preview/src/components/dashboard/dashboard-demo.tsx`, `apps/preview/src/lib/mock-dashboard.ts`, `apps/preview/src/lib/use-live-events.ts`
- Modify: `apps/preview/src/components/preview-panel.tsx` (Pages: `{ href: '/dashboard', label: 'Dashboard' }` after Home), `apps/preview/e2e/smoke.spec.ts`, `README.md`
- Test: `apps/preview/e2e/smoke.spec.ts`

**Interfaces:**

- `page.tsx`: `metadata.title = 'Dashboard'`, renders `<DashboardDemo />`. No `(auth)` layout; the page is standalone like the component pages.
- `mock-dashboard.ts`: every value from the spec's slot map (stat cards, three request series over 24 hourly points, capacity numbers, deployments by day for 7 days, 48 status cells, 5 endpoints, 5 deployment rows, 4 rollouts, 4 regions, 5 events, 5 activity items, 16 weeks of heatmap counts, nav groups "Platform"/"Manage" with the items and badges, footer links). Exported as named constants plus `navGroups`, `topBar` props.
- `use-live-events.ts`: `useLiveEvents(initial: Event[], intervalMs = 4000, max = 20): Event[]` prepending a rotating mock event; cleans up on unmount.
- `dashboard-demo.tsx` (`'use client'`): `AppShell` with `TopBar`, `SideNav` (active "Overview", `linkComponent={NextLink}`), `PageHeader` "Overview" with context and the four actions, the grid from the slot map, `PageFooter`.
- e2e additions: `dashboard renders the shell and nine widget titles` (route 200, `h1` "Overview", landmarks `banner`/`navigation`/`main`/`contentinfo`, the nine titles visible, zero console errors and page errors); `chart table toggle` (click "View as table" in "Requests per minute" → a table with header "API" visible, click again → svg back); `dark theme flips series colors` (computed `stroke` of the first `.recharts-line path` before/after toggling the theme via the preview panel differ); `sidebar becomes a rail at 1024px` (`nav` width ≤ 60); `dashboard stacks at 375px` (no `navigation` landmark visible until "Open navigation" is clicked, then a dialog with the nav; `scrollWidth` equals 375); `live events append` (count of stream items increases within 6 s); routes loop gains `/dashboard`.
- README: "Application shell and dashboard widgets" section (what ships, the chart rules in three lines, how to use `AppShell` in an app, where the demo and mock data live); roadmap updated.

- [ ] **Step 1: Write the failing e2e tests**, build, run against the stubs-free current app (route 404) to see them fail.
- [ ] **Step 2: Implement** the mock module, hook, demo, page, panel entry, README.
- [ ] **Step 3: Run everything.** Run: `pnpm --filter @kemo/ui lib && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build` then Playwright on :3100. Expected: all exit 0; e2e 23 + 6 = 29 (plus the routes-loop entry); zero console/page errors on every route.
- [ ] **Step 4: Commit** `feat(preview): add the overview dashboard demo`.

---

### Task 8: Final verification

- [ ] **Step 1:** Run `make check`, `pnpm build` + Playwright on :3100, `make container-build` (sandbox disabled). Expected: exit 0 each.
- [ ] **Step 2:** `git status --porcelain` empty; `git log --oneline` shows one commit per task plus review fixes.
