# Application shell and dashboard widgets

`@kemo/ui` also ships the signed-in surface of an app. Everything is presentational: data in through
props, nothing fetched.

Screenshots: [gallery](gallery/README.md#dashboard).

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
announcements can be stopped. The top bar shows its help and notifications buttons only when given `onHelp` and `onNotifications`
(`notificationCount` adds the badge); the demo wires help to `/faq` and notifications to an inline
message. `EventStream` with `live` has a Pause / Resume toggle (`paused` and `onPausedChange` for a
host that owns it) and `AlertBanner` takes a `status`. The other controls are inert: the selects (environment, workspace, time
range, service), the table tabs and the pager hold local state, and the buttons do nothing. The
demo builds its selects from Park's `Select` with `createListCollection` and `Portal`, which
`@kemo/ui` re-exports from Ark so a consumer needs no direct `@ark-ui/react` dependency.
