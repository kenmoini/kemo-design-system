# Status pages and console pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship six bare status pages (401, 403, 404, 500, 503, Maintenance) on the muted Nightfall gradient, and two console pages (FAQ, Blank) for the app shell, with preview routes, real Next boundaries, README and e2e.

**Architecture:** One `StatusLayout` in `packages/ui/src/pages/status/` renders the muted backdrop, brand row, watermark, `main` message block and footer; six named pages are thin wrappers that supply the pinned copy as defaults. `FaqPage` and `BlankPage` in `src/pages/console/` are `main` content for a host's `AppShell`. The preview extracts the dashboard's shell composition into `ConsoleFrame`, adds the routes and panel entries, and wires `not-found.tsx` / `error.tsx` to the status pages.

**Tech Stack:** React 19, Park UI (Ark UI 5.40) on Panda CSS 2.5, Next.js 16 App Router, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-status-and-console-pages-design.md`

## Global Constraints

- Inside `packages/ui/src/pages/<family>/`, styled-system imports are `../../../styled-system/*` and Park components `../../components/ui`; never `~/` or bare `styled-system/`. Tokens only; no raw hex outside `theme/tokens/gradients.ts`.
- Synced Park files (`src/components/ui/**` except `password-input.tsx`, `src/theme/recipes/**`, `src/theme/colors/**`, `global-css.ts`, `conditions.ts`) are never hand-edited.
- `'use client'` on files using hooks/effects. Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; `pnpm lint` zero warnings (Panda ESLint plugin: static style props only).
- Mute: `gradients.status` = `linear-gradient(rgba(12,8,22,0.58), rgba(12,8,22,0.58))` composed over the two Nightfall layers; `filter: saturate(0.85)` on the backdrop element only. Forced dark via `className="dark"` + `colorScheme="dark"` on the page root.
- Status tones: `warning` → `amber.9` dot, `critical` → `red.9` dot, `neutral` → no dot; the label text always carries the meaning. Headings `Heading as="h1"`, `textStyle` `{ base: '2xl', md: '3xl' }`, semibold, `letterSpacing: tight`.
- Copy defaults exactly as the spec's copy table (label, heading, help text, action labels and variants).
- `LinkComponent` is the shared type from `pages/auth/types.ts`; actions with `href` render through it with `Button asChild`; actions with neither `href` nor `onSelect` render as enabled, inert buttons.
- Green before every commit: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. Preview tasks add `pnpm build` and Playwright on :3100. One commit per task on `main`.
- Never stop the user's `next dev` on :3000; run build/dev/Playwright with the sandbox disabled.

## Review Focus

1. A status page at 375px wide: the watermark must be clipped by the page, with no horizontal scroll (e2e `status page reads on the gradient` asserts `scrollWidth === 375`; Task 1 test asserts the watermark is `aria-hidden` and the page root has `overflow: hidden`).
2. `refreshIntervalMs` set then the page unmounts: the timer must be cleared and never call `window.location.reload` in tests (Task 1 fake-timer test).
3. An action with neither `href` nor `onSelect`: it still renders as an enabled button and clicking does nothing (Task 1 test).
4. `FaqPage` with an empty `topics` list or a topic with no questions: header and index render, nothing throws, no current-topic marker is set (Task 3 test).
5. The preview's real `error.tsx` path: a route that throws must show "Something went wrong on our side." with a working "Try again", and that one expected console error must not fail the suite (Task 4 e2e filters the thrown message; `/errors/throw` stays out of the routes loop).

---

### Task 1: `gradients.status` token and `StatusLayout`

**Files:**

- Modify: `packages/ui/src/theme/tokens/gradients.ts` (add `status`)
- Create: `packages/ui/src/pages/status/{types.ts,status-layout.tsx,status-action.tsx,index.ts}`
- Modify: `packages/ui/src/index.ts` (`export * from './pages/status'`), `packages/ui/src/theme.test.ts` (one assertion)
- Test: `packages/ui/src/pages/status/status-layout.test.tsx`

**Interfaces:**

- Consumes: `LinkComponent` from `../auth/types`; Park `Button`, `Heading`, `Text`, `Link`; styled-system `styled`, `Box`, `HStack`, `Stack`.
- Produces (`types.ts`): `StatusTone = 'neutral' | 'warning' | 'critical'`; `StatusAction { label: string; href?: string; onSelect?: () => void; variant?: 'solid' | 'outline' | 'plain' }`; `StatusLayoutProps` exactly as the spec's API block (`code?`, `label`, `title`, `description?`, `tone?`, `watermark?`, `meta?`, `actions?`, `requestId?`, `version?`, `footerNote?`, `logo?`, `brand?`, `linkComponent?`, `refreshIntervalMs?`, `onRefresh?`).
- Produces: `StatusLayout(props: StatusLayoutProps)`; `StatusActionButton({ action, index, linkComponent })` (internal, exported from `status-action.tsx` for the named pages' tests) — `variant` defaults to `solid` for index 0, `plain` otherwise.
- DOM contract: page root `Box className="dark" colorScheme="dark" position="relative" minH="100dvh" overflow="hidden" bg="canvas"`; backdrop `Box position="fixed" inset="0" bgGradient="status" filter="auto" saturate="0.85"` (`aria-hidden`); brand row `HStack` top-left with `logo` and `Text textStyle="sm" color="fg.muted"` `brand`; watermark `Box aria-hidden data-part="watermark"` with `fontSize` clamp between 160px and 320px (as a `clamp()` string in a `styled` base), `fontWeight: bold`, `letterSpacing: '-0.06em'`, `color: 'white.a3'`, positioned top-right with negative offsets, `userSelect: none`, `pointerEvents: none`; `main` containing the message block (`Stack maxW="32rem"`), anchored `bottom: 16 / left: 8` on `md`+ and in flow below the brand row otherwise; footer `HStack` pinned to the bottom with `justify="space-between"`, `textStyle="xs"`, `color="fg.subtle"`, left `footerNote ?? (requestId && "Request ID {requestId}")`, right `version`; omitted when all three are absent.

- [ ] **Step 1: Write the failing tests** in `status-layout.test.tsx`:

```tsx
it('renders the label, heading, description and tone dot', () => {
  render(<StatusLayout code={500} label="Server error" title="Something went wrong on our side." description="Try again." tone="critical" />)
  expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong on our side.' })).toBeInTheDocument()
  expect(screen.getByText('500 · Server error')).toBeInTheDocument()
  expect(screen.getByTestId('status-dot')).toHaveAttribute('aria-hidden', 'true')
})
it('omits the dot for the neutral tone', ...)                       // queryByTestId('status-dot') is null
it('renders the watermark decoratively', ...)                       // getByText('404') inside [data-part=watermark] has aria-hidden; page root has overflow hidden (toHaveClass(/overflow_hidden/))
it('renders actions: href through the link component, onSelect as a button, neither as an inert button', async () => {
  const HostLink: LinkComponent = ({ href, children, ...rest }) => <a href={`/host${href}`} {...rest}>{children}</a>
  const onSelect = vi.fn()
  render(<StatusLayout label="Not found" title="T" linkComponent={HostLink} actions={[{ label: 'Go to dashboard', href: '/dashboard' }, { label: 'Retry', onSelect }, { label: 'Nothing' }]} />)
  expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute('href', '/host/dashboard')
  await user.click(screen.getByRole('button', { name: 'Retry' })); expect(onSelect).toHaveBeenCalledOnce()
  const inert = screen.getByRole('button', { name: 'Nothing' }); expect(inert).toBeEnabled(); await user.click(inert)
})
it('renders the footer with request id and version, and footerNote replaces the request id', ...)
it('renders the meta row', ...)                                      // meta=[{label:'Started',value:'02:00 UTC'}] → getByText('02:00 UTC')
it('calls onRefresh on the interval and clears it on unmount', () => {
  vi.useFakeTimers(); const onRefresh = vi.fn()
  const { unmount } = render(<StatusLayout label="L" title="T" refreshIntervalMs={1000} onRefresh={onRefresh} />)
  vi.advanceTimersByTime(2000); expect(onRefresh).toHaveBeenCalledTimes(2)
  unmount(); vi.advanceTimersByTime(2000); expect(onRefresh).toHaveBeenCalledTimes(2); vi.useRealTimers()
})
```

Plus in `theme.test.ts`: `expect(token('gradients.status')).toContain('rgba(12, 8, 22, 0.58)')` (match the exact string you write in the token).

- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run status-layout theme`. Expected: FAIL (module not found / token undefined).
- [ ] **Step 3: Implement** the token, `types.ts`, `status-action.tsx`, `status-layout.tsx` (`'use client'`: the refresh effect `setInterval(() => (onRefresh ?? (() => window.location.reload()))(), refreshIntervalMs)` with cleanup; no effect when `refreshIntervalMs` is unset), `index.ts`, and the `src/index.ts` export. The watermark text is `watermark ?? String(code ?? '')`; render nothing when empty.
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0; `pnpm --filter @kemo/ui lib` emits `--gradients-status`.
- [ ] **Step 5: Commit** `feat(ui): add StatusLayout and the muted status gradient`.

---

### Task 2: The six named status pages

**Files:**

- Create: `packages/ui/src/pages/status/{status-copy.ts,not-found-page.tsx,unauthorized-page.tsx,forbidden-page.tsx,server-error-page.tsx,unavailable-page.tsx,maintenance-page.tsx}`
- Modify: `packages/ui/src/pages/status/index.ts`
- Test: `packages/ui/src/pages/status/status-pages.test.tsx`

**Interfaces:**

- Consumes: `StatusLayout`, `StatusLayoutProps`, `StatusAction` from Task 1.
- Produces (`status-copy.ts`): `statusCopy: Record<'401' | '403' | '404' | '500' | '503' | 'maintenance', { code?: number; label: string; title: string; description: string; tone: StatusTone; watermark?: string; actions: StatusAction[] }>` with the spec table verbatim (Maintenance `watermark: 'Back soon'`, no `code`); `mergeActions(defaults: StatusAction[], overrides?: StatusAction[]): StatusAction[]` — when `overrides` is given, each override replaces the default with the same `label` (keeping the default `variant` unless the override sets one) and unknown labels are appended; when omitted, the defaults are returned.
- Produces: `type StatusPageProps = Partial<StatusLayoutProps>`; `NotFoundPage`, `UnauthorizedPage`, `ForbiddenPage`, `ServerErrorPage`, `UnavailablePage` (`(props: StatusPageProps) => JSX`), `MaintenancePage(props: StatusPageProps & { startedAt?: string; expectedBackAt?: string })` which builds `meta` from the two strings (labels "Started" / "Expected back") and, when `refreshIntervalMs` is set and `footerNote` is not, uses the note "This page refreshes itself every minute".

- [ ] **Step 1: Failing tests** in `status-pages.test.tsx`: each page renders its default heading and label (`NotFoundPage` → "There's nothing at this address." and "404 · Not found"; `MaintenancePage` → "We're making improvements." and "Scheduled maintenance" with no code prefix); `ServerErrorPage` shows the dot and three actions in order Try again / Go to dashboard / View status page; `mergeActions` keeps order and variant when a host passes `[{ label: 'Try again', onSelect }]` (click calls it, other defaults still render); a host passing an unknown label appends it; `MaintenancePage startedAt="02:00 UTC" expectedBackAt="03:30 UTC"` renders both values and, with `refreshIntervalMs={60000}`, the refresh note.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run status-pages`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add the named status pages with pinned copy`.

---

### Task 3: Console pages (`FaqPage`, `BlankPage`) and `EmptyState.minH`

**Files:**

- Create: `packages/ui/src/pages/console/{types.ts,faq-page.tsx,faq-index.tsx,use-current-section.ts,blank-page.tsx,index.ts}`
- Modify: `packages/ui/src/widgets/empty-state.tsx` (`minH?: SystemStyleObject['minH']`-style token prop; `action.onSelect` becomes optional), `packages/ui/src/widgets/empty-state.test.tsx`, `packages/ui/src/index.ts` (`export * from './pages/console'`)
- Test: `packages/ui/src/pages/console/{faq-page,blank-page}.test.tsx`

**Interfaces:**

- Consumes: `PageHeader` from `../../layouts/app-shell`; `EmptyState` from `../../widgets`; `MEDIA_LG` is not needed (layout is responsive CSS); `LinkComponent` from `../auth/types`.
- Produces (`types.ts`): `FaqQuestion`, `FaqTopic`, `FaqPageProps`, `BlankPageProps` exactly as the spec's API block.
- Produces: `FaqPage(props)` — `PageHeader title context=description actions=<Button variant="outline">` (href → `Button asChild` + link), then `Grid` `{ base: '1fr', lg: '12rem minmax(0, 44rem)' }` `gap="8"`; `FaqIndex({ topics, currentId })` renders `nav aria-label="Topics"` with one link per topic (`href="#topic-{id}"`, `aria-current="true"` on the current one, start border `2px` `fg.default` when current) and is `position: sticky; top: 16` on `lg` and a horizontal `overflowX: auto` row below; each topic is `section id="topic-{id}"` with `Heading as="h2" textStyle="lg"` and each question `Heading as="h3" textStyle="md" id="q-{id}"` followed by a `Link href="#q-{id}" aria-label="Link to this question">#</Link>` and the answer in `Text color="fg.muted"`. `useCurrentSection(ids: string[], topOffsetPx = 56): string | undefined` — IntersectionObserver over the section elements, viewport root, `rootMargin: -{topOffsetPx}px 0px -60% 0px`, initial value `ids[0]`, guarded for no `IntersectionObserver` (jsdom) and empty ids.
- Produces: `BlankPage(props)` — `PageHeader` + (`children` ?? `EmptyState message={emptyMessage} action={emptyAction} minH="60"`), `emptyMessage` default "Nothing here yet. Replace this area with your content.".

- [ ] **Step 1: Failing tests.** `faq-page.test.tsx`: renders `navigation` named "Topics" with a link per topic pointing at `#topic-{id}`; every question is an `h3` with an `id` `q-{id}` and a link named "Link to this question" with `href="#q-{id}"`; the first topic's index link has `aria-current="true"`; the action renders and calls `onSelect`; with `topics={[]}` the header and the empty nav render and nothing throws; a topic with `questions: []` renders its `h2` only. `blank-page.test.tsx`: renders the `h1` title, context, action click; renders the default empty message and `emptyAction` click; with `children` renders them and no empty message. `empty-state.test.tsx` gains: `minH="60"` adds the class (`toHaveClass(/minH_60/)`); an action without `onSelect` renders an enabled button.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run faq-page blank-page empty-state`. Expected: FAIL.
- [ ] **Step 3: Implement.** `'use client'` on `faq-page.tsx` (hook) and `use-current-section.ts`.
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add FaqPage and BlankPage console pages`.

---

### Task 4: Preview routes, boundaries, ConsoleFrame, panel, README, e2e

**Files:**

- Create: `apps/preview/src/components/console/console-frame.tsx`, `apps/preview/src/components/console/{faq-demo.tsx,blank-demo.tsx}`, `apps/preview/src/components/status/status-demo.tsx`, `apps/preview/src/lib/{mock-faq.ts,mock-status.ts}`, `apps/preview/src/app/{faq,blank,maintenance}/page.tsx`, `apps/preview/src/app/errors/{401,403,404,500,503,throw}/page.tsx`, `apps/preview/src/app/not-found.tsx`, `apps/preview/src/app/error.tsx`
- Modify: `apps/preview/src/components/dashboard/dashboard-demo.tsx` (use `ConsoleFrame`), `apps/preview/src/lib/mock-dashboard.ts` (nav gains `{ id: 'help', label: 'Help', icon: CircleHelp, href: '/faq' }` under Manage), `apps/preview/src/components/preview-panel.tsx`, `apps/preview/e2e/smoke.spec.ts`, `README.md`
- Test: `apps/preview/e2e/smoke.spec.ts`

**Interfaces:**

- Consumes: everything exported in Tasks 1–3; `AppShell`, `TopBar`, `SideNav`, `PageFooter`, `BrandMark`, the dashboard mocks.
- Produces: `ConsoleFrame({ active?: string; children })` — the dashboard's `AppShell` with `TopBar` (environment select state), `SideNav` (groups from `mockNavGroups` with `active` set on the item whose `id === active`, workspace `DemoSelect` footer, `linkComponent={NextLink}`) and `PageFooter`; `DashboardDemo` renders `<ConsoleFrame active="overview">…</ConsoleFrame>` with its page content unchanged. `StatusDemo({ page: '401' | '403' | '404' | '500' | '503' | 'maintenance' })` renders the matching named page with `logo={<BrandMark letter="K" />}`, `brand="Kemo Console"`, `requestId="7f3a-21c9"`, `version="Kemo Console v0.3.0"`, inert actions (hrefs for "Go to dashboard" → `/dashboard`, "Sign in" → `/login`), Maintenance with `startedAt="02:00 UTC" expectedBackAt="03:30 UTC"` and no refresh. `mock-faq.ts`: `faqTopics: FaqTopic[]` (Deployments, Accounts and access, Billing, Security; 3–4 questions each with ids like `rollback`, `canary-stuck`). `app/not-found.tsx` renders `NotFoundPage` with the demo props; `app/error.tsx` (`'use client'`) renders `ServerErrorPage` with `requestId={error.digest}` and `actions={[{ label: 'Try again', onSelect: reset }, { label: 'Go to dashboard', href: '/dashboard' }, { label: 'View status page', href: '/maintenance' }]}`; `app/errors/throw/page.tsx` throws `new Error('Preview: intentional render error')` during render (client component, so the boundary catches it in prod).
- Panel: `pageRoutes` gains `{ href: '/faq', label: 'FAQ' }` and `{ href: '/blank', label: 'Blank page' }` after Dashboard; new `statusRoutes` group "Status pages" (`/maintenance` Maintenance, `/errors/401` … `/errors/503` by code) rendered after Pages.
- e2e: `ROUTES` gains `/faq`, `/blank`, `/maintenance`, `/errors/401`, `/errors/403`, `/errors/404`, `/errors/500`, `/errors/503` (not `/errors/throw`). New tests, in a `describe('status and console pages')`: `status page reads on the gradient` (`/errors/404`: h1 "There's nothing at this address." visible; `main` landmark; `getByRole('link', { name: 'Go to dashboard' })` and `getByRole('button', { name: 'Go back' })` visible; computed `color` of the h1 has luminance > 0.8; at 375×812 `document.documentElement.scrollWidth === 375`); `real 404 uses the status page` (`page.goto('/this-page-does-not-exist')` response status 404; h1 text); `error boundary uses the status page` (`/errors/throw`: collect console errors but ignore ones containing "intentional render error"; h1 "Something went wrong on our side."; "Try again" button visible); `maintenance shows the window` (`/maintenance`: "02:00 UTC" and "03:30 UTC" visible; text "Scheduled maintenance"); `faq index links to topics` (`/faq`: click "Billing" in the "Topics" nav → URL hash `#topic-billing`, the Billing `h2` is in the viewport, the link gets `aria-current="true"` within 2 s; click the first "Link to this question" → hash starts with `#q-`). Expected total: 30 + 8 + 5 = 43.
- README: "## Status pages and console pages" after the dashboard section — what ships; wiring `not-found.tsx` and `error.tsx` (10-line example); the FAQ data shape; the Blank page as the starter; roadmap updated.

- [ ] **Step 1: Write the failing e2e tests and ROUTES entries first**, build, run on :3100: Expected: the 8 route tests and 5 named tests FAIL (404s), 30 pass.
- [ ] **Step 2: Implement** mocks, `ConsoleFrame` (and refactor `DashboardDemo` onto it), demos, routes, boundaries, panel, README.
- [ ] **Step 3: Run everything.** `pnpm --filter @kemo/ui lib && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`, then Playwright on :3100. Expected: all exit 0; 43 passed; zero console/page errors on every looped route. Screenshot `/errors/404` and `/maintenance` at 1440 and 375 and `/faq` at 1440 and 1023; compare with `docs/superpowers/specs/assets/2026-11-11-*.html`.
- [ ] **Step 4: Commit** `feat(preview): add status pages, FAQ and Blank page demos`.

---

### Task 5: Final verification

- [ ] **Step 1:** `make check`, `pnpm build` + Playwright on :3100, `make container-build`. Expected: exit 0 each; 43 e2e passed.
- [ ] **Step 2:** `git status --porcelain` empty; `git log --oneline` shows one commit per task plus review fixes.
