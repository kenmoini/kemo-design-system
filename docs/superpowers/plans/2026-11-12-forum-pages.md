# Forum pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a community forum as three example variations ("Boards", "Discussions feed", "Q&A desk"), each a front page, a category page, a topic page and a composer, outside the console shell, with a stateful preview demo, a "Forum" panel section, gallery screenshots, a guide and e2e.

**Architecture:** A new family `packages/ui/src/pages/forum/`. Pure helpers (`content.ts`: variation vocabulary, time, counts, order rules, search, grouping) and shared parts (`ForumLayout`, badges and avatars, pager, breadcrumb, live region, query hook, `ReplyComposer`, reactions, vote column, follow and share) carry everything the variations have in common; nine internal variation components (front, category, topic for each) only arrange them; the composer is one shared page. Four public pages switch on `variant`. Post bodies render through the blog's `BlogProse`, which gains a `size` prop. The preview adds `/forum/*` routes over one reducer-backed store with a demo clock, the Deployments pattern.

**Tech Stack:** React 19, Park UI (Ark UI 5.40) on Panda CSS 2.5, react-hook-form + zod 4, lucide-react, Next.js 16 App Router, Vitest + Testing Library, Playwright. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-12-forum-pages-design.md` (read it with the two mockups under `docs/superpowers/specs/assets/2026-11-12-forum-*.html`; the mockups are the reference for proportion, the spec for values and behaviour; the spec's "Our calls" 15–19 override any earlier sentence they touch).

## Global Constraints

- Inside `packages/ui/src/pages/forum/`, styled-system imports are `../../../styled-system/*` (one more `../` inside a variation folder) and Park components `../../components/ui`; never `~/` or bare `styled-system/`. Tokens only; raw colour values only in `theme/tokens/gradients.ts` (none are added). Surfaces: `canvas`, `gray.surface.bg`, hairlines `border`; no `bg.default` / `bg.canvas` / `border.subtle` (they do not exist).
- Synced Park files (`src/components/ui/**` except `password-input.tsx`, `src/theme/recipes/**`, `src/theme/colors/**`, `global-css.ts`, `conditions.ts`) are never hand-edited. Park `Avatar` recipe sizes only (`xs`, `sm`, `md`), never `w`/`h`.
- `'use client'` on files using hooks/effects. Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; lint zero warnings (Panda ESLint plugin: static style props only; variant maps through `cva`, never spread style objects).
- Variation ids and titles, exact: `boards` "Boards", `discussions` "Discussions feed", `qa` "Q&A desk". Primary action labels: "New topic", "New discussion", "Ask a question". Composer headings: "New topic", "New discussion", "Ask a question"; submits: "Post topic", "Start discussion", "Post your question". Reply submits: "Post reply", "Comment", "Post your answer"; reply statuses: "Reply posted.", "Reply posted.", "Answer posted."; comment status "Comment posted.". Follow labels: "Watch"/"Watching", "Subscribe"/"Subscribed ✓", "Follow"/"Following". List nouns: "topics", "discussions", "questions".
- Relative times from the `now` prop only (never `Date.now()`), inside `<time dateTime={iso} title={absolute}>`; absolute is `formatDate(iso)` from `pages/blog/content.ts` ("11 Nov 2026") plus " HH:mm UTC". Counts: thousands with a comma ("3,902"), views past 999 abbreviated ("1.2k").
- Status colours always with a word or glyph: solved/accepted `green.2` bg, `green.11` fg, `green.6` border; "Needs info" `amber`; "Announcement" `blue`; everything else neutral. Nightfall is `bgGradient="auth"` with `className="dark"` + `colorScheme="dark"`, only where the spec lists it.
- Exactly one `h1` per page. Every visible control does something; a control whose callback is absent is not rendered.
- `LinkComponent` is the shared type from `pages/auth/types.ts`; links go through `HostLink` from `pages/blog/host-link.tsx`; the default is a bare `<a>`.
- Validation: topic title 10–120 characters after trimming, body at least 20, tags at most 5 (lower-cased, duplicates dropped); reply 2–5,000; comment 1–600.
- No new dependencies. Cross-folder imports allowed: `pages/blog/{blog-prose,content,host-link,copy-link-button,use-reveal}`, `pages/auth/{types,form-alert}`, `pages/access/forms/form-fields` (`TextField`, `TextareaField`, `SelectField`, `TagsField`, `FormError`, `useFormSubmit`), `widgets` (`EmptyState`).
- **Shared tree.** Another session may commit to `main` concurrently. Stage by explicit path only (never `git add -A` / `git add .`). Shared files this plan edits: `packages/ui/src/index.ts`, `packages/ui/src/pages/blog/blog-prose.tsx`, `packages/ui/src/pages/blog/copy-link-button.tsx`, `apps/preview/src/components/preview-panel.tsx`, `apps/preview/gallery/manifest.ts`, `apps/preview/test/kemo-ui.ts`, `README.md`, `docs/blog-pages.md`. Before editing one, run `git diff -- <file>`; if it carries someone else's uncommitted hunks, commit only ours. e2e goes in a new file `apps/preview/e2e/forum.spec.ts`; do not edit `smoke.spec.ts` or `blog.spec.ts`.
- Green before every commit: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`. If a failure comes from another session's files, report it and prove ours in isolation (`pnpm --filter @kemo/ui exec vitest run src/pages/forum`, `eslint` and `prettier --check` on our paths, `tsc` output filtered to our paths). Preview tasks add `pnpm build` and Playwright on :3100.
- Never stop the owner's `next dev` on :3000. Run build, Playwright and the gallery with the sandbox disabled. e2e uses a scratch Playwright config outside the repo: `testDir` the repo's `apps/preview/e2e`, `baseURL` `http://localhost:3100`, `webServer` `pnpm --filter @kemo/preview exec next start -p 3100`, `reuseExistingServer: false`.
- One commit per task on `main`; do not push.

## Review Focus

1. A topic whose `posts` is `[]` or missing: the header renders, the list reads "No replies yet." ("No answers yet." in Q&A), the composer is there, nothing throws (Tasks 6, 8, 10 each test it).
2. A post whose `parentId` names no post in the thread: it is shown as a top-level reply, never dropped (Task 1 `groupReplies`; Task 8 renders it).
3. A reply body of `<img src=x onerror=alert(1)>` or one 300-character unbroken token: visible text only, and the page does not widen at 375px (Task 4 unit test; Task 13 e2e width check after posting).
4. `now` earlier than a post's time (clock skew): the label is "just now", never "in 3 min" or a negative (Task 1 `relativeTime`).
5. A query of only spaces: treated as empty, the normal page shows, no results view, no "0 results" (Task 3 `useQuery`; Task 5 page test).
6. `topics: []` on a front or category page: stats read 0, every list shows `EmptyState`, the Q&A ratio reads "0 of 0 questions", nothing divides by zero (Tasks 5, 7, 9).

---

### Task 1: Content model and helpers

**Files:**

- Create: `packages/ui/src/pages/forum/{types.ts,content.ts,index.ts}`
- Modify: `packages/ui/src/index.ts` (add `export * from './pages/forum'` after the blog line)
- Test: `packages/ui/src/pages/forum/content.test.ts`

**Interfaces:**

- Produces (`types.ts`): `ForumVariant`, `ForumUser`, `ForumCategory`, `ForumTag`, `ForumBlock`, `ForumReaction`, `ForumPost`, `ForumTopic`, `ForumChromeProps` (exported), `ForumIndexPageProps`, `ForumCategoryPageProps`, `ForumTopicPageProps`, `ForumComposerPageProps`, exactly as the spec's API block (after its "Our calls" 15–19: no `ForumComment`, no `onAddComment`; `ForumCategory.solvedCount: number`). Also `ReactionEmoji = ForumReaction['emoji']`, `VoteDirection = 'up' | 'down' | null`, `ListFilter = 'latest' | 'top' | 'unanswered' | 'solved' | 'newest' | 'votes'`.
- Produces (`content.ts`), all pure, none mutate their input:
  - `forumVariants: Record<ForumVariant, { title: string; description: string }>` — titles from Global Constraints; one-sentence descriptions from the spec's intent table.
  - `vocabulary: Record<ForumVariant, { noun: 'topics' | 'discussions' | 'questions'; primary: string; searchPlaceholder: string; composerHeading: string; composerSubmit: string; titleLabel: 'Title' | 'Question'; replyPlaceholder: string; replySubmit: string; replyPosted: string; followOff: string; followOn: string; sectionLabel: string }>` — every string from Global Constraints and the spec ("Search topics", "Search discussions", "" for qa; placeholders from "Reply composer"; `sectionLabel` "Boards" / "Discussions" / "Questions" for breadcrumbs).
  - `REACTION_EMOJI: readonly ReactionEmoji[]` = `['👍', '🎉', '❤️', '👀', '🚀']`.
  - `relativeTime(iso: string, now: string): string` — bands: `< 60 s` "just now"; `< 60 min` "{n} min ago"; `< 24 h` "{n} h ago"; `< 48 h` "yesterday"; `< 30 days` "{n} days ago"; else `formatDate(iso)`. A future `iso` is "just now".
  - `absoluteTime(iso: string): string` — "11 Nov 2026, 14:02 UTC".
  - `joinedLabel(iso: string): string` — "Joined Mar 2026" (`en-GB` short month, UTC).
  - `formatCount(n: number): string` — "3,902"; `abbreviate(n: number): string` — below 1,000 as `formatCount`, else one decimal with a trailing `.0` dropped: "1.2k", "12k".
  - `isSolved(topic: ForumTopic): boolean`; `acceptedPost(topic): ForumPost | undefined`.
  - `replyCountOf(topic): number` — `posts.length - 1` when `posts`, else `replyCount`; `reactionTotalOf(topic): number`; `scoreOf(topic): number` (`votes?.score ?? 0`); `answerCountOf(topic): number` — top-level posts after the first when `posts`, else `replyCount`; `participantsOf(topic): ForumUser[]` — distinct by `id` in first appearance across `[author, ...posts' authors]`, else `participants ?? [author]`.
  - `groupReplies(posts: ForumPost[]): { original?: ForumPost; replies: { post: ForumPost; children: ForumPost[] }[] }` — top-level in `posts` order; a `parentId` that names no top-level post (or names the original) makes the post top-level; children in `posts` order.
  - `sortTopics(topics: ForumTopic[], filter: ListFilter, variant: ForumVariant): ForumTopic[]` — `latest`: pinned first, then `lastActivityAt` desc; `top`: `scoreOf` desc then activity; `unanswered`: `replyCountOf === 0` (boards, discussions) or `!isSolved` (qa), then latest order; `solved`: `isSolved`, latest order; `newest`: pinned first, `createdAt` desc; `votes`: `scoreOf` desc then `createdAt` desc. Ties everywhere by `slug` asc.
  - `searchTopics(topics, categories, query): ForumTopic[]` — `query.trim().toLowerCase().split(/\s+/)`; every word must occur in `title + ' ' + excerpt + ' ' + tags.join(' ') + ' ' + category label`; result in `latest` order; empty query returns `[]`.
  - `trendingTopics(topics, now, count = 5)`: activity within 7 days, `scoreOf` desc then activity desc.
  - `needsAnswer(topics, count = 5)`: `!isSolved`, `createdAt` desc.
  - `weekStats(topics, now): { topics: number; replies: number; solved: number }` — topics created within 7 days; replies = posts after the first with `postedAt` within 7 days, over topics that carry `posts`; solved = topics whose accepted post is within 7 days.
  - `topContributors(topics, count = 4): { user: ForumUser; count: number }[]` — count = topic authorship + posts across loaded data, desc then name asc.
  - `relatedTopics(topic, candidates, count): ForumTopic[]` — never `topic`; same category first; within that, shared-tag count desc, then activity desc.
  - `cardCategories(categories): ForumCategory[]` — the four with the highest `topicCount` (ties by input order), in input order; `restCategories(categories)` — the others, in input order.
  - `answeredRatio(categories): { solved: number; total: number; percent: number }` — sums; `percent` 0 when total is 0, else rounded; `openCount(categories): number` — Σ `max(0, topicCount - solvedCount)`.
  - `categoryAccent(category): 1 | 2 | 3 | 4 | 5 | 6` — `accent` if set, else the blog's hash over `id`.
  - `hotTags(topics, count = 5): string[]` — frequency desc, then alpha.
  - `paragraphsOf(text: string): ForumBlock[]` — split on blank lines, trim, drop empties, each `{ type: 'paragraph', content }`.
  - `firstParagraphText(post: ForumPost): string` — first paragraph block whose content is a string, else `''`.
  - `pageOf<T>(items: T[], page: number, pageSize: number): T[]`.

- [ ] **Step 1: Write the failing tests** in `content.test.ts` — one `describe` per helper with the spec's values: `relativeTime` at 30 s, 14 min, 2 h, 30 h, 3 days, 31 days (→ "11 Nov 2026" for a date in November) and a future time ("just now"); `abbreviate(999) === '999'`, `abbreviate(1234) === '1.2k'`, `abbreviate(12000) === '12k'`; `groupReplies` nests by `parentId`, orphans become top-level, a `parentId` equal to the original's id is top-level; `sortTopics` for each filter with pinned first on `latest` and `newest` only; `searchTopics` matches all words across fields, is case-insensitive, returns `[]` for `'   '`; `weekStats` with one topic solved 8 days ago (not counted); `cardCategories` with the spec's eight counts picks Kemo Console, Deployments & GitOps, Access & SSO, Getting started; `answeredRatio` of `[]` is `{ solved: 0, total: 0, percent: 0 }`; `paragraphsOf('a\n\n\nb\n')` is two paragraphs; `relatedTopics` ranks shared tags above recency within the category.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/content.test.ts` — Expected: FAIL (module not found).
- [ ] **Step 3: Implement** `types.ts`, `content.ts`, `index.ts` (export the helpers named in Interfaces plus `forumVariants`, `vocabulary`, `REACTION_EMOJI`, and the types) and the line in `packages/ui/src/index.ts`. `content.ts` imports `formatDate` from `../blog/content` and the hash from the blog (`coverPreset` is post-specific; copy its five-line hash into `hashOf(text)` here).
- [ ] **Step 4: Run** the same command — Expected: PASS. Then `pnpm --filter @kemo/ui typecheck`.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum packages/ui/src/index.ts && git commit -m "feat(ui): forum content model and helpers"`

### Task 2: `BlogProse` size, post body and the shared parts

**Files:**

- Modify: `packages/ui/src/pages/blog/blog-prose.tsx` (add `size?: 'md' | 'sm'`), `packages/ui/src/pages/blog/blog-prose.test.tsx` (one test)
- Create: `packages/ui/src/pages/forum/{post-body.tsx,parts.tsx,pager.tsx,crumbs.tsx}`
- Test: `packages/ui/src/pages/forum/parts.test.tsx`, `packages/ui/src/pages/forum/pager.test.tsx`

**Interfaces:**

- Consumes: Task 1 helpers and types.
- Produces:
  - `BlogProse({ blocks, size = 'md' })` — `sm`: `textStyle="sm"`, `lineHeight="1.6"`, `gap="3"`; `md` unchanged. A `cva` variant map, not a conditional style object.
  - `PostBody({ blocks }: { blocks: ForumBlock[] })` — `BlogProse` at `sm` inside a `Box` with `maxW="40rem"`.
  - `parts.tsx`: `UserAvatar({ user, size }: { user: ForumUser; size: 'xs' | 'sm' | 'md' })` (Park `Avatar` with `name` and `src`, initials fallback); `StaffBadge()` ("Staff", solid); `AuthorBadge()` ("Author", subtle); `StatusBadge({ topic })` — "Solved" (green) when `isSolved`, "Needs info" (amber) for `status`, "Announcement" (blue) for `kind === 'announcement'`, "Pinned" (subtle, `PinIcon`) when `pinned`; renders each that applies, in that order; `CategoryBadge({ category, href?, linkComponent? })`; `TagBadge({ tag, href?, linkComponent? })`; `RelativeTime({ iso, now, prefix? })` (`<time dateTime title>`); `CategoryTile({ category })` — 1.75rem `l2` square with `bgGradient={`cover${accent}`}` (a `cva` over the six) and the first letter, `aria-hidden`; `AccentSquare({ category })` — 0.4375rem; `Count({ value, abbreviate? })` — tabular numerals.
  - `pager.tsx`: `usePager(total: number, pageSize: number, resetKey: unknown): { page: number; setPage: (p: number) => void; pageCount: number; range: { from: number; to: number } }` (resets to 1 when `resetKey` changes, the `useReveal` technique); `Pager({ page, pageSize, total, onPageChange, label }: …)` — Park `Pagination` with `aria-label={label}`; renders nothing when `total <= pageSize`.
  - `crumbs.tsx`: `Crumbs({ items, linkComponent }: { items: { label: string; href?: string }[]; linkComponent?: LinkComponent })` — Park `Breadcrumb`, `aria-label="Breadcrumb"`; the last item is text with `aria-current="page"`.

- [ ] **Step 1: Write the failing tests**: `blog-prose.test.tsx` adds `it('renders at sm without changing md')` (a `sm` render has class text sm; a default render is unchanged by snapshot of class names on the stack); `parts.test.tsx`: `StatusBadge` shows "Solved" for an accepted post and nothing for a plain topic, "Needs info" and "Pinned" together; `RelativeTime` renders `dateTime` and `title`; `CategoryTile` is `aria-hidden` and shows "K" for "Kemo Console"; `pager.test.tsx`: `usePager` resets on key change, `Pager` is absent at `total: 10, pageSize: 10` and present at 11, clicking "2" calls `onPageChange(2)`.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum src/pages/blog/blog-prose.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the files above. `Pager` follows the Magazine grid's `Pagination` usage in `pages/blog/magazine-grid/index-page.tsx`.
- [ ] **Step 4: Run** the command and `pnpm --filter @kemo/ui exec vitest run src/pages/blog` — Expected: PASS, the blog's suite unchanged.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum packages/ui/src/pages/blog/blog-prose.tsx packages/ui/src/pages/blog/blog-prose.test.tsx && git commit -m "feat(ui): forum shared parts, pager and breadcrumb; BlogProse size"`

### Task 3: `ForumLayout`, search state and the list status

**Files:**

- Create: `packages/ui/src/pages/forum/{forum-layout.tsx,use-query.ts,list-status.tsx,search-results.tsx}`
- Test: `packages/ui/src/pages/forum/forum-layout.test.tsx`, `packages/ui/src/pages/forum/use-query.test.tsx`

**Interfaces:**

- Consumes: `vocabulary` (Task 1), `HostLink`.
- Produces:
  - `SearchBinding = { value: string; onChange: (value: string) => void; onSubmit: () => void; inputRef?: RefObject<HTMLInputElement | null> }`; `SearchField({ variant, binding, size = 'sm', label }: { variant: ForumVariant; binding: SearchBinding; size?: 'sm' | 'lg'; label?: string })` — a `form` with `role="search"`, a Park `Input` whose placeholder is `vocabulary[variant].searchPlaceholder` (or `label`) and whose accessible name is the same text; Enter calls `onSubmit`; at `lg` a solid "Search" button follows the input (the Q&A hero).
  - `ForumLayoutProps = Pick<ForumChromeProps, 'variant' | 'logo' | 'brand' | 'section' | 'nav' | 'footer' | 'year' | 'linkComponent' | 'indexHref' | 'signInHref' | 'composerHref' | 'searchHref'> & { search?: SearchBinding; composerCategory?: ForumCategory; children: ReactNode }`; `ForumLayout(props)`. Anatomy per the spec's "Top bar" and "Footer": `header` / `main` / `footer`; brand link to `indexHref`; `nav` with `aria-label="Forum"`, hidden below `md`; the bar's `SearchField` is **bound** when `search` is given, otherwise **navigating** when `searchHref` is given (its own state; submit → `window.location.assign(searchHref(value))`), otherwise absent; never rendered for `qa`; hidden below `md` (pages that have results render their own `SearchField` below `md`, see Tasks 5 and 7). "Sign in" (`Button variant="outline" size="sm"` as a link) when `signInHref`. The primary action: solid `sm` link to `composerHref(composerCategory)` labelled `vocabulary[variant].primary`. Footer as `BlogLayout`'s (`year` optional, `suppressHydrationWarning`).
  - `useQuery(opts: { query?: string; defaultQuery?: string; onQueryChange?: (q: string) => void }): { input: string; setInput: (v: string) => void; query: string; commit: () => void; clear: () => void }` — controlled exactly when `'query' in opts`; `setInput` updates `input` at once and commits after 300 ms (`setTimeout`, cleared on the next change and on unmount); `commit` commits now; the committed `query` is `input.trim()`; `clear` sets both to `''` and calls `onQueryChange('')`.
  - `ListStatus({ count, noun }: { count: number; noun: 'topics' | 'discussions' | 'questions' | 'results' })` — `srOnly` `role="status" aria-live="polite"`: "{formatCount(count)} {noun}" ("1 topic" singular), "No {noun} yet" at 0 ("No results" for `results`).
  - `SearchResults({ query, count, noun, onClear, children }: { query: string; count: number; noun: 'topics' | 'discussions' | 'questions'; onClear: () => void; children: ReactNode })` — `h2` "{n} results for “{query}”" ("1 result"), an outline `sm` "Clear" button calling `onClear`, a `ListStatus` with `noun: 'results'`, then `children`; at `count === 0` renders `EmptyState` with message "No {noun} match “{query}”" and action "Clear". The page's `onClear` clears the query and focuses its field through `inputRef`.

- [ ] **Step 1: Write the failing tests**: layout — brand links to `indexHref`; `nav` marks `current` with `aria-current="page"`; Sign in appears only with `signInHref`; the primary action text per variant and its href from `composerHref`; the search input placeholder per variant and none for `qa`; bound mode calls `onChange` on typing and `onSubmit` on Enter; navigating mode calls `window.location.assign` with `searchHref('crd')` (replace `window.location` with `{ assign: vi.fn() }` via `Object.defineProperty` in the test); no field without `search` or `searchHref`; footer "© 2031 Kemo" with `year`. `SearchField` at `lg` shows the "Search" button. `use-query` — uncontrolled: `setInput('cr')` leaves `query` `''` until 300 ms pass (`vi.useFakeTimers`); `commit` is immediate; `'   '` commits to `''`; controlled: `query` follows the prop and `onQueryChange` fires. `SearchResults` at 0 shows the `EmptyState` with "No topics match “zz”" and its "Clear" calls `onClear`.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum` — Expected: FAIL.
- [ ] **Step 3: Implement** the files (`SearchField` lives in `forum-layout.tsx` or its own `search-field.tsx`, builder's choice).
- [ ] **Step 4: Run** again — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): ForumLayout, query state and list status"`

### Task 4: Reply composer, reactions, votes, follow and share

**Files:**

- Create: `packages/ui/src/pages/forum/{reply-composer.tsx,reactions.tsx,vote-column.tsx,follow-button.tsx,share-button.tsx}`
- Modify: `packages/ui/src/pages/blog/copy-link-button.tsx` (add `href?: string`: copies `new URL(href, window.location.href).toString()` when given), `packages/ui/src/pages/blog/copy-link-button.test.tsx` (one test)
- Test: `packages/ui/src/pages/forum/{reply-composer.test.tsx,reactions.test.tsx,vote-column.test.tsx,follow-button.test.tsx}`

**Interfaces:**

- Consumes: `vocabulary`, `REACTION_EMOJI`, `paragraphsOf` (Task 1); `FormAlert`; `UserAvatar`.
- Produces:
  - `ReplyComposer` (exported from the package), `forwardRef<HTMLTextAreaElement | HTMLInputElement>`; props `{ variant: ForumVariant; kind?: 'reply' | 'comment' (default reply); onSubmit: (body: string) => Promise<void>; quote?: { author: ForumUser; excerpt: string } | null; onRemoveQuote?: () => void; onCancel?: () => void; idPrefix: string; autoFocus?: boolean; viewer?: ForumUser; heading?: ReactNode }`. Reply kind: `Textarea rows={4}` with `vocabulary.replyPlaceholder`, hint "Plain text. Be kind." left of the footer, submit `vocabulary.replySubmit`, zod `min(2)` / `max(5000)` after trim with messages "Write at least 2 characters." / "Keep it under 5,000 characters."; status `vocabulary.replyPosted`. Comment kind: a one-line `Input` labelled "Comment", `max(600)` ("Keep it under 600 characters."), submit "Post", status "Comment posted.", always with Cancel. The quote block: "{author.name} wrote" in medium weight, the excerpt behind a left `border` rule, a "Remove quote" `xs` button. Success clears the field and keeps a polite `role="status"`; rejection shows `FormAlert` with the message or "Your reply could not be posted. Try again." and keeps the text. The `CommentForm` in `pages/blog/comment-form.tsx` is the model.
  - `ReactionPills({ reactions, onReact }: { reactions?: ForumReaction[]; onReact?: (emoji: ReactionEmoji) => Promise<void> })` — a pill per reaction with `count > 0`: `Button variant="outline" size="xs"` rounded full, text "{emoji} {count}", `aria-pressed={reacted}`, accessible name "{emoji} {count}, react" ; with `onReact`, a trailing "+" pill (`aria-label="Add reaction"`) opening a Park `Menu` of the five emoji (`Menu.Item value={emoji}`), selection calls `onReact`. Without `onReact`, pills are `span`s.
  - `VoteColumn({ score, viewer, onVote, accepted, onAccept, acceptName }: { score: number; viewer?: 'up' | 'down'; onVote?: (d: VoteDirection) => Promise<void>; accepted?: boolean; onAccept?: () => Promise<void>; acceptName?: string })` — up/down `IconButton`s (`ChevronUpIcon`/`ChevronDownIcon`, `aria-label` "Upvote, score {n}" / "Downvote", `aria-pressed`); a press on the active direction sends `null`; the score with tabular numerals; a check below: a filled green circle `role="img" aria-label="Accepted answer"` when `accepted` and no `onAccept`; with `onAccept`, a button named `acceptName ?? 'Accept this answer'` ("Accepted answer" when accepted, `aria-pressed`).
  - `FollowButton({ following, onFollow, labels }: { following?: boolean; onFollow?: (next: boolean) => Promise<void>; labels: { off: string; on: string } })` — outline `sm`, `aria-pressed`, loading while pending; `null` without `onFollow`.
  - `ShareButton({ href, label = 'Share' }: { href?: string; label?: string })` — `CopyLinkButton` with `label` and, when given, `href` (post links are `#post-{id}`; without `href` it copies the page address).

- [ ] **Step 1: Write the failing tests**: composer — placeholder and submit per variant; too short / too long messages; pending disables the button; success clears the field and announces `replyPosted`; rejection keeps the text and shows the message; the comment kind shows "Post" and "Cancel" and enforces 600; `quote` renders the author and excerpt and "Remove quote" calls `onRemoveQuote`; a submitted body of `<img src=x onerror=alert(1)>` is passed as text (callback receives the string; nothing rendered as an element after a mock re-render). reactions — only non-zero pills, `aria-pressed`, "+" opens the five and selecting "🎉" calls `onReact('🎉')`, spans without `onReact`. vote — names, `aria-pressed`, pressing the active direction sends `null`, accept button names. follow — label switch and `aria-pressed`. copy-link — with `href` `#post-p4` copies the absolute URL.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum src/pages/blog/copy-link-button.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the files; add `ReplyComposer` (and `ReplyComposerProps`) to `index.ts`.
- [ ] **Step 4: Run** again — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum packages/ui/src/pages/blog/copy-link-button.tsx packages/ui/src/pages/blog/copy-link-button.test.tsx && git commit -m "feat(ui): forum reply composer, reactions, votes, follow and share"`

### Task 5: "Boards" front and category pages

**Files:**

- Create: `packages/ui/src/pages/forum/boards/{index-page.tsx,category-page.tsx,topic-row.tsx}`, `packages/ui/src/pages/forum/test-data.ts`
- Test: `packages/ui/src/pages/forum/boards/index-page.test.tsx`, `packages/ui/src/pages/forum/boards/category-page.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–3.
- Produces:
  - `test-data.ts`: `testUsers` (priya staff, jonas, dan, mei, tomas), `testCategories` (the spec's eight with its counts and `solvedCount` so the overall ratio is 1,146 of 1,248), `testTopics` (fourteen: twelve in `kemo-console`, one pinned Announcements, one Q&A unsolved; the sample thread `schema-browser-crd` with the thirteen posts described in the spec's "Mock content", `parentId`s set as there), `TEST_NOW = '2026-11-12T15:00:00Z'`, `chrome` (a `ForumChromeProps` minus `variant` with `brand: 'Kemo'`, `now: TEST_NOW`, `indexHref: '/forum/boards'`, `categoryHref`/`topicHref`/`composerHref`/`searchHref` as template strings).
  - `BoardsIndex(props: ForumIndexPageProps)`; `BoardsCategory(props: ForumCategoryPageProps)`; `BoardsTopicRow({ topic, category, href, linkComponent, now })` — the row the category page, the search results and Task 11's lists share: `avatar | title link, StatusBadge, TagBadges, excerpt (one line, `lineClamp: 1`) | replies | views | last activity (avatar, author · RelativeTime)`; below `md` the counts fold into the meta line.
  - Front page per spec "Front page / Boards": `h1` = `title`; stats from Σ `topicCount`, Σ `postCount`, `memberCount ?? 0`; sections by `section` in first-appearance order, each a `section` labelled by its name over a `ul` of board rows (`CategoryTile`, name link via `categoryHref`, description, counts, latest = the topic with the newest `lastActivityAt` in that category, or "No topics yet"); "Latest" `h2` with three outlined cards (`StatusBadge`, title link, author · replies). The top bar's search is **bound** to `useQuery` (`ForumLayout.search`), and the same binding renders a `SearchField` above the sections below `md` only (`display={{ base: 'block', md: 'none' }}`); with a non-empty `query` the body is `SearchResults` over `searchTopics` in `BoardsTopicRow`s; "Clear" empties and focuses the input through `inputRef`.
  - Category page per spec "Category page / Boards": `Crumbs` [Boards (indexHref), label]; header with `CategoryTile`, `h1`, description, counts; filter chips "All" / "Unanswered" / "Solved" (`Button` toggles with `aria-pressed`, selected solid); count "{n} topics"; rows in `sortTopics(…, 'latest' | 'unanswered' | 'solved', 'boards')` limited to `categoryId`; `usePager(total, 10, filter)` + `Pager` (`label="Topics"`); `ListStatus`; `EmptyState` "No topics yet." with the primary action label when empty; search bound as on the front page.

- [ ] **Step 1: Write the failing tests**: index — one `h1` "Kemo Community"; stats "1,248" / "9,310" / "412"; two section headings "Product", "Community"; each category once, linking to `categoryHref`; the latest title in the Kemo Console row; typing "crd" then pressing Enter shows "{n} results for “crd”" with the sample thread and the status "{n} results"; typing spaces shows the normal page; "Clear" restores it and focuses the input; `topics: []` renders the sections with "No topics yet" per row and no Latest cards, nothing throws. category — breadcrumb with `aria-current`; `h1` "Kemo Console"; 10 rows then a pager with "2"; clicking "2" shows the rest; "Solved" chip filters and resets to page 1; pinned first under "All"; `topics: []` shows `EmptyState`.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/boards` — Expected: FAIL.
- [ ] **Step 3: Implement** the three files and `test-data.ts`.
- [ ] **Step 4: Run** again, then the whole `src/pages/forum` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): Boards front and category pages"`

### Task 6: "Boards" topic page

**Files:**

- Create: `packages/ui/src/pages/forum/boards/{topic-page.tsx,post.tsx}`
- Test: `packages/ui/src/pages/forum/boards/topic-page.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–5.
- Produces: `BoardsTopic(props: ForumTopicPageProps)`; `BoardsPost({ post, index, topic, now, viewer, onReact, onQuote, onReply, href })` per spec "Topic page / Boards": author column (`UserAvatar md`, name, `StaffBadge` or "Member", `joinedLabel`, "{n} posts"), body column with "#{index}" (+ "· original post" on the first), `RelativeTime`, the optional quote block, `PostBody`, actions: a 👍 count button (`ReactionPills` with only 👍 shown; Boards shows one emoji), "Quote", "Reply", `ShareButton href="#post-{id}"`; `id="post-{id}"`; accepted post tinted green with "✓ Accepted answer · marked by {topic.author.name}". The page: `Crumbs` [Boards, category, title]; `h1`; meta (`StatusBadge`, `CategoryBadge`, `TagBadge`s, "· {replies} replies · {abbreviate(views)} views · started {RelativeTime} by {author}"); tools `FollowButton` (Watch/Watching), `ShareButton`, solid "Reply" (focuses the composer via its ref); post bar "Posts {from}–{to} of {total}" + `Pager` (10, `label="Posts"`) above and below; posts in `posts` order, numbered from 1; `ReplyComposer` (`idPrefix="reply"`) with the quote state (`quote` + `quoteOf` passed to `onReply`); without `onReply`, no composer, no Quote/Reply, and "Sign in to reply." with a link when `signInHref`; `posts` empty → "No replies yet.".

- [ ] **Step 1: Write the failing tests**: one `h1`; thirteen posts across two pages ("Posts 1–10 of 13"), page 2 holds three; "#1 · original post"; the accepted post has the label and keeps position #4; Quote on #2 attaches "Dan Okafor wrote" and the first paragraph, submitting calls `onReply({ body, quoteOf: 'p2' })`; "Reply" focuses the textarea; a post whose `quote` is set renders it; Watch toggles to Watching; without `onReply` the composer is absent and "Sign in to reply." links to `signInHref`; `posts: []` renders "No replies yet." and the composer.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/boards/topic-page.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the two files.
- [ ] **Step 4: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): Boards topic page"`

### Task 7: "Discussions feed" front and category pages

**Files:**

- Create: `packages/ui/src/pages/forum/discussions/{feed-page.tsx,feed-row.tsx,rail.tsx,index-page.tsx,category-page.tsx}`
- Test: `packages/ui/src/pages/forum/discussions/feed-page.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–4.
- Produces: `DiscussionsFeed({ mode: 'index' | 'category', … })` used by `DiscussionsIndex(props: ForumIndexPageProps)` and `DiscussionsCategory(props: ForumCategoryPageProps)`; `FeedRow({ topic, category, href, linkComponent, now })` (`UserAvatar sm` | title link, excerpt `lineClamp: 2`, meta `CategoryBadge` + `StatusBadge` + author · `RelativeTime` | counts column "{n} replies" and "👍 {reactionTotalOf}"); `DiscussionsRail({ categories, current?, composerHref, weekStats, contributors, linkComponent, categoryHref })` with `id="categories"` on its Categories list. Per spec "Front page / Discussions feed" and "Category page / Discussions feed": visually hidden `h1` on the index (`title`), visible `h1` (category label) and description on the category page; chips Latest / Top / Unanswered / Solved (`aria-pressed`), count "{n} discussions" / "{n} unanswered"; pinned topic first under Latest on `gray.surface.bg` (on the category page only when it belongs to it); `useReveal(total, 8, filter)` with "Load more"; `ListStatus`; search bound (the bar's field, plus a `SearchField` above the chips below `md` only), results in `FeedRow`s; rail blocks in the spec's order ("Start a discussion" Nightfall block first below `lg`, the rest after the feed).

- [ ] **Step 1: Write the failing tests**: index — exactly one `h1` and it is not visible (`srOnly`); the pinned topic first with "Pinned" and only under Latest; "Unanswered" shows the count "{n} unanswered" and only zero-reply topics; 8 rows then "Load more" reveals the rest; rail lists every category with its count and "All"; "This week" numbers equal `weekStats(testTopics, TEST_NOW)`; "Top contributors" lists four; a staff member shows "Staff" not a count; search "oidc" shows results and Clear restores. category — `h1` "Kemo Console", rows limited to the category, the current rail entry marked (`aria-current="page"`), pinned Announcements topic absent; `topics: []` → `EmptyState` and "This week" zeros.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/discussions` — Expected: FAIL.
- [ ] **Step 3: Implement** the five files.
- [ ] **Step 4: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): Discussions feed front and category pages"`

### Task 8: "Discussions feed" topic page

**Files:**

- Create: `packages/ui/src/pages/forum/discussions/{topic-page.tsx,reply.tsx}`
- Test: `packages/ui/src/pages/forum/discussions/topic-page.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–4, 7.
- Produces: `DiscussionsTopic(props: ForumTopicPageProps)`; `DiscussionReply({ post, children, topic, now, viewer, onReact, onReply, nested })`. Per spec "Topic page / Discussions feed": `Crumbs` [Discussions, category]; `h1`; meta; the original post card (`UserAvatar md`, name, `StaffBadge`, `RelativeTime`, "· edited" when `editedAt`, `PostBody`, `ReactionPills`); replies bar "{n} replies" `h2` + sort "Oldest" / "Top" (`Button` toggles, `aria-pressed`; Top = reaction total desc then time); the accepted reply first regardless of sort in a green outlined card labelled "✓ Answer · marked by {topic.author.name}"; top-level replies as `ul > li > article`, each with `AuthorBadge` when `post.author.id === topic.author.id`, `ReactionPills`, "Reply" opening an inline `ReplyComposer` (`kind="reply"`, `idPrefix` per post, `autoFocus`, Cancel) that submits with `parentId` = the top-level post's id; nested replies (`groupReplies`) as a nested `ul` behind a left rule with `UserAvatar xs`; the end composer with the viewer's avatar beside it; rail: Category, Labels, Participants (`UserAvatar sm` row, up to 8 then "+n", label "Participants · {n}"), Notifications (`FollowButton` Subscribe/Subscribed ✓), Related (`relatedTopics(topic, related, 3)`); `posts` empty → "No replies yet."; without `onReply`: no composer, no "Reply" buttons, and "Sign in to reply." with a link when `signInHref` (as Task 6).

- [ ] **Step 1: Write the failing tests**: one `h1`; without `onReply` the composer and Reply buttons are absent and "Sign in to reply." links to `signInHref`; the original post is not in the replies list; "12 replies"; the accepted reply is first and labelled, and carries Jonas and Mei nested; Dan's reply carries Jonas nested; an orphan `parentId` renders top-level; "Top" reorders by reactions; inline Reply under Dan submits `{ body, parentId: 'p2' }` and Cancel closes it; only one inline composer at a time; reacting "🎉" on the original post calls `onReact('p1', '🎉')`; Participants shows 6; Related shows up to three same-category topics, never itself; `posts: []` renders "No replies yet.".
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/discussions/topic-page.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the two files.
- [ ] **Step 4: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): Discussions topic page"`

### Task 9: "Q&A desk" front and category pages

**Files:**

- Create: `packages/ui/src/pages/forum/qa/{index-page.tsx,category-page.tsx,question-cell.tsx}`
- Test: `packages/ui/src/pages/forum/qa/index-page.test.tsx`, `packages/ui/src/pages/forum/qa/category-page.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–4.
- Produces: `QaIndex(props: ForumIndexPageProps)`; `QaCategory(props: ForumCategoryPageProps)`; `QuestionCell({ topic, category, href, linkComponent, now, trailing: 'time' | 'votes' })` — the 2.75rem answer-count cell (`answerCountOf`; green with a check `aria-label="Accepted answer"` when solved; dashed at 0; text "{n} answers" / "1 answer") beside title link, `CategoryBadge`, `TagBadge`s, `StatusBadge`, author · `RelativeTime` or "{score} votes". Per spec "Front page / Q&A desk": hero (`bgGradient="auth"`, dark): `h1` "Ask the community", ratio sentence from `answeredRatio(categories)` ("{solved} of {total} questions have an accepted answer. Search first, then ask."), the search form (`SearchField size="lg"` labelled "Search questions", with its solid "Search" button) **bound** to `useQuery` (this variation has no bar search), "Popular:" chips = `hotTags(topics)` setting the query; category cards for `cardCategories` with "{n} questions · {p}% answered" and a bar (`role="progressbar"` with `aria-valuenow`); "Also:" `CategoryBadge` links for `restCategories`; "Needs an answer" (`needsAnswer(topics)`, header "{openCount(categories)} open") and "Trending this week" (`trendingTopics`); search results in `QuestionCell`s. Category page: `Crumbs` [Questions, label]; `h1`; description; "{solved} of {n} questions have an accepted answer"; chips Newest / Unanswered / Votes; `usePager(…, 10, filter)` + `Pager`; `ListStatus` with "questions"; `EmptyState` "No questions yet.".

- [ ] **Step 1: Write the failing tests**: index — one `h1`; the ratio sentence "1,146 of 1,248 questions have an accepted answer."; four cards (Kemo Console, Deployments & GitOps, Access & SSO, Getting started) and "Also:" with the other four; the progressbar of Kemo Console has `aria-valuenow` from its counts; "Needs an answer" shows only unsolved and "{open} open"; clicking the "crd" popular chip shows results; `categories: []` and `topics: []` → "0 of 0 questions", no cards, `EmptyState`s, nothing throws. category — `h1`, "Unanswered" filters, "Votes" orders by score, pager at 10, pinned first under Newest.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/qa` — Expected: FAIL.
- [ ] **Step 3: Implement** the three files.
- [ ] **Step 4: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): Q&A desk front and category pages"`

### Task 10: "Q&A desk" topic page

**Files:**

- Create: `packages/ui/src/pages/forum/qa/{topic-page.tsx,answer.tsx}`
- Test: `packages/ui/src/pages/forum/qa/topic-page.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–4, 9.
- Produces: `QaTopic(props: ForumTopicPageProps)`; `QaAnswer({ post, comments, topic, now, viewer, role: 'question' | 'answer', onVote, onAccept, onReply, acceptable })` — `VoteColumn` (score from `post.votes`, or `topic.votes` for the question; `onVote(post.id, d)`; `accepted`; `onAccept` only when `acceptable`), `PostBody`, `TagBadge`s (question only), actions (`ShareButton`, `FollowButton` Follow/Following on the question only), the author card ("asked"/"answered {RelativeTime}", `UserAvatar sm`, name, `StaffBadge` or "{reputation} rep"), comments = `children` posts (from `groupReplies`) as hairline rows "{name} {firstParagraphText} · {RelativeTime}", and "Add a comment" → `ReplyComposer kind="comment"` submitting `{ body, parentId: post.id }`; `id="post-{id}"`. The page: `Crumbs` [Questions, category]; `h1`; meta "Asked {t}", "Modified {lastActivityAt}", "Viewed {abbreviate}", `StatusBadge`; the question; answers bar "{n} answers" `h2` + segment Votes / Oldest / Newest (`Button` toggles, `aria-pressed`); the accepted answer first in a green outlined box "✓ Accepted answer"; `acceptable` = `onAcceptAnswer` given; "Your answer" `h2` over `ReplyComposer`; rail: Related questions (`relatedTopics(…, 4)` in `QuestionCell` style, `trailing: 'votes'`), Linked docs (`docs`, omitted when empty), Hot tags (`hotTags([topic, ...related])` as `TagBadge` links through `searchHref`, omitted without it); `posts` empty → "No answers yet."; without `onReply`: no "Your answer" composer, no "Add a comment", and "Sign in to answer." with a link when `signInHref` (the Q&A wording of Task 6's line).

- [ ] **Step 1: Write the failing tests**: one `h1`; without `onReply` the composer and "Add a comment" are absent and "Sign in to answer." links to `signInHref`; "Asked", "Modified", "Viewed 1.2k"; the question's vote column shows the topic score; "3 answers" (top-level posts after the original in the sample: Dan, Priya, Tomas plus the six short ones → assert the computed number); the accepted answer first with "✓ Accepted answer"; Jonas's "that was it" is a comment under Priya; Dan's "which version?" is an answer with Jonas's "4.2.1" as its comment; "Votes" / "Oldest" reorder; upvoting Priya calls `onVote('p4', 'up')`; with `onAcceptAnswer` every answer shows "Accept this answer" and the accepted one "Accepted answer" pressed; "Add a comment" under the question posts `{ body, parentId: 'p1' }` and "Comment posted." is announced; Hot tags link through `searchHref` and are absent without it; Linked docs absent when `docs` is empty; `posts: []` → "No answers yet.".
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/qa/topic-page.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the two files.
- [ ] **Step 4: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum` — Expected: PASS.
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): Q&A topic page"`

### Task 11: Composer page and the public pages

**Files:**

- Create: `packages/ui/src/pages/forum/{composer-page.tsx,forum-index-page.tsx,forum-category-page.tsx,forum-topic-page.tsx}`
- Modify: `packages/ui/src/pages/forum/index.ts`
- Test: `packages/ui/src/pages/forum/composer-page.test.tsx`, `packages/ui/src/pages/forum/forum-pages.test.tsx`

**Interfaces:**

- Consumes: everything above; `TextField`, `TextareaField`, `SelectField`, `TagsField`, `FormError`, `useFormSubmit` from `../access/forms/form-fields`.
- Produces: `ForumComposerPage(props: ForumComposerPageProps)` per spec "Composer page": `ForumLayout` (navigating search), a 40rem column, `h1` = `vocabulary.composerHeading`, one guidance sentence (builder's copy), react-hook-form + zod: `title` (`vocabulary.titleLabel`; `min(10, 'Use at least 10 characters.')`, `max(120, 'Keep the title under 120 characters.')`), `categoryId` (`SelectField`, options in input order, `min(1, 'Choose a category.')`, default `defaultCategoryId ?? ''`), `tags` (`TagsField`, `validate` lower-cases, refuses a sixth and a duplicate; schema `max(5)`), `body` (`TextareaField rows={8}`, `min(20, 'Write at least 20 characters.')`); footer: "Cancel" link to `cancelHref` (outline) and the solid `vocabulary.composerSubmit`; `useFormSubmit(onCreateTopic)` for the pending and `FormError` states; the first invalid field takes focus (react-hook-form's `shouldFocusError`). `ForumIndexPage`, `ForumCategoryPage`, `ForumTopicPage` switch on `variant` like `BlogIndexPage`. `index.ts` exports the four pages and `ForumLayout`.

- [ ] **Step 1: Write the failing tests**: composer — heading and submit per variant; "Question" label for qa; a 9-character title shows "Use at least 10 characters." and focuses the title; empty category shows "Choose a category."; a sixth tag is refused and "YAML" becomes "yaml"; a 19-character body fails; a valid submit calls `onCreateTopic({ title, categoryId: 'kemo-console', tags: ['crd'], body })` trimmed; a rejection shows its message; `defaultCategoryId` preselects; Cancel links to `cancelHref`. pages — each public page renders each variant with one `h1` (an `it.each` over the three, like `blog-pages.test.tsx`), and the footer year reaches every one.
- [ ] **Step 2: Run** `pnpm --filter @kemo/ui exec vitest run src/pages/forum/composer-page.test.tsx src/pages/forum/forum-pages.test.tsx` — Expected: FAIL.
- [ ] **Step 3: Implement** the four files and the exports.
- [ ] **Step 4: Run** `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check` — Expected: all green (every earlier suite still passes).
- [ ] **Step 5: Commit** — `git add packages/ui/src/pages/forum && git commit -m "feat(ui): forum composer and the public forum pages"`

### Task 12: Preview store, mock content, routes and panel section

**Files:**

- Create: `apps/preview/src/lib/{mock-forum.tsx,forum-reducer.ts,forum-reducer.test.ts}`, `apps/preview/src/components/forum/{forum-demo-shell.tsx,forum-demo.tsx}`, `apps/preview/src/app/forum/{page.tsx,layout.tsx}`, `apps/preview/src/app/forum/[variant]/page.tsx`, `apps/preview/src/app/forum/[variant]/c/[category]/page.tsx`, `apps/preview/src/app/forum/[variant]/t/[slug]/page.tsx`, `apps/preview/src/app/forum/[variant]/new/page.tsx`
- Modify: `apps/preview/src/components/preview-panel.tsx` (a "Forum" section after "Blog"), `apps/preview/test/kemo-ui.ts` (re-export `paragraphsOf`, `isSolved` from `../../../packages/ui/src/pages/forum/content`)

**Interfaces:**

- Consumes: the public pages, `paragraphsOf`, `isSolved`.
- Produces:
  - `mock-forum.tsx`: `FORUM_NOW = '2026-11-12T15:00:00Z'`; `forumUsers` (eight; `priya` staff, `jonas` the viewer), `forumCategories` (eight, the mockup's counts, `solvedCount` summing to 1,146), `forumTopics` (twenty-eight per the spec's "Mock content", with `posts` on the sample thread `schema-browser-crd` and four more, times as offsets from `FORUM_NOW` via `shiftTime` copied from `mock-deployments.ts`), `forumSlugs`, `forumDocs` (the one FAQ link), `footerLinks`.
  - `forum-reducer.ts`: `ForumState { categories; topics: Record<slug, ForumTopic>; order: string[]; now: string; nextId: number; viewer: ForumUser }`; `ForumAction` = `reply { slug; body; parentId?; quoteOf? }` (appends a post stamped at the stepped clock with `paragraphsOf(body)`, the quote from `quoteOf`'s author and first paragraph, bumps `replyCount`, `lastActivityAt`), `react { slug; postId; emoji }` (toggle; count ±1, `reacted`), `vote { slug; postId; direction }` (score moves by the delta from the previous viewer vote; `postId === original` edits `topic.votes`), `accept { slug; postId }` (moves the single `accepted`, updates `solvedCount` on the category), `follow { slug; following }`, `create { title; categoryId; tags; body }` (slug = kebab title + `-{nextId}`; `createdAt` = clock; prepends to `order`; bumps the category's `topicCount`), `tick` (`+ CLOCK_TICK_MS`); `STEP_MS = 3000`, `CLOCK_TICK_MS = 30_000`; `forumReducer`, `initialState`, `slugFor(title, n)`.
  - `forum-demo-shell.tsx`: `ForumDemoShell` (`useReducer`, the 30 s visible-only tick, `useForumDemo()` with `state` and promise-returning handlers that `await wait(300)` and reject with `new Error('…')` when the text contains "fail": `reply`, `react`, `vote`, `accept`, `follow`, `create` (resolves to the slug)).
  - `forum-demo.tsx`: `ForumIndexDemo({ variant, query? })`, `ForumCategoryDemo({ variant, categoryId })`, `ForumTopicDemo({ variant, slug })` (calls `notFound()` after hydration when the slug is unknown, the `deployment-detail-demo.tsx` way), `ForumComposerDemo({ variant, categoryId? })` (`router.push(topicHref)` after `create`). Shared `chrome(variant)`: `logo: <BrandMark letter="K" />`, `brand: 'Kemo'`, `nav` = `[{ label: vocabulary.sectionLabel, href: indexHref, current }]` plus `{ label: 'Categories', href: '#categories' }` for discussions on its feed pages, `signInHref: '/login'`, `linkComponent: NextLink`, `footer` = the three links, `now: state.now`, `viewer`, `categoryHref`, `topicHref`, `composerHref` (`?category=` when given), `searchHref` (`/forum/{variant}?q=`).
  - Routes: `/forum` redirects to `/forum/boards`; `[variant]/page.tsx` validates the variant (`notFound()`), reads `searchParams.q` into `defaultQuery`, `generateMetadata` = `forumVariants[variant].title`; `c/[category]` validates both (`generateStaticParams` over variants × categories); `t/[slug]` with `generateStaticParams` over variants × `forumSlugs` and `export const dynamicParams = true`, metadata the seeded title or "Topic"; `new/page.tsx` reads `searchParams.category`. `app/forum/layout.tsx` wraps in `ForumDemoShell`.
  - Panel: `forumRoutes` (nine entries, the spec's labels) in a "Forum" section after "Blog".

- [ ] **Step 1: Write the failing reducer tests** (`forum-reducer.test.ts`, node): `reply` appends a post with paragraphs from the body, bumps `replyCount` and sets `lastActivityAt` to the new `now`; `reply` with `quoteOf` carries the quote; `react` toggles on and off; `vote` from `up` to `down` moves the score by −2 and `null` by −1; `accept` moves the mark and keeps `solvedCount` consistent; `create` yields a unique slug, the new topic first, `topicCount` +1; `tick` moves `now` by 30 s; the clock never reads `Date`.
- [ ] **Step 2: Run** `pnpm --filter @kemo/preview test` — Expected: FAIL.
- [ ] **Step 3: Implement** the files above (the mock content exactly as the spec's "Mock content"; people and events fictional).
- [ ] **Step 4: Run** `pnpm --filter @kemo/preview test`, then `pnpm --filter @kemo/ui lib && pnpm typecheck && pnpm lint && pnpm format:check && pnpm build` (sandbox disabled for the build) — Expected: green; the build lists the forum routes.
- [ ] **Step 5: Smoke by hand** with the scratch Playwright config or `next start -p 3100`: open `/forum/boards`, `/forum/discussions/t/schema-browser-crd`, `/forum/qa/new`; post a reply; create a topic and land on it.
- [ ] **Step 6: Commit** — `git add apps/preview/src/lib/mock-forum.tsx apps/preview/src/lib/forum-reducer.ts apps/preview/src/lib/forum-reducer.test.ts apps/preview/src/components/forum apps/preview/src/app/forum apps/preview/src/components/preview-panel.tsx apps/preview/test/kemo-ui.ts && git commit -m "feat(preview): forum demo with a reducer store, routes and panel section"`

### Task 13: e2e, gallery and docs

**Files:**

- Create: `apps/preview/e2e/forum.spec.ts`, `docs/forum-pages.md`
- Modify: `apps/preview/gallery/manifest.ts` (a `forum` family after `blog`), `README.md` (Documentation row "Forum pages"; roadmap item 8 "Done: forum pages …", publishing becomes 9; the intro's list of page sets), `docs/blog-pages.md` (one sentence on `BlogProse`'s `size`), `docs/development.md` (the e2e paragraph gains the forum sentence)

**Interfaces:**

- Consumes: everything.
- Produces: `forum.spec.ts` in the `blog.spec.ts` style (console-error guard, `hydrated` helper, `PAGES` of the twelve routes with their `h1`s; the Discussions index `h1` is hidden, so assert `toHaveCount(1)` and the text, not visibility); the gallery entries `forum/{boards,boards-category,boards-topic,boards-new,discussions,…,qa-new}` with `heading: 'Schema browser shows no CRD fields after 4.2'` on the three topic entries; `docs/forum-pages.md` in the blog guide's style: the variations table, the content model (types block), what is derived (solved, counts, times, ratios), the host example (a `'use client'` wrapper with the hrefs and handlers), the preview's demo store and clock, a "Screenshots" line to `gallery/README.md#forum-pages`.

- [ ] **Step 1: Write the e2e** per the spec's e2e list: the twelve routes render with one `h1`, no console errors, and no horizontal scroll at 375px; `/forum` redirect; unknown slug → the 404 heading after hydration (`expected` the 404 console line as `blog.spec.ts` does); the panel lists the nine entries after Blog; front → category → topic → back in each variation; filters in each list (one chip per page); search with results ("crd") and with none ("zzzz") in each variation; pagination on the Boards and Q&A category pages and the Boards thread; a reply in each variation (appears, status announced, "just now"); a nested reply in Discussions; a reaction, a vote, accept (as Jonas on his own thread) and follow; a comment in Q&A; creating a topic in each variation lands on `/forum/<v>/t/<slug>` and it appears first in the lists; a "fail" reply shows the error and keeps the text; a 300-character unbroken reply does not widen the page at 375px; dark theme smoke on one page per variation (body background luminance below 0.2).
- [ ] **Step 2: Run** `pnpm build` (sandbox disabled) then Playwright with the scratch config on :3100, `--grep forum` — Expected: all pass. Fix what fails in the UI package or the demo and re-run.
- [ ] **Step 3: Add the gallery family**, then run `GALLERY_ONLY=forum pnpm gallery` (sandbox disabled) — Expected: 24 PNGs under `docs/gallery/forum/` and the index rewritten; look at the PNGs.
- [ ] **Step 4: Write the docs** listed above; run `pnpm format:check` and `pnpm lint`.
- [ ] **Step 5: Run** the full chain once more — Expected: green.
- [ ] **Step 6: Commit** — `git add apps/preview/e2e/forum.spec.ts apps/preview/gallery/manifest.ts docs/gallery docs/forum-pages.md docs/blog-pages.md docs/development.md README.md && git commit -m "feat(preview): forum e2e, gallery screenshots and guide"`
