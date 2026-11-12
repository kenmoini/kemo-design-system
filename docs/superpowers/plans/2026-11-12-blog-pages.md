# Blog pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a blog as three example variations ("Editorial list", "Magazine grid", "Journal with a rail"), each an index page and a post page with a comments section, outside the console shell, with preview routes, a "Blog" panel section, README and e2e.

**Architecture:** A new family `packages/ui/src/pages/blog/`. Pure content helpers (`content.ts`) and shared parts (`BlogLayout`, `BlogProse`, `BlogCover`, `BlogComments`, byline, `SubscribeForm`, copy link, topic filter hook) carry everything the variations have in common; six internal variation components (index and post for each) only arrange them. Two public pages, `BlogIndexPage` and `BlogPostPage`, switch on `variant`. The preview adds `/blog/[variant]` and `/blog/[variant]/[slug]` driven by one mock data file.

**Tech Stack:** React 19, Park UI (Ark UI 5.40) on Panda CSS 2.5, react-hook-form + zod 4, lucide-react, Next.js 16 App Router, Vitest + Testing Library, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-12-blog-pages-design.md` (read it with the two mockups under `docs/superpowers/specs/assets/2026-11-12-blog-*.html`; the mockups are the reference for proportion, the spec for values and behaviour).

## Global Constraints

- Inside `packages/ui/src/pages/blog/`, styled-system imports are `../../../styled-system/*` and Park components `../../components/ui`; never `~/` or bare `styled-system/`. Tokens only; raw colour values only in `theme/tokens/gradients.ts`.
- Synced Park files (`src/components/ui/**` except `password-input.tsx`, `src/theme/recipes/**`, `src/theme/colors/**`, `global-css.ts`, `conditions.ts`) are never hand-edited.
- `'use client'` on files using hooks/effects. Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; lint zero warnings (Panda ESLint plugin: static style props only).
- Variation ids and titles, exact: `editorial-list` "Editorial list", `magazine-grid` "Magazine grid", `journal-rail` "Journal with a rail".
- Dates: absolute, UTC, `en-GB`: long "11 Nov 2026", short "04 Nov", inside `<time dateTime={iso}>`. Reading time "{n} min read". Counts "8 posts" / "1 post".
- Elements on Nightfall force dark mode the way `AuthLayout` does (`className="dark"` + `colorScheme="dark"`), in both themes. Nightfall is `bgGradient="auth"`.
- Exactly one `h1` per page. Every visible control does something; nothing inert.
- `LinkComponent` is the shared type from `pages/auth/types.ts`; the default is a bare `<a>`.
- No new dependencies.
- **Shared tree.** Another session commits Deployments work to `main` concurrently. Stage by explicit path only (never `git add -A` / `git add .`). Never touch, format or "fix" `pages/deployments/`, `pages/resources/`, `widgets/schema-browser/`, `widgets/yaml-editor/`, `lib/kubernetes`. Shared files this plan edits: `packages/ui/src/index.ts`, `packages/ui/src/theme/tokens/gradients.ts`, `packages/ui/src/theme/theme.test.ts`, `apps/preview/src/components/preview-panel.tsx`, `README.md`. Before editing one, run `git diff -- <file>`; if it carries someone else's uncommitted hunks, commit only ours (`git diff -- <file>` filtered to our hunk, then `git apply --cached`). e2e goes in a new file `apps/preview/e2e/blog.spec.ts`; do not edit `smoke.spec.ts`.
- Green before every commit: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. If a failure comes from the other session's files, report it and prove ours in isolation (`pnpm --filter @kemo/ui exec vitest run src/pages/blog`, `eslint` and `prettier --check` on our paths, `tsc` output filtered to our paths). Preview tasks add `pnpm build` and Playwright on :3100.
- Never stop the owner's `next dev` on :3000. Run build, Playwright and anything that fetches with the sandbox disabled. e2e uses a scratch Playwright config outside the repo: `testDir` the repo's `apps/preview/e2e`, `baseURL` `http://localhost:3100`, `webServer` `pnpm --filter @kemo/preview exec next start -p 3100`, `reuseExistingServer: false`.
- One commit per task on `main`; do not push.

## Review Focus

1. An index given `posts: []`: the title and description render, an `EmptyState` reads "No posts yet." with no action, no featured block or hero, nothing throws (Tasks 7, 8, 9 each test it).
2. A controlled `topic` naming a topic no post has: the list is empty, `EmptyState` reads "No posts in this topic." with "Show all posts" calling `onTopicChange(undefined)`, the live region reads "No posts in this topic" (Task 5 hook test; Task 7 page test).
3. A post whose body has no headings, or is empty, in "Journal with a rail": the "On this page" nav is omitted, the details block and the rest render (Task 9).
4. Two headings with the same text in one post: their ids are unique (`results`, `results-2`) so anchors and tracking work (Task 1).
5. A post page when `posts` holds only that post: no "More posts" nav, no "Keep reading" section, no footer previous link, nothing throws (Tasks 7, 8, 9).
6. A comment whose body contains markup (`<img src=x onerror=…>`) or one very long unbroken string: it renders as visible text, never as elements, and wraps without widening the page at 375px (Task 6 test; Task 11 e2e width check on a post with comments).

---

### Task 1: Content model and helpers

**Files:**

- Create: `packages/ui/src/pages/blog/{types.ts,content.ts,index.ts}`
- Modify: `packages/ui/src/index.ts` (add `export * from './pages/blog'` after the deployments line)
- Test: `packages/ui/src/pages/blog/content.test.ts`

**Interfaces:**

- Produces (`types.ts`): `BlogVariant`, `BlogAuthor`, `BlogTopic`, `BlogCoverSpec`, `BlogBlock`, `BlogPost`, `BlogComment`, `BlogChromeProps` (exported), `BlogIndexPageProps`, `BlogPostPageProps`, exactly as the spec's API block.
- Produces (`content.ts`), all pure, none mutate their input:
  - `blogVariants: Record<BlogVariant, { title: string; description: string }>` — titles from Global Constraints; descriptions one sentence each from the spec's intent table.
  - `sortPosts(posts: BlogPost[]): BlogPost[]` — `publishedAt` descending, ties by `slug` ascending.
  - `featuredPost(sorted: BlogPost[]): BlogPost | undefined` — newest with `featured`, else newest.
  - `topicsOf(sorted: BlogPost[]): BlogTopic[]` — distinct by `id`, first-appearance order.
  - `filterByTopic(sorted: BlogPost[], topicId?: string): BlogPost[]`
  - `adjacentPosts(sorted: BlogPost[], slug: string): { older?: BlogPost; newer?: BlogPost }`
  - `relatedPosts(sorted: BlogPost[], post: BlogPost, count?: number): BlogPost[]` — default 3; same-topic first (newest first), then the remaining newest; never `post`.
  - `groupByMonth(sorted: BlogPost[]): { key: string; label: string; posts: BlogPost[] }[]` — `key` "2026-11", `label` "November 2026" (UTC).
  - `coverPreset(post: BlogPost): 1 | 2 | 3 | 4 | 5 | 6` — the explicit `preset` if set, else a stable hash of `slug`; `hasExplicitCover(post): boolean`.
  - `formatDate(iso): string` "11 Nov 2026"; `formatShortDate(iso)` "04 Nov"; `formatDay(iso): { day: string; weekday: string }` `{ day: '11', weekday: 'Wed' }`; `countLabel(n)` "8 posts" / "1 post" / "0 posts"; `readingLabel(n)` "9 min read".
  - `countComments(comments: BlogComment[]): number` — top-level plus one level of replies.
  - `tocOf(body: BlogBlock[]): { id: string; text: string; level: 2 | 3 }[]` — `id` is the block's `id` or a slug of `text`; a repeat gets `-2`, `-3`.
- `index.ts` re-exports the types and `blogVariants` only for now; later tasks append to it.

- [ ] **Step 1: Write the failing tests** in `content.test.ts`. Build a local `post(slug, publishedAt, topicId, extra?)` factory. Assertions:

```ts
it('names the three variations exactly', () => {
  expect(Object.entries(blogVariants).map(([id, v]) => [id, v.title])).toEqual([
    ['editorial-list', 'Editorial list'],
    ['magazine-grid', 'Magazine grid'],
    ['journal-rail', 'Journal with a rail'],
  ])
})
it('sorts newest first without mutating', ...)            // input order unchanged; ties by slug
it('picks the newest featured post, else the newest', ...)
it('derives topics in first-appearance order', ...)
it('finds older and newer neighbours', ...)               // newest has no newer; oldest has no older; unknown slug → {}
it('prefers same-topic posts for related and never returns the post itself', ...)
it('returns nothing related when it is the only post', ...)
it('groups by UTC month', ...)                            // 2026-11-01T00:30:00Z is November; labels 'November 2026', 'October 2026'
it('formats dates in UTC', () => {
  expect(formatDate('2026-11-11T09:00:00Z')).toBe('11 Nov 2026')
  expect(formatShortDate('2026-11-04T23:30:00-05:00')).toBe('05 Nov')
  expect(formatDay('2026-11-11T09:00:00Z')).toEqual({ day: '11', weekday: 'Wed' })
})
it('labels counts', ...)                                  // 8 posts, 1 post, 0 posts
it('keeps an explicit preset and derives a stable one from the slug', ...) // same slug twice → same value in 1..6
it('counts comments and their replies, ignoring deeper nesting', ...) // 3 top-level, one with 2 replies (one of which has its own reply) → 5
it('builds a table of contents with unique ids', () => {
  expect(tocOf([
    { type: 'heading', level: 2, text: 'Results' },
    { type: 'paragraph', content: 'x' },
    { type: 'heading', level: 3, text: 'Results' },
    { type: 'heading', level: 2, text: 'Next', id: 'what-next' },
  ])).toEqual([
    { id: 'results', text: 'Results', level: 2 },
    { id: 'results-2', text: 'Results', level: 3 },
    { id: 'what-next', text: 'Next', level: 2 },
  ])
})
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog/content.test.ts` — expect FAIL (module not found).
- [ ] **Step 3: Implement** `types.ts`, `content.ts`, `index.ts`, and the export line. Use `Intl.DateTimeFormat('en-GB', { timeZone: 'UTC', … })`; strip any comma or full stop the formatter adds to month abbreviations.
- [ ] **Step 4: Run** the same command — expect PASS; then the green chain.
- [ ] **Step 5: Commit** `feat(ui): add the blog content model and helpers` (paths: the four blog files, `packages/ui/src/index.ts`).

### Task 2: Cover tokens, `BlogCover` and the byline parts

**Files:**

- Modify: `packages/ui/src/theme/tokens/gradients.ts` (add `cover1` … `cover6`), `packages/ui/src/theme/theme.test.ts` (one assertion)
- Create: `packages/ui/src/pages/blog/{blog-cover.tsx,post-meta.tsx}`
- Modify: `packages/ui/src/pages/blog/index.ts` (export `BlogCover`)
- Test: `packages/ui/src/pages/blog/{blog-cover.test.tsx,post-meta.test.tsx}`

**Interfaces:**

- Consumes: `coverPreset`, `formatDate`, `formatShortDate`, `readingLabel` from Task 1.
- Token values (135° two-stop gradients from the mockup's `.c1`…`.c6`): `cover1` `#4a0f26 → #5d1f7e`; `cover2` `#5d1f7e → #140b2a`; `cover3` `#140b2a → #2a3a8a`; `cover4` `#7a1f3d → #c2542d`; `cover5` `#1c1c1c → #4a0f26`; `cover6` `#2a3a8a → #5d1f7e`. The stripe overlay (`repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 1px, transparent 1px 14px)`) is a seventh token `coverStripes`, layered by `BlogCover`.
- Produces: `BlogCover({ post?: BlogPost; cover?: BlogCoverSpec; ...styleProps })` — a `Box` with `borderRadius="l2" overflow="hidden" position="relative"`; size comes from the caller's style props (`h`, `aspectRatio`). Resolution order: `cover` prop, else `post.cover`, else `coverPreset(post)`. Preset → `aria-hidden` div with `data-preset="{n}"`; image → `<img src alt>` with `object-fit: cover` filling the box. Panda needs static class names: map preset → `bgGradient` through a `cva`/recipe-style variant map with six literal entries, not a template string.
- Produces (`post-meta.tsx`, internal, not exported from the package): `TopicBadge({ topic })` (Park `Badge` `variant="subtle" size="sm"`); `PostDate({ iso, short? })` (`<time dateTime>`); `Byline({ post, show?: Array<'avatar' | 'author' | 'date' | 'shortDate' | 'reading'> })` — default `['avatar','author','date','reading']`, parts joined by " · " (`aria-hidden` separators), `textStyle="xs" color="fg.subtle"`, avatar is Park `Avatar` 1rem with initials fallback; `AuthorBlock({ author, detail?: ReactNode })` — 2rem avatar, name in medium weight, `detail ?? author.role` beneath.

- [ ] **Step 1: Write the failing tests.**

```tsx
// blog-cover.test.tsx
it('renders a decorative preset derived from the post', ...)   // container.querySelector('[data-preset]') has aria-hidden="true"; same slug → same data-preset on rerender
it('uses an explicit preset', ...)                              // cover={{ preset: 4 }} → data-preset="4"
it('renders an image cover with its alt text', ...)             // getByRole('img', { name: 'Team photo' }) has the src
// post-meta.test.tsx
it('renders author, date and reading time', () => {
  render(<Byline post={post} />)
  expect(screen.getByText('Priya Raman')).toBeInTheDocument()
  expect(screen.getByText('11 Nov 2026').closest('time')).toHaveAttribute('dateTime', '2026-11-11T09:00:00Z')
  expect(screen.getByText('9 min read')).toBeInTheDocument()
})
it('renders only the requested parts', ...)                     // show={['author','shortDate']} → '11 Nov' present, 'min read' absent
it('shows the role under the author name', ...)                 // AuthorBlock
```

Add to `theme.test.ts`: `expect(token('gradients.cover4')).toContain('#c2542d')`.

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui lib && pnpm --filter @kemo/ui exec vitest run src/pages/blog src/theme` — expect FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the same — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add blog cover art and byline parts`.

### Task 3: `BlogProse`

**Files:**

- Create: `packages/ui/src/pages/blog/blog-prose.tsx`
- Modify: `packages/ui/src/pages/blog/index.ts` (export `BlogProse`)
- Test: `packages/ui/src/pages/blog/blog-prose.test.tsx`

**Interfaces:**

- Consumes: `BlogBlock`, `tocOf`, `BlogCover`.
- Produces: `BlogProse({ blocks: BlogBlock[] })` — a `Stack` `maxW="40rem" gap="4" textStyle="md" lineHeight="1.7"`. Heading ids come from `tocOf(blocks)` in order, so they always match a table of contents built from the same body. Per block:
  - `paragraph` → `<p>` capped `maxW="68ch"`; `list` → `ul`/`ol` (same cap); content is rendered as given (hosts supply Park `Code`/`Link`).
  - `heading` → `Heading as="h2" textStyle="xl"` or `as="h3" textStyle="lg"`, `id`, `scrollMarginTop="6"`, `mt="4"`, `letterSpacing="tight"`.
  - `quote` → `<blockquote>` `textStyle="xl"`, a 2px left rule drawn as a `_before` pseudo-element filled with `bgGradient="auth"` (so the Nightfall colour needs no new colour token); optional `<cite>` as `sm` muted on its own line.
  - `code` → `<figure>` holding a forced-dark (`className="dark"`) `<pre tabIndex={0}><code>` with `overflowX="auto" fontFamily="mono" textStyle="sm" bg="gray.2" p="4" borderRadius="l2"`; `language` as an `xs` muted label top-right; `caption` as `<figcaption>`. `tabIndex` and `aria-label` ("Code example" + language) make the scroller keyboard-reachable.
  - `callout` → outlined box, bold label (default "Note"), content; `tone: 'warning'` adds a lucide `TriangleAlertIcon` (`aria-hidden`) and default label "Warning".
  - `stats` → `<dl>` grid, 1 column below `sm`, else one per item (max 3 rendered); each cell outlined, value `2xl` semibold in `dd`, label `sm` muted in `dt` (visual order value-then-label via `flexDirection="column-reverse"`).
  - `figure` → `<figure>` with `BlogCover cover={…} aspectRatio="16 / 9"` and `<figcaption>`.

- [ ] **Step 1: Write the failing tests.**

```tsx
it('renders every block type', ...)   // one of each; assert by role/text: paragraph text, list role 'list' with 2 'listitem', blockquote text, code text inside pre, 'Note' label, stat value + label, figcaption text
it('gives headings the ids from tocOf', () => {
  const blocks: BlogBlock[] = [{ type: 'heading', level: 2, text: 'Results' }, { type: 'heading', level: 3, text: 'Results' }]
  render(<BlogProse blocks={blocks} />)
  expect(screen.getAllByRole('heading').map((h) => [h.tagName, h.id])).toEqual([['H2', 'results'], ['H3', 'results-2']])
})
it('renders ordered lists as ol', ...)
it('marks a warning callout with a label, not only colour', ...)   // getByText('Warning')
it('makes the code block focusable and labelled', ...)             // getByLabelText('Code example, python') has tabindex 0
it('renders at most three stats', ...)
it('renders nothing for an empty body', ...)                       // no headings, no crash
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog/blog-prose.test.tsx` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add BlogProse for post bodies`.

### Task 4: `BlogLayout` and subscribing

**Files:**

- Create: `packages/ui/src/pages/blog/{blog-layout.tsx,subscribe-form.tsx,subscribe-dialog.tsx}`
- Modify: `packages/ui/src/pages/blog/index.ts` (export `BlogLayout`, `SubscribeForm`, their prop types)
- Test: `packages/ui/src/pages/blog/{blog-layout.test.tsx,subscribe-form.test.tsx}`

**Interfaces:**

- Consumes: `BlogChromeProps`, `LinkComponent`; Park `Button`, `Dialog`, `Field`, `Input`, `CloseButton`; react-hook-form + zod (follow `pages/auth` for the resolver pattern).
- Produces: `SubscribeForm({ onSubscribe: (email: string) => Promise<void>; layout?: 'stacked' | 'inline'; idPrefix?: string })`. Copy, exact: label "Email", placeholder "you@example.com", button "Subscribe", invalid "Enter a valid email address.", success (replaces the form, `role="status"`) "Thanks. Check {email} to confirm.", rejection shown in `role="alert"` as the rejection's `message` or "Something went wrong. Try again.". While pending the button is `loading` and the form cannot be submitted twice.
- Produces: `SubscribeDialog({ onSubscribe, trigger: ReactElement })` (internal) — Park `Dialog`, title "Get new posts by email", description "One email per post. Unsubscribe at any time.", a close button, `SubscribeForm` in the body. Closing returns focus to the trigger (Ark default; assert it). Reopening after success shows a fresh form.
- Produces: `BlogLayout({ logo?, brand, section = 'Blog', nav?, footer?, onSubscribe?, hideSubscribe?: boolean, linkComponent?, indexHref, children })` — root `Box minH="100dvh" bg="bg.canvas" display="flex" flexDirection="column"`; `<header>` 3.5rem, `bg="bg.default"`, bottom hairline, containing: one link to `indexHref` (logo, `brand` semibold `sm`, "/ {section}" `fg.subtle`), a `<nav aria-label="Blog">` of `nav` links (hidden below `md`; `aria-current="page"` on `current`), and on the right the solid `sm` "Subscribe" button wrapped in `SubscribeDialog` when `onSubscribe && !hideSubscribe`; `<main>` (`flex="1"`) with `children`; `<footer>` with `footer ?? null` left and "© {current year} {brand}" right, `xs` `fg.subtle`, top hairline. The `nav` element is omitted when `nav` is empty or absent.

- [ ] **Step 1: Write the failing tests.**

```tsx
// subscribe-form.test.tsx
it('rejects an invalid address without calling the host', ...)     // type 'nope', submit → 'Enter a valid email address.'; onSubscribe not called
it('shows the pending state then the confirmation', async () => {
  let resolve!: () => void
  const onSubscribe = vi.fn(() => new Promise<void>((r) => (resolve = r)))
  render(<SubscribeForm onSubscribe={onSubscribe} />)
  await user.type(screen.getByLabelText('Email'), 'ada@example.com')
  await user.click(screen.getByRole('button', { name: 'Subscribe' }))
  expect(onSubscribe).toHaveBeenCalledWith('ada@example.com')
  await user.click(screen.getByRole('button', { name: /Subscribe/ }))   // second click while pending
  expect(onSubscribe).toHaveBeenCalledOnce()
  resolve()
  expect(await screen.findByRole('status')).toHaveTextContent('Thanks. Check ada@example.com to confirm.')
  expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
})
it('keeps the form and shows the reason when the host rejects', ...)   // rejects Error('Address blocked') → role alert 'Address blocked'; field still present with its value
it('falls back to a generic message for a non-Error rejection', ...)   // 'Something went wrong. Try again.'
// blog-layout.test.tsx
it('renders header, main and footer landmarks with the brand link', ...) // banner, main, contentinfo; link name matches /Kemo.*Blog/ href indexHref; footer contains `© ${new Date().getFullYear()} Kemo`
it('marks the current nav link and omits the nav when there are no links', ...)
it('offers Subscribe only when the host handles it', ...)               // absent without onSubscribe; absent with hideSubscribe
it('opens the subscribe dialog and returns focus on close', ...)        // click Subscribe → dialog named 'Get new posts by email'; Escape → trigger has focus (use src/test/layout.ts stubLayout() as the access dialogs do)
it('routes links through the host link component', ...)
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add BlogLayout and the subscribe form`.

### Task 5: Topic filter hook, post-count status and copy link

**Files:**

- Create: `packages/ui/src/pages/blog/{use-topic-filter.ts,post-count-status.tsx,copy-link-button.tsx,use-reveal.ts}`
- Test: `packages/ui/src/pages/blog/{use-topic-filter.test.tsx,copy-link-button.test.tsx}`

**Interfaces (all internal to the family):**

- `useTopicFilter(posts: BlogPost[], opts: { topic?: string; defaultTopic?: string; onTopicChange?: (id: string | undefined) => void }): { sorted: BlogPost[]; topics: BlogTopic[]; topic: string | undefined; topicLabel: string | undefined; visible: BlogPost[]; setTopic: (id: string | undefined) => void }` — controlled exactly when `onTopicChange` is passed and the `topic` key is present in `opts` (even as `undefined`, which means "all"); otherwise uncontrolled, starting at `defaultTopic`, and `onTopicChange` (if any) is still called on every change. `topicLabel` is `undefined` for an id no post has. `sorted`/`topics`/`visible` memoised.
- `PostCountStatus({ count, topic, topicLabel })` — visually hidden `role="status" aria-live="polite"`: no topic → `countLabel(count)`; topic with matches → "{countLabel} in {topicLabel}"; topic with none → "No posts in {topicLabel ?? 'this topic'}".
- `useReveal(total: number, step: number, resetKey: unknown): { shown: number; hasMore: boolean; more: () => void }` — starts at `step`, grows by `step`, resets when `resetKey` changes.
- `CopyLinkButton({ label = 'Copy link', ...buttonProps })` — Park `Button variant="outline" size="sm"`; on click `navigator.clipboard.writeText(window.location.href)`; label becomes "Copied" (or "Copy failed" when the API is missing or rejects) for 2000 ms then reverts; a visually hidden `role="status"` carries "Link copied" / "Copy failed"; the timer is cleared on unmount.

- [ ] **Step 1: Write the failing tests.**

```tsx
// use-topic-filter.test.tsx (renderHook)
it('is uncontrolled by default and starts at defaultTopic', ...)
it('filters and reports the label', ...)                          // setTopic('releases') → visible all releases, topicLabel 'Releases'
it('is controlled when topic and onTopicChange are passed', ...)  // setTopic calls onTopicChange and does not change `topic` until rerendered
it('returns nothing visible for an unknown topic', ...)           // topic 'nope' → visible [], topicLabel undefined
it('PostCountStatus words each case', ...)                        // '8 posts', '2 posts in Releases', '1 post in Design', 'No posts in this topic'
it('useReveal grows by the step and resets on key change', ...)
// copy-link-button.test.tsx (vi.useFakeTimers, stub navigator.clipboard)
it('copies the page address and confirms, then reverts', ...)     // writeText called with window.location.href; button 'Copied'; status 'Link copied'; after 2000ms 'Copy link'
it('reports failure when the clipboard rejects', ...)             // 'Copy failed'
it('reports failure when the clipboard API is missing', ...)
it('clears its timer on unmount', ...)                            // unmount then advance timers: no act warning / no state update error
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add blog topic filtering and copy link`.

### Task 6: `BlogComments`

**Files:**

- Create: `packages/ui/src/pages/blog/{blog-comments.tsx,comment-form.tsx}`
- Modify: `packages/ui/src/pages/blog/index.ts` (export `BlogComments` and its props type)
- Test: `packages/ui/src/pages/blog/blog-comments.test.tsx`

**Interfaces:**

- Consumes: `BlogComment`, `countComments`, `formatDate` (Task 1); Park `Avatar`, `Button`, `Field`, `Input`, `Textarea`; react-hook-form + zod as in Task 4.
- Produces: `BlogComments({ comments: BlogComment[]; onAddComment?: (input: { name: string; body: string; parentId?: string }) => Promise<void> })` — `<section id="comments" aria-labelledby>` with `maxW="40rem"`, `scrollMarginTop="6"`, a top hairline and `pt="10" mt="10"`. Structure and copy, exact:
  - `h2` whose accessible name is "Comments ({n})" (visible: "Comments" and the number in `fg.muted`), `n = countComments(comments)`.
  - Top-level form (only with `onAddComment`), then the list (`<ol>`, oldest first by `postedAt`, replies likewise) or, when empty, the text "No comments yet.".
  - A comment: `<article>` with a 2rem `Avatar` (initials fallback), name (medium weight), `<time dateTime>` `formatDate`, the body in a `<p>` with `whiteSpace="pre-wrap" overflowWrap="anywhere"`, and (top-level only, with `onAddComment`) a `Button variant="plain" size="xs"` "Reply" with `aria-expanded`.
  - Replies: an `<ol>` under the parent, `pl="6"` behind a left hairline. Only `comment.replies` of top-level comments render.
  - "Reply" toggles an inline form under that comment (after its replies); opening one closes any other; "Cancel" closes it and returns focus to that "Reply" button.
- Produces (internal): `CommentForm({ onSubmit: (v: { name: string; body: string }) => Promise<void>; onCancel?: () => void; submitLabel?: string; idPrefix: string; autoFocus?: boolean })`. Fields "Name" (max 80) and "Comment" (`Textarea rows={4}`, max 2000), both trimmed and required; errors "Enter your name.", "Enter a comment.", "Keep your name under 80 characters.", "Keep your comment under 2000 characters."; submit "Post comment" (reply form: "Post reply"); loading while pending, no double submit; on resolve: clear the comment field, keep the name, show `role="status"` "Comment posted."; on reject: `role="alert"` with the rejection's `message` or "Your comment could not be posted. Try again.", values kept. A posted reply closes its form (the status is announced from the section, not the unmounted form). A name typed in one form is remembered for the next form opened in the same section (section state).

- Visual reference: `docs/superpowers/specs/assets/2026-11-12-blog-comments.html` (owner-approved). From it, also required:
  - In `types.ts` (Task 1's file) widen `BlogComment['author']` to `{ name: string; avatarSrc?: string; isAuthor?: boolean }`; a comment with `author.isAuthor` shows a Park `Badge variant="subtle" size="sm"` "Author" after the name.
  - Placeholders: Name "Your name"; Comment "Add to the discussion"; in a reply form the Comment placeholder is "Reply to {parent author's name}" (`CommentForm` takes `commentPlaceholder?: string`).
  - The top-level form's button row shows the hint "Plain text. Be kind." on the left (`CommentForm` takes `hint?: string`); the status or alert replaces the hint while shown. Reply forms have no hint, and their buttons are "Cancel" then "Post reply", right-aligned, inside an outlined box.
  - Tests to add: `it('tags the post author', ...)` (one comment with `isAuthor` → exactly one "Author" badge, inside that comment); `it('names the parent in the reply placeholder', ...)`; `it('shows the hint on the top-level form only', ...)`.

- [ ] **Step 1: Write the failing tests.** Fixture: three top-level comments (out of date order), the second with two replies.

```tsx
it('names the section with the total including replies', ...)   // getByRole('heading', { level: 2, name: 'Comments (5)' }); section has id 'comments'
it('lists comments oldest first with their replies nested once', ...) // top-level article order by date; within(second).getAllByRole('article') length 2; a reply's own `replies` are not rendered
it('shows the empty message', ...)                               // comments=[] → 'No comments yet.', heading 'Comments (0)'
it('is read-only without onAddComment', ...)                     // no textbox, no 'Reply' buttons
it('renders markup in a body as text', () => {
  render(<BlogComments comments={[{ ...c, body: '<img src=x onerror=alert(1)> <b>hi</b>' }]} />)
  expect(screen.getByText('<img src=x onerror=alert(1)> <b>hi</b>')).toBeInTheDocument()
  expect(document.querySelector('#comments img, #comments b')).toBeNull()
})
it('validates name and comment', ...)                            // submit empty → both required messages, host not called; 81-char name and 2001-char body → the two length messages
it('posts a trimmed comment, clears the text, keeps the name and confirms', async () => {
  const onAddComment = vi.fn().mockResolvedValue(undefined)
  // type '  Ada ' and ' Nice write-up. ', submit
  expect(onAddComment).toHaveBeenCalledWith({ name: 'Ada', body: 'Nice write-up.' })
  expect(await screen.findByRole('status')).toHaveTextContent('Comment posted.')
  expect(screen.getByLabelText('Comment')).toHaveValue('')
  expect(screen.getByLabelText('Name')).toHaveValue('Ada')
})
it('does not submit twice while pending', ...)
it('keeps the text and shows the reason when the host rejects', ...) // Error('Comments are closed') → alert with that text; generic message for a non-Error
it('opens one reply form at a time and posts with the parent id', ...) // Reply on first → aria-expanded true, 2 'Comment' fields; Reply on second → first closes; submit → onAddComment called with parentId of the second; form closes; status 'Comment posted.'
it('cancels a reply and returns focus to its button', ...)
it('carries the name into a reply form', ...)
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog/blog-comments.test.tsx` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add BlogComments`.

### Task 7: "Editorial list" index and post

**Files:**

- Create: `packages/ui/src/pages/blog/editorial-list/{index-page.tsx,post-page.tsx}`
- Test: `packages/ui/src/pages/blog/editorial-list/{index-page.test.tsx,post-page.test.tsx}`
- Create (shared test data, used by Tasks 7–9): `packages/ui/src/pages/blog/test-posts.tsx` — exports `testPosts` (8 posts: Engineering 4, Releases 2, Incidents 1, Design 1; dated 9 Sep–11 Nov 2026; the newest `featured`, slug `cold-start`, with a body holding two `h2` and one `h3`), `chrome` (`{ brand: 'Kemo', indexHref: '/blog', postHref: (p) => '/blog/' + p.slug }`).

**Interfaces:**

- Consumes: everything from Tasks 1–6; `EmptyState` from `../../../widgets`.
- Produces: `EditorialListIndex(props: BlogIndexPageProps)` and `EditorialListPost(props: BlogPostPageProps)`; each renders its own `BlogLayout` from the chrome props. Layout and breakpoints per the spec's "Editorial list" section and mockup card A (both files). Pinned details:
  - Index: column `maxW="45rem"`; `h1` is `title`; feature block is one link (`aria-label` not needed: the title is the link text, stretched) on `bgGradient="auth"` forced dark, with badges "Featured" and the topic; chips are `<button aria-pressed>` in a `role="group" aria-label="Topics"`, first chip "All"; count text uses `countLabel(visible.length)` (the list count, featured included when it is shown above); the list is `<ul>` of `<article>` rows with `h2` titles linking to `postHref(post)`; `useReveal(rows.length, 6, topic)`; button "Older posts".
  - Feature rules: shown only when no topic is selected and there is at least one post; the featured post is then excluded from the rows.
  - Empty: `posts` empty → `EmptyState message="No posts yet."` (no action, no chips row). Filter with no match → `EmptyState message="No posts in this topic." action={{ label: 'Show all posts', onSelect: () => setTopic(undefined) }}`.
  - Post: band on `bgGradient="auth"` forced dark, inner column `maxW="40rem"`: link "← All posts" (text `← {indexTitle ?? 'All posts'}`) to `indexHref`, `TopicBadge`, `h1`, summary, `Byline`; body `<article>` with `BlogProse`; then `AuthorBlock` and `CopyLinkButton`; then `BlogComments comments onAddComment` when `props.comments` is defined; then `<nav aria-label="More posts">` with up to two outlined cells: left "← Previous" + older title, right "Next →" + newer title; a missing side is not rendered and the other keeps its column (`gridColumn`); the nav is omitted when both are missing.

- [ ] **Step 1: Write the failing tests.**

```tsx
// index-page.test.tsx
it('renders one h1, the featured post once and the next six rows', ...)   // h1 'Notes'; 'Featured' badge; getAllByRole('article') length 6; featured title appears exactly once; 'Older posts' present
it('reveals the rest', ...)                                               // click 'Older posts' → 7 articles; button gone
it('filters by topic, hides the feature and announces the count', async () => {
  render(<EditorialListIndex {...chrome} variant="editorial-list" title="Notes" posts={testPosts} />)
  await user.click(screen.getByRole('button', { name: 'Releases' }))
  expect(screen.getByRole('button', { name: 'Releases' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.queryByText('Featured')).not.toBeInTheDocument()
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(screen.getByRole('status')).toHaveTextContent('2 posts in Releases')
})
it('shows the featured post in the rows when its topic is selected', ...) // Engineering → 4 articles including the cold-start title
it('links every post through postHref and the host link', ...)
it('honours a controlled topic and offers a way back from an empty one', ...) // topic="nope" onTopicChange=fn → 'No posts in this topic.'; click 'Show all posts' → fn called with undefined
it('renders an empty blog', ...)                                          // posts=[] → h1, 'No posts yet.', no 'Featured', no group 'Topics'
// post-page.test.tsx
it('renders the header band, body and author', ...)                       // one h1 = post title; link '← All posts' href '/blog'; time dateTime; author role text; button 'Copy link'
it('links the older and newer posts', ...)                                // middle post: nav 'More posts' has 2 links with the right hrefs
it('omits the newer side on the newest post and the older side on the oldest', ...)
it('renders without neighbours when it is the only post', ...)            // posts=[post] → queryByRole('navigation', { name: 'More posts' }) null
it('uses indexTitle for the back link', ...)
it('shows comments between the author row and More posts, and none without the prop', ...) // comments=[…2] → heading 'Comments (2)' follows 'Copy link' and precedes the nav in document order (compareDocumentPosition); without `comments` → no such heading; onAddComment is passed through (submit calls it)
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog/editorial-list` — FAIL.
- [ ] **Step 3: Implement** both pages against the mockups.
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add the Editorial list blog variation`.

### Task 8: "Magazine grid" index and post

**Files:**

- Create: `packages/ui/src/pages/blog/magazine-grid/{index-page.tsx,post-page.tsx,post-card.tsx}`
- Test: `packages/ui/src/pages/blog/magazine-grid/{index-page.test.tsx,post-page.test.tsx}`

**Interfaces:**

- Consumes: Tasks 1–6, `test-posts.tsx`; Park `Tabs`, `Pagination`, `Badge`.
- Produces: `MagazineGridIndex(props: BlogIndexPageProps)`, `MagazineGridPost(props: BlogPostPageProps)`, internal `PostCard({ post, href, linkComponent, headingLevel: 'h2' | 'h3' })` — `<article>`: `BlogCover` (`aspectRatio="16 / 9"`), `TopicBadge`, title heading whose link is stretched over the card (`_before` inset 0 on a `position: relative` article), summary, `Byline show={['avatar','author','shortDate']}`.
- Pinned details:
  - Index: `maxW="72rem"`. The blog `title` is the `h1` but visually hidden (the mockup has no visible page title; the hero leads). Hero = `sorted[0]` (newest), an `<article>` with `h2`; shown only with no topic and at least one post; excluded from the grid then. Park `Tabs` `variant="line"`, values `'all'` and each topic id, labels "All posts" and the topic labels; one `Tabs.Content` per value with `lazyMount` and `unmountOnExit` on the root, so every tab has a valid panel and only the selected grid is in the DOM. The tabs' value maps to the filter: `'all'` ↔ `undefined`.
  - Grid: `gridTemplateColumns` 1 / 2 (`sm`) / 3 (`lg`), `gap="6"`. Page size 6; Park `Pagination` (`count` = grid items, `pageSize` 6) rendered only when there is more than one page; changing topic resets to page 1; `aria-label="Pagination"`.
  - Empty states as Task 7 (same two messages).
  - Post: header column `maxW="48rem"` centred: `TopicBadge`, `h1`, summary, `AuthorBlock detail="{date} · {reading}"`; cover `maxW="72rem" aspectRatio="3 / 1"` (min height `40`); `<article>` with `BlogProse` centred; row: tags as `Badge variant="outline"` in a `<ul aria-label="Tags">` (omitted when no tags), `CopyLinkButton`, and "Share" (`navigator.share({ title, url })`), rendered only after mount when `typeof navigator.share === 'function'`; a rejected or cancelled share is swallowed. Then `BlogComments` when `props.comments` is defined. Then `<section aria-labelledby>` "Keep reading" with `relatedPosts(sorted, post, 3)` as `PostCard headingLevel="h3"`; the section is omitted when there are none.

- [ ] **Step 1: Write the failing tests.**

```tsx
// index-page.test.tsx
it('leads with the newest post and paginates the rest six to a page', ...)   // 1 h1; hero article contains newest title; grid shows 6 other posts; navigation 'Pagination' present
it('moves to the second page', ...)                                          // click page 2 (or next) → the 1 remaining post, and none of page 1's
it('filters by tab, hides the hero and returns to page one', async () => {
  // go to page 2, then choose Engineering
  expect(screen.getByRole('tab', { name: 'Engineering' })).toHaveAttribute('aria-selected', 'true')
  expect(screen.getAllByRole('article')).toHaveLength(4)
  expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
  expect(screen.getByRole('status')).toHaveTextContent('4 posts in Engineering')
})
it('makes the whole card one link', ...)                                     // each grid article has exactly one link, href from postHref
it('honours a controlled topic', ...)
it('renders an empty blog', ...)                                             // no hero, no tabs, 'No posts yet.'
// post-page.test.tsx
it('renders the centred header, cover, body and tags', ...)                  // h1; list 'Tags' with the post's tags; 'Copy link'
it('offers Share only where the browser supports it', ...)                   // absent by default in jsdom; with navigator.share stubbed → present, click calls it with { title, url }
it('swallows a cancelled share', ...)                                        // share rejects AbortError → no unhandled rejection
it('suggests three other posts, same topic first, never itself', ...)        // region 'Keep reading' has 3 articles; first ones share the topic
it('shows comments between the tags row and Keep reading, and none without the prop', ...) // document order: 'Copy link' < 'Comments (2)' < 'Keep reading'
it('omits Keep reading and tags when there is nothing to show', ...)         // posts=[post], tags undefined
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog/magazine-grid` — FAIL.
- [ ] **Step 3: Implement** against mockup card B (both files).
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add the Magazine grid blog variation`.

### Task 9: "Journal with a rail" index and post, and the public pages

**Files:**

- Create: `packages/ui/src/pages/blog/journal-rail/{index-page.tsx,post-page.tsx,on-this-page.tsx}`
- Create: `packages/ui/src/pages/blog/{blog-index-page.tsx,blog-post-page.tsx}`
- Modify: `packages/ui/src/pages/blog/index.ts` (export `BlogIndexPage`, `BlogPostPage`)
- Test: `packages/ui/src/pages/blog/journal-rail/{index-page.test.tsx,post-page.test.tsx}`, `packages/ui/src/pages/blog/blog-pages.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–8; `useCurrentSection(ids: string[], topOffsetPx?: number): string | undefined` from `../../console/use-current-section` (it also follows `location.hash`).
- Produces: `JournalRailIndex(props: BlogIndexPageProps)`, `JournalRailPost(props: BlogPostPageProps)`, internal `OnThisPage({ items: { id; text; level }[] })`; and the public `BlogIndexPage(props: BlogIndexPageProps)` / `BlogPostPage(props: BlogPostPageProps)`, each an exhaustive `switch (props.variant)` over the three variation components.
- Pinned details:
  - Both Journal pages pass `hideSubscribe` to `BlogLayout`.
  - Index: `maxW="72rem"`; from `lg` a grid `14rem 1fr`, `gap="10"`; rail `<aside>` `position="sticky" top="6"` from `lg`. Rail: `h1` = `title`, description; `<nav aria-label="Topics">` list of `<button aria-pressed>`: "All posts" and each topic, each with its count on the right (counts from all posts, not the filtered set); subscribe card (heading "Get new posts by email", `SubscribeForm layout="stacked"`) only when `onSubscribe`. Below `lg`: title and description, topics as a wrapping chip row, the feed, then the subscribe card (render the card once and move it with `order`, not twice).
  - Feed: `groupByMonth(shown)` where `shown` is the first `useReveal(visible.length, 5, topic)` posts; each group a `<section aria-labelledby>` with an `h2` month label and `countLabel(group.posts.length)` on the right (the count of posts shown in that group); items are `<article>` with `formatDay` (day number, weekday beneath, both inside one `<time dateTime>`), `h3` title link, summary, `TopicBadge` + `Byline show={['author','reading']}`, and a thumbnail `BlogCover` (`w="24" h="16"`, hidden below `sm`) only when `hasExplicitCover(post)`. Button "Load older posts". Empty states as Task 7.
  - Post: same grid. Rail: back link `← {indexTitle ?? 'All posts'}`; `OnThisPage` from `tocOf(post.body)` — `<nav aria-label="On this page">`, h3 entries indented, links `#{id}`, the current one `aria-current="location"` with a darker left rule; omitted entirely when there are no headings, and hidden below `lg`; "Details" `<dl>`: Author, Published (`formatDate`), Topic, Reading ("9 min"); `CopyLinkButton`. Main: `TopicBadge`, `h1`, summary, hairline, `<article>` `BlogProse`, then `BlogComments` when `props.comments` is defined; in that case `OnThisPage` gets a last item `{ id: 'comments', text: 'Comments', level: 2 }` rendered with the count after it in muted text ("Comments 4", `countComments`; `OnThisPage` items take an optional `suffix?: string`) (and is then shown even when the body has no headings). Footer slot of `BlogLayout`: a link "← {older.title}" when an older post exists. Below `lg`: back link and details above the title, `CopyLinkButton` after the prose (render once, reorder).

- [ ] **Step 1: Write the failing tests.**

```tsx
// journal-rail/index-page.test.tsx
it('groups the first five posts by month with counts', ...)          // h2 'November 2026' and 'October 2026'; 5 articles; 'Load older posts'
it('loads older posts', ...)                                         // click → 8 articles, a 'September 2026' group, button gone
it('lists topics with counts and filters', ...)                      // nav 'Topics': 'All posts 8', 'Engineering 4'; click Engineering → aria-pressed, 4 articles, status '4 posts in Engineering'
it('shows a thumbnail only for posts with an explicit cover', ...)   // count of [data-preset] equals posts shown that have cover
it('puts the subscribe form in the rail and none in the top bar', ...) // with onSubscribe: one 'Subscribe' button, inside the complementary landmark; without: none
it('renders an empty blog', ...)
// journal-rail/post-page.test.tsx
it('lists the sections and marks the current one', ...)              // nav 'On this page' links = tocOf texts, hrefs '#id'; first has aria-current="location" initially
it('follows the hash', ...)                                          // set location.hash to the second id, dispatch hashchange → that link is current
it('omits On this page when the body has no headings', ...)          // also body: [] → no nav, details still render
it('shows comments after the body and lists Comments last in On this page', ...) // with comments: last link 'Comments' href '#comments'; heading 'Comments (2)' in main; without: neither
it('renders the details and the back link', ...)                     // dl terms Author/Published/Topic/Reading with '11 Nov 2026', '9 min'; link '← Platform journal' when indexTitle set
it('links the older post in the footer, and nothing when alone', ...)
// blog-pages.test.tsx
it.each([
  ['editorial-list', 'Featured'],
  ['magazine-grid', 'All posts'],
  ['journal-rail', 'Load older posts'],
] as const)('BlogIndexPage renders the %s variation', ...)           // marker text present, exactly one h1
it.each(['editorial-list', 'magazine-grid', 'journal-rail'] as const)('BlogPostPage renders the %s variation with one h1 and one article body', ...)
it('exports the public API from the package index', ...)             // import * as ui from '../../index': BlogIndexPage, BlogPostPage, BlogLayout, BlogProse, BlogCover, BlogComments, SubscribeForm are functions; blogVariants has 3 keys
```

- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/blog` — FAIL.
- [ ] **Step 3: Implement** against mockup card C (both files), then the two switch components.
- [ ] **Step 4: Run** — PASS; green chain.
- [ ] **Step 5: Commit** `feat(ui): add the Journal with a rail variation and the blog pages`.

### Task 10: Preview routes, mock content and panel section

**Files:**

- Create: `apps/preview/src/lib/mock-blog.tsx`, `apps/preview/src/components/blog/blog-demo.tsx`
- Create: `apps/preview/src/app/blog/page.tsx`, `apps/preview/src/app/blog/[variant]/page.tsx`, `apps/preview/src/app/blog/[variant]/[slug]/page.tsx`
- Modify: `apps/preview/src/components/preview-panel.tsx` (a `blogRoutes` list and a "Blog" `PanelSection` between "Pages" and "Status pages")
- Test: `apps/preview/e2e/blog.spec.ts` (route checks only in this task)

**Interfaces:**

- Consumes: `BlogIndexPage`, `BlogPostPage`, `blogVariants`, `BlogVariant`, `BlogPost`, `BlogComment`, `Code`, `Link` from `@kemo/ui`; `BrandMark`; `NextLink`.
- Produces (`mock-blog.tsx`): `blogPosts: BlogPost[]` (8), `blogSlugs: string[]`, `FEATURED_SLUG = 'cold-start-62'`, `blogTitles: Record<BlogVariant, { title: string; description: string }>` (`editorial-list` and `magazine-grid`: "Notes from the platform team"; `journal-rail`: "Platform journal"; description "Engineering write-ups, release notes and the occasional post-incident review from the people who run Kemo Console."), `mockSubscribe(email: string): Promise<void>` (resolves after 600 ms; rejects with `new Error('We could not subscribe that address. Try again.')` when the address contains "fail").
- Content, exact for titles/authors/dates/topics (summaries from the mockups; reading minutes 9, 4, 12, 6, 7, 8, 5, 6 in this order):
  1. "How we cut cold-start time for cluster consoles by 62%" — Priya Raman, 2026-11-11, Engineering, featured, slug `cold-start-62`, cover preset 1, tags performance / kubernetes / caching. Full body using every block type, with `h2` sections "Where the time went", "One discovery document" (with `h3` "Cache invalidation" and "Older clusters"), "Results", "What we would do differently"; include the mockup's code block, pull quote, stats (4.1s → 1.6s p50 cold start; 38 → 1 discovery requests; −62% time to interactive) and note.
  2. "Console 4.2: schema-aware YAML editing" — Dan Okafor, 2026-11-04, Releases, cover 2.
  3. "Post-incident review: the 19 October ingress outage" — Mei Tanaka, 2026-10-28, Incidents, cover 5.
  4. "Designing status pages people can read at 3am" — Ana Souza, 2026-10-15, Design, no cover.
  5. "Role bindings without the footguns" — Dan Okafor, 2026-10-02, Engineering, cover 3.
  6. "Streaming events to ten thousand browser tabs" — Priya Raman, 2026-09-21, Engineering, cover 6.
  7. "What a year of on-call taught us about alerts" — Mei Tanaka, 2026-09-15, Engineering, no cover.
  8. "Console 4.1: deployments, rewritten" — Mei Tanaka, 2026-09-09, Releases, cover 1.
     Posts 2–8: four to eight blocks each, at least one `h2`, written as plausible prose (no lorem ipsum). Author roles: Priya Raman "Staff engineer, Console platform"; Dan Okafor "Product engineer"; Mei Tanaka "Site reliability engineer"; Ana Souza "Product designer". Slugs are kebab-case of a short form of the title.
- Produces (`mock-blog.tsx`, comments): `blogComments: Record<string, BlogComment[]>` keyed by slug — `cold-start-62`: four comments dated 11–12 Nov 2026, one of them a reply from Priya Raman (`isAuthor: true`) to the first; "Console 4.2…": two; "Role bindings…": one; every other slug absent (treated as `[]`). Fictional commenters, plausible text. `mockAddComment(text: string): Promise<void>` resolves after 400 ms, rejects with `new Error('Your comment could not be posted. Try again.')` when the text contains "fail".
- `BlogDemo` on a post keeps `comments` in `useState` seeded from `blogComments[slug] ?? []`; its `onAddComment` awaits `mockAddComment(body)` then appends `{ id: crypto.randomUUID(), author: { name }, postedAt: new Date().toISOString(), body }` to the top level or to the parent's `replies`.
- Produces: `BlogDemo({ variant, slug }: { variant: BlogVariant; slug?: string })` — `'use client'`; chrome: `logo={<BrandMark letter="K" />}`, `brand="Kemo"`, `nav={[{ label: 'Posts', href: indexHref, current: !slug }]}`, `indexHref={'/blog/' + variant}`, `postHref={(p) => '/blog/' + variant + '/' + p.slug}`, `onSubscribe={mockSubscribe}`, `linkComponent={NextLink}`; renders `BlogPostPage` (with `indexTitle` = that variation's title from `blogTitles`) when `slug`, else `BlogIndexPage`.
- Routes: `/blog/page.tsx` → `redirect('/blog/editorial-list')`. `[variant]/page.tsx`: `generateStaticParams` over `Object.keys(blogVariants)`; unknown variant → `notFound()`; `generateMetadata` title = the variation title. `[variant]/[slug]/page.tsx`: `generateStaticParams` over variants × `blogSlugs`; unknown variant or slug → `notFound()`; title = the post title. Follow `app/access/[[...tab]]/page.tsx` for the async `params` pattern. Both set `export const dynamicParams = false` only if the existing 404 page still renders for unknown paths with it (check in the build); otherwise rely on `notFound()`.
- Panel entries, in order: "Editorial list" `/blog/editorial-list`; "Editorial list: post" `/blog/editorial-list/cold-start-62`; "Magazine grid" …; "Magazine grid: post" …; "Journal with a rail" …; "Journal with a rail: post" ….

- [ ] **Step 1: Write the failing e2e** in `blog.spec.ts` (copy the console-error collection pattern from `smoke.spec.ts`; do not import from it):

```ts
const PAGES = [
  ['/blog/editorial-list', 'Notes from the platform team'],
  ['/blog/editorial-list/cold-start-62', 'How we cut cold-start time for cluster consoles by 62%'],
  ['/blog/magazine-grid', 'Notes from the platform team'],
  ['/blog/magazine-grid/cold-start-62', 'How we cut cold-start time for cluster consoles by 62%'],
  ['/blog/journal-rail', 'Platform journal'],
  ['/blog/journal-rail/cold-start-62', 'How we cut cold-start time for cluster consoles by 62%'],
] as const
for (const [route, h1] of PAGES) {
  test(`${route} renders without console errors`, ...)        // status 200, exactly one h1 with that name, no console errors
  test(`${route} has no horizontal scroll at 375px`, ...)     // viewport 375x800; document.documentElement.scrollWidth === 375
}
test('/blog redirects to the first variation', ...)           // URL ends /blog/editorial-list
test('an unknown post shows the 404 page', ...)               // /blog/editorial-list/nope → status 404, heading "We can't find that page."
test('an unknown variation shows the 404 page', ...)
test('the preview panel lists the blog between pages and status pages', ...) // open panel; section headings in order include Pages, Blog, Status pages, Components; six blog links; clicking 'Magazine grid: post' navigates
```

- [ ] **Step 2: Implement** mock data, demo, routes, panel section.
- [ ] **Step 3: Verify.** Green chain, then `pnpm build`, then Playwright with the scratch config on :3100: `blog.spec.ts` all pass, and the existing `smoke.spec.ts` still passes (report, do not fix, failures in Deployments routes).
- [ ] **Step 4: Look at it.** Screenshot all six pages at 1280 and 375 wide in light and dark (Playwright `page.screenshot` into the scratchpad) and compare with the mockups; fix what is visibly off (spacing, overflow, contrast on Nightfall, sticky rails).
- [ ] **Step 5: Commit** `feat(preview): add the blog example pages` (explicit paths; `preview-panel.tsx` per the shared-file rule).

### Task 11: Behaviour e2e and README

**Files:**

- Modify: `apps/preview/e2e/blog.spec.ts` (append), `README.md` (new "Blog pages" section after "Access page and DataTable", plus the route list / roadmap lines that enumerate pages)

- [ ] **Step 1: Append the e2e tests.**

```ts
for (const variant of ['editorial-list', 'magazine-grid', 'journal-rail']) {
  test(`${variant}: index to post and back`, ...)       // click the 'Console 4.2: schema-aware YAML editing' link → h1 is that title → follow the back/brand link → index h1
  test(`${variant}: topic filter narrows the list`, ...) // choose Releases (button or tab) → exactly 2 articles in main, both Releases titles
}
test('magazine grid paginates', ...)                     // page 2 shows 'Console 4.1: deployments, rewritten' and not 'Console 4.2…'
test('subscribe through the dialog', ...)                // editorial-list: Subscribe → fill ada@example.com → 'Thanks. Check ada@example.com to confirm.'
test('subscribe failure keeps the form', ...)            // fail@example.com → alert 'We could not subscribe that address. Try again.'; field still visible
test('subscribe from the journal rail', ...)             // journal-rail at 1280 wide: form inside the aside → confirmation
for (const variant of ['editorial-list', 'magazine-grid', 'journal-rail']) {
  test(`${variant}: post a comment and a reply`, ...)   // on cold-start-62: heading 'Comments (4)'; fill Name 'Ada', Comment 'Great write-up.' → 'Comment posted.', heading 'Comments (5)', the text visible; Reply on it → 'Thanks!' → heading 'Comments (6)', nested under the first
}
test('a failed comment keeps its text', ...)              // body 'please fail' → alert 'Your comment could not be posted. Try again.'; textarea still holds it
test('a post without comments shows the empty state', ...) // a post with no seed comments → 'No comments yet.' and the form
test('a long unbroken comment does not widen the page at 375px', ...) // post 300 'a' characters at 375 wide → scrollWidth === 375
test('journal post tracks the current section', ...)     // 1280x800: click 'Results' in On this page → URL hash #results, that link has aria-current="location"
test('copy link confirms', ...)                          // grant clipboard permissions on the context; click 'Copy link' → 'Copied'; clipboard text equals page.url()
test('dark theme renders an index and a post', ...)      // emulate colorScheme dark (or set the theme through the panel toggle); h1 visible; body background is dark (luminance < 0.2); no console errors
```

- [ ] **Step 2: Run** build + Playwright on :3100 — all of `blog.spec.ts` passes. Fix product bugs these expose in the owning files (and add a unit test there for each).
- [ ] **Step 3: Write the README section**: the three variations and their titles (table), the content model (`BlogPost`, `BlogBlock` block types), a minimal host example of `BlogIndexPage` and `BlogPostPage` with `linkComponent`, `postHref` and `onSubscribe`, how to write inline code and links in a body (Park `Code` / `Link`), covers (generated presets or `{ src, alt }`), comments (`comments`, `onAddComment`, `BlogComment`, plain-text bodies, one level of replies, the host adds the posted comment), what is not included (search, topic and author pages, RSS, Markdown, comment moderation or sign-in). Match the tone and depth of the "Status pages and console pages" section. Update any list of preview routes and the e2e count if the README states one.
- [ ] **Step 4: Run** the green chain (`format:check` covers the README).
- [ ] **Step 5: Commit** `test(preview): cover blog behaviour end to end` and `docs: document the blog pages` (two commits, explicit paths).
