# Status pages and console pages

Date: 2026-11-11. Status: approved in the visual brainstorm (status pages: option B "editorial, bottom-left";
FAQ: option B "topic index + open answers"; Blank page: played back and accepted).

## Intent

Two more page families on the shared foundation, so every app on the platform answers "something is wrong"
and "where do I find help" the same way:

- **Status pages**, shown bare (no drawer, no shell) on the Nightfall gradient muted so plain text reads
  clearly: 401, 403, 404, 500, 503 and a Maintenance page.
- **Console pages**, shown inside the signed-in shell (`AppShell` with sidebar and top bar): an FAQ page and
  a Blank page that is the starter for any new screen.

Like the auth pages, these are presentational components in `@kemo/ui` with host-injected actions and data;
the preview app is the example host.

## Goals, non-goals, anti-goals

Goals: one `StatusLayout` that carries all six status pages with only copy, watermark, tone and actions
changing; thin named pages with the pinned copy as defaults; an `FaqPage` that renders a topic index and
always-open answers from data; a `BlankPage` a developer copies to start a screen; preview routes, panel
entries, README and e2e for all of them; the preview's real `not-found` and `error` boundaries use the status
pages so the integration is demonstrated, not just described.

Non-goals: content management for FAQs, search over questions, analytics, localisation, a real maintenance
scheduler, auto-reload logic beyond an optional interval prop.

Anti-goals (it fails even if it works): a status page whose text is hard to read on the gradient; a 5xx page
that tells the user nothing about what to do next; status conveyed by colour alone; an FAQ whose answers
cannot be linked to; a Blank page with so much in it that it is no longer blank.

## Constraints (unchanged from the dashboard phase)

Panda CSS 2.5 `panda lib` workflow; Park UI components synced from the registry, never hand-edited; our files
only under `src/pages/**`, `src/layouts/**`, `src/widgets/**`, `src/theme/tokens/{fonts,easings,gradients,chart}.ts`,
`src/theme/radii.ts`; relative `styled-system` imports inside the package (depth three from `src/pages/<family>/`:
`../../../styled-system/*`, Park components `../../components/ui`); tokens only; `'use client'` where hooks are
used; Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; lint with zero warnings;
Vitest + Testing Library for units, Playwright for the preview; one commit per task on `main`.

## The look

### Status pages (bare)

- **Backdrop**: the Nightfall gradient (`gradients.auth`) across the fixed viewport, darkened by a layer of
  `rgba(12, 8, 22, 0.58)` and desaturated with `filter: saturate(0.85)`. Expose it as a new gradient token
  `gradients.status` (the darkening layer composed over the Nightfall layers in one value) so the mute is one
  decision in one place. The page container forces Park's dark colour mode the way `AuthLayout` does
  (`className="dark"` + `colorScheme="dark"`), so text is `fg.default` on dark and a `solid` Button is light on dark.
- **Brand** top-left: the host's `logo` slot and `brand` name in `sm` muted text (same slots as the auth pages).
- **Watermark**: the code ("404") or a word ("Back soon" for Maintenance) set in DM Sans bold at a clamp
  between about 160px and 320px, letter-spacing `-0.06em`, colour `white.a2`-to-`white.a3` (about 6% white on
  the muted gradient), anchored top-right and allowed to bleed off the top and right edges (the page clips it).
  Decorative: `aria-hidden`, `user-select: none`, `pointer-events: none`.
- **Message block**, anchored bottom-left on `md` and up with a max width of 32rem and `px: 8 / pb: 16`:
  1. a row with a 2rem hairline rule and a small label in `xs` muted text: `{code} · {label}` (e.g. "404 · Not
     found", "500 · Server error"), preceded by a status dot for `warning` (`amber.9`) and `critical`
     (`red.9`) tones; the dot is `aria-hidden`, the label text carries the meaning;
  2. the heading, `Heading as="h1"`, `textStyle: 3xl` on md+ (`2xl` below), semibold, tight tracking;
  3. one or two lines of help in `md` muted text;
  4. Maintenance only: a meta row ("Started **02:00 UTC** · Expected back **03:30 UTC**") in `sm`, values in
     `fg.default`;
  5. the actions row: Park `Button`s, `solid` for the primary, then `outline` and `plain`; an action with an
     `href` renders through `linkComponent` (Park `Link` default) with `asChild`.
- **Footer** row pinned to the bottom edge, `xs` subtle text: left "Request ID {id}" (tabular numerals) or
  the Maintenance refresh note; right the version string. Each part optional; the row is omitted when both are.
- **Below `md`**: the message block starts below the brand row instead of anchoring to the bottom; the
  watermark shrinks to the clamp minimum; the actions wrap; the footer stays at the bottom.

### Console pages (inside the shell)

Both render as `main` content for the host's `AppShell`; they do not include the shell. The preview composes
them with the same nav and top bar as the dashboard.

- **FAQ page**: `PageHeader` with the title ("Frequently asked questions"), a context line and one `outline`
  action ("Contact support"). Below it, on `lg` and up, a two-column grid: a sticky topic index on the left
  (`nav aria-label="Topics"`, 12rem, links to each topic section, the current topic marked with a 2px
  `fg.default` start border and `fontWeight: medium`, others `fg.muted`), and the content column on the right
  (max width 44rem): one `section` per topic with an `h2` label, then each question as an `h3` with the answer
  open beneath it in `fg.muted` body text; every question carries an anchor link (`#`, `aria-label="Link to
this question"`) that navigates to `#<question-id>`. Below `lg` the index becomes a horizontally scrollable
  row of the topic links above the content. The current topic follows the reader (IntersectionObserver on the
  topic sections; the first topic is current before any scrolling and on the server).
- **Blank page**: `PageHeader` (title, optional context line, one optional `solid` action), then either the
  host's `children` or, when none are given, a dashed outlined area (`borderStyle: dashed`, `borderColor:
border`, `borderRadius: l3`, `minH: 60`) holding an `EmptyState` ("Nothing here yet. Replace this area with
  your content." plus an optional secondary action). Nothing else: this is the template.

## Copy (pinned defaults; every string is a prop)

| Page        | Tone     | Label                 | Heading                             | Help text                                                                                          | Actions (variant)                                                        |
| ----------- | -------- | --------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 401         | neutral  | Sign in required      | You need to sign in to see this.    | Your session may have expired. Sign in again and we'll bring you back to this page.                | Sign in (solid) · Go to dashboard (plain)                                |
| 403         | neutral  | No access             | You don't have access to this page. | Ask an admin for access, or switch to an account that has it.                                      | Request access (solid) · Go to dashboard (plain)                         |
| 404         | neutral  | Not found             | There's nothing at this address.    | It may have been moved or removed. If you followed a link from inside the console, let us know.    | Go to dashboard (solid) · Go back (outline)                              |
| 500         | critical | Server error          | Something went wrong on our side.   | The request couldn't be completed. It's been logged with the id below; trying again usually works. | Try again (solid) · Go to dashboard (outline) · View status page (plain) |
| 503         | critical | Unavailable           | We're temporarily unavailable.      | We're over capacity or restarting. Give it a minute and try again.                                 | Try again (solid) · View status page (plain)                             |
| Maintenance | warning  | Scheduled maintenance | We're making improvements.          | The console is offline while we upgrade the database. Deployments already in progress will finish. | View status page (solid) · Subscribe to updates (plain)                  |

The watermark defaults to the code; Maintenance uses "Back soon". The Maintenance footer note defaults to
"This page refreshes itself every minute" only when `refreshIntervalMs` is set.

## Components and API (`packages/ui/src/pages/status/` and `src/pages/console/`)

```ts
// status
type StatusTone = 'neutral' | 'warning' | 'critical'            // distinct from the widgets' StatusTone
interface StatusAction { label: string; href?: string; onSelect?: () => void; variant?: 'solid' | 'outline' | 'plain' }
interface StatusLayoutProps {
  code?: string | number        // "404"; omitted for Maintenance
  label: string                 // "Not found"
  title: string                 // the h1
  description?: ReactNode
  tone?: StatusTone             // default 'neutral'
  watermark?: string            // default String(code)
  meta?: { label: string; value: string }[]   // Maintenance "Started" / "Expected back"
  actions?: StatusAction[]
  requestId?: string
  version?: string
  footerNote?: ReactNode        // replaces the request id slot (Maintenance refresh note)
  logo?: ReactNode
  brand?: ReactNode
  linkComponent?: LinkComponent // from pages/auth/types
  refreshIntervalMs?: number    // when set, calls onRefresh (or window.location.reload) on that interval
  onRefresh?: () => void
}
StatusLayout(props)
NotFoundPage, UnauthorizedPage, ForbiddenPage, ServerErrorPage, UnavailablePage, MaintenancePage
  // each: Partial<StatusLayoutProps> with the pinned copy, tone, watermark and action labels as defaults;
  // actions are merged by label so a host can supply only href/onSelect for the defaults or replace the list
MaintenancePageProps adds startedAt?: string; expectedBackAt?: string  (already-formatted strings → meta)

// console
interface FaqQuestion { id: string; question: string; answer: ReactNode }
interface FaqTopic { id: string; label: string; questions: FaqQuestion[] }
interface FaqPageProps {
  title?: string                // default "Frequently asked questions"
  description?: ReactNode
  topics: FaqTopic[]
  action?: { label: string; href?: string; onSelect?: () => void }
  linkComponent?: LinkComponent
}
FaqPage(props)
interface BlankPageProps {
  title: string
  context?: ReactNode
  action?: { label: string; href?: string; onSelect?: () => void }
  emptyMessage?: string         // default "Nothing here yet. Replace this area with your content."
  emptyAction?: { label: string; onSelect?: () => void }
  children?: ReactNode
}
BlankPage(props)
```

Exports join `src/index.ts` via `export * from './pages/status'` and `export * from './pages/console'`.

## Preview

- Routes: `/faq`, `/blank`, `/maintenance`, `/errors/401`, `/errors/403`, `/errors/404`, `/errors/500`,
  `/errors/503` (demo routes return 200). The preview's real `app/not-found.tsx` renders `NotFoundPage` and
  `app/error.tsx` renders `ServerErrorPage` with "Try again" wired to Next's `reset`; a route
  `/errors/throw` throws on render to demonstrate the boundary.
- A shared demo shell for console pages: extract the dashboard demo's nav groups and top bar into
  `apps/preview/src/components/console/console-frame.tsx` (`ConsoleFrame({ active, children })`) used by
  the dashboard, FAQ and Blank demos. The nav gains "Help" under Manage (active on `/faq`); the Blank demo
  marks nothing active.
- Mock data: `src/lib/mock-faq.ts` (four topics: Deployments, Accounts and access, Billing, Security; three
  to four questions each, answers one to three sentences); status demos pass a request id, version and
  no-op actions; Maintenance passes "02:00 UTC" / "03:30 UTC" and no `refreshIntervalMs`.
- Panel: Pages gains "FAQ" and "Blank page" after Dashboard; a new group "Status pages" lists Maintenance,
  401, 403, 404, 500, 503.
- README: a "Status pages and console pages" section (what ships, how to wire `not-found`/`error`
  boundaries, the FAQ data shape, that the Blank page is the starter); roadmap updated.

## Tests

- Unit: `StatusLayout` renders label, h1, description, actions (href → anchor through the link component,
  onSelect → button click), the dot only for warning/critical, the request id and version, the meta row;
  each named page renders its default heading and label and merges a host-supplied action by label;
  `refreshIntervalMs` calls `onRefresh` on a fake timer and clears on unmount. `FaqPage` renders `nav
"Topics"` links to every topic id, every question as an h3 with an anchor link to its id, the action; the
  first topic is current on first render. `BlankPage` renders the header, the empty state by default, and
  children instead when given.
- e2e: the eight routes join the routes loop (zero console/page errors); `status page reads on the gradient`
  (`/errors/404`: h1 visible, computed colour of the h1 is light, the `main` landmark exists, both actions
  visible, at 375 no horizontal overflow); `real 404 uses the status page` (`/this-page-does-not-exist`
  responds 404 and shows "There's nothing at this address."); `error boundary uses the status page`
  (`/errors/throw` shows "Something went wrong on our side." and "Try again"); `maintenance shows the window`
  (both times visible, amber label); `faq index links to topics` (clicking "Billing" in the index moves the
  Billing section into view and marks it current; a question's anchor link sets the hash).

## Decisions

1. Status pages reuse the Nightfall gradient rather than a new palette: the family stays recognisable next
   to the auth pages, and the mute is one token.
2. One layout, six thin pages: the copy table is the only thing that varies, so the named pages are
   defaults, not forks.
3. Forced dark via the `.dark` class, as the auth drawer does, so Park's own dark variants do the work.
4. Console pages are content components, not shells: hosts already own an `AppShell`; the preview shows the
   composition through `ConsoleFrame`.
5. FAQ answers are always open with anchors (option B) instead of an accordion: linkable, searchable by the
   browser, no new Park component to sync.
6. The preview wires Next's real `not-found` and `error` boundaries to the status pages so the e2e proves
   the integration, not just the demo routes.

## Calls made after the builder check

- **Mute placement**: `gradients.status` holds the darkening layer composed over the Nightfall layers; the
  `filter: saturate(0.85)` sits on the fixed backdrop element only, never on the page container, so text and
  buttons keep full saturation. The DOM is: a page root (`className="dark"`, `colorScheme="dark"`, `position:
relative`, `minH: 100dvh`, `overflow: hidden`) containing the backdrop, the brand row, the watermark, the
  `main` landmark with the message block, and the footer row.
- **Actions with neither `href` nor `onSelect`**: they still render, as enabled Park `Button`s that do
  nothing (the demo's controls are inert by convention). No built-in fallbacks (`history.back()`,
  `location.reload()`): hosts own navigation. "Try again" on the preview's `error.tsx` is wired to Next's
  `reset`; the named pages' defaults are labels and variants only.
- **Preview panel trigger on bare pages**: it stays (it is the preview's own chrome). Its overlap with the
  footer's version text at the bottom-right corner is accepted; the e2e asserts the actions and the h1, not
  the version.
- **Blank page empty area**: the dashed area _is_ the existing `EmptyState` (no second dashed box).
  `EmptyState` gains an optional `minH` prop (a sizes token, default none); the Blank page passes `minH="60"`.
  Changing our own widget is fine.
- **500 request id in the preview's `error.tsx`**: `error.digest` when present, otherwise omitted. The
  boundary covers route errors only (Next's `error.tsx` does not catch root-layout errors); that is enough
  for the demo.
- **"Help" nav item and `ConsoleFrame`**: `ConsoleFrame` carries the dashboard demo's full `TopBar`,
  `SideNav` groups (now with "Help" under Manage), workspace select, `defaultCollapsed` and footer unchanged;
  the dashboard e2e asserts titles and landmarks, not nav counts, so adding an item is safe. The builder
  checks the unit tests when extracting.
- **FAQ scroll container**: `AppShell` scrolls the window (the `main` region is not an inner scroll pane),
  so the sticky index uses `position: sticky; top: <top bar height + gap>` and the IntersectionObserver uses
  the viewport as `root` with a top `rootMargin` equal to the top bar height.

## Left to the builder

- Exact clamp for the watermark size and its offsets; the mobile form of the FAQ index (chips vs plain links).
- The IntersectionObserver thresholds for the current topic; whether the anchor link copies the URL.
- Which lucide icon the "Help" nav item uses; mock FAQ copy beyond the pinned topic names.
- File layout under `src/pages/status/` and `src/pages/console/` and the barrel exports.
