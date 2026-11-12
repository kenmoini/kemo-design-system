# Blog pages

Date: 2026-11-12. Status: layouts approved in the visual brainstorm (all three index directions are to be
built, each with its matching post page; the direction names are the variation titles). Everything marked
"our call" below was decided by the author of this document, not by the owner.

Mockups (open in a browser; they are fragments for the brainstorm frame but render standalone):

- `docs/superpowers/specs/assets/2026-11-12-blog-index-layouts.html`
- `docs/superpowers/specs/assets/2026-11-12-blog-post-layouts.html`

## Intent

A third kind of example page for the design system. So far there are bare pages on the gradient (auth,
status) and pages inside the signed-in console shell (dashboard, access, FAQ, deployments). A blog is public,
long-form and reading-first: it shows the same tokens and components carrying editorial content.

Because these are examples, we build **three variations** rather than choosing one, so a team starting a
blog can see the range and copy the one that fits:

| Variation id     | Variation title (exact) | Index page                                                    | Post page                                              |
| ---------------- | ----------------------- | ------------------------------------------------------------- | ------------------------------------------------------ |
| `editorial-list` | Editorial list          | narrow column, one Nightfall feature block, dated text list   | Nightfall header band, one reading column, prev / next |
| `magazine-grid`  | Magazine grid           | split hero, topic tabs, three-column cover cards, pagination  | centred title, wide cover, tags, "Keep reading" cards  |
| `journal-rail`   | Journal with a rail     | sticky rail (about, topics, subscribe), feed grouped by month | rail with "On this page", details block, copy link     |

Six example pages in all. The blog sits **outside the console shell**: no `AppShell`, no sidebar, its own
slim top bar and footer. In the preview's panel it is its own section, "Blog", between "Pages" and "Status
pages". It is not added to the console's side navigation.

Like the other families, these are presentational components in `@kemo/ui` with host-injected data and
handlers; the preview app is the example host.

## Goals, non-goals, anti-goals

Goals: one content model that all six pages render; one shared prose renderer so an article looks the same in
every variation; the three variations differing only in layout and furniture; working topic filtering,
paging, subscribe and copy-link in the preview; light and dark themes; 375px to wide desktop; preview
routes, panel entries, README section, unit tests and e2e.

Non-goals: Markdown or MDX parsing, a CMS, real search, RSS generation, syntax highlighting,
separate topic or author pages, localisation, SEO metadata beyond the page title, real images (covers are
generated gradient art; a host may pass an image).

Anti-goals (it fails even if it works): a post whose body text is hard to read (line length over about 75
characters, low contrast, cramped leading); the three variations drifting into three different visual
languages; a blog that looks like a console page with the sidebar removed; inert controls in the preview
(every visible button or link does something); topic or state shown by colour alone.

Comments (added by the owner after the layout rounds) are in scope as a section under every post; comment
moderation, editing, deleting, voting, sign-in and nesting deeper than one level of replies are non-goals.

## Constraints

Unchanged from the earlier phases: Panda CSS 2.5 `panda lib` workflow; Park UI components synced from the
registry, never hand-edited; our files only under `src/pages/**`, `src/layouts/**`, `src/widgets/**`,
`src/theme/tokens/{fonts,easings,gradients,chart}.ts`, `src/theme/radii.ts`; relative `styled-system` imports
inside the package (`../../../styled-system/*` from `src/pages/blog/`, Park components from
`../../components/ui`); tokens only, no raw colours outside `gradients.ts`; `'use client'` where hooks are
used; Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; lint with zero
warnings; Vitest + Testing Library for units, Playwright for the preview; one commit per task on `main`.

New for this phase: **another session is building the Deployments pages on `main` at the same time.** Its
work lands as commits on `main` while we work, and may sit uncommitted in the tree at any moment
(`packages/ui/src/pages/deployments/`, `packages/ui/src/widgets/schema-browser/`, possibly shared files).
Therefore:

- stage by explicit path, never `git add -A` or `git add .`; never commit, revert, format or "fix" files
  under `pages/deployments/`, `pages/resources/`, `widgets/schema-browser/`, `widgets/yaml-editor/` or
  `lib/kubernetes`;
- the shared files this phase must touch are `packages/ui/src/index.ts` (one export line),
  `apps/preview/src/components/preview-panel.tsx` (one section), `README.md` (one section) and the e2e spec
  folder (a new file, not edits to existing specs). Before editing a shared file, check `git diff` on it; if
  the other session has uncommitted hunks there, commit only our hunk (for example `git apply --cached` of
  our patch) and leave theirs unstaged;
- a type, lint, test or build failure that comes from the other session's in-progress files is not ours to
  fix: report it and verify our own files in isolation (targeted `vitest`, `eslint` and `tsc` output filtered
  to our paths).

No new dependencies. Everything needed is already in the package (`lucide-react`, Park `Avatar`, `Badge`,
`Button`, `Card`, `Dialog`, `Field`, `Input`, `Link`, `Pagination`, `Tabs`, `Code`, react-hook-form + zod).

## The look

Shared by all six pages. Sizes are from the mockups, which are drawn at roughly 85% scale; treat the mockups
as the reference for proportion and the tokens below as the reference for values.

- **Canvas**: `bg.canvas` (or the page background the dashboard uses), text `fg.default`, secondary
  `fg.muted`, tertiary `fg.subtle`, hairlines `border.subtle`/`border`. Neutral accent, as everywhere else.
- **Colour**: the only colour is Nightfall. It appears as (1) the feature block on the Editorial list index,
  (2) the header band on the Editorial list post, (3) cover art, (4) the 2px rule on a pull quote. Elements
  on Nightfall force Park's dark mode the way `AuthLayout` does (`className="dark"`), in both themes.
- **Top bar** (`BlogLayout`): 3.5rem high, `bg.default`, bottom hairline, not sticky. Left: the host's `logo`
  slot, `brand` in semibold `sm`, then "/ {section}" in `fg.subtle` (default section "Blog"); brand and section
  together link to the index. Then the host's nav links (`sm`, `fg.muted`, current one `fg.default` medium
  with `aria-current="page"`). Right: a solid `sm` "Subscribe" button when the host passes `onSubscribe`.
  Below `md` the nav links hide and the bar keeps brand and Subscribe.
- **Footer**: top hairline, `xs` `fg.subtle`, a left slot and a right slot (default right "© {year} {brand}").
- **Covers** (`BlogCover`): a rounded `l2` block filled with one of six gradient presets plus a faint 115°
  hairline stripe overlay. Decorative (`aria-hidden`). Presets are new tokens `gradients.cover1` …
  `gradients.cover6` in `gradients.ts`, values from the mockup's `.c1` … `.c6`. A post's cover is either
  `{ preset: 1–6 }` or `{ src, alt }` (rendered as an `img` with `object-fit: cover`); with neither, the
  preset is derived from the slug so every post gets stable art.
- **Topic badge**: Park `Badge`, subtle, `sm`. **Byline**: 1rem avatar (Park `Avatar` with initials
  fallback), author name, date, reading time, separated by " · ", `xs` `fg.subtle`.
- **Dates**: absolute, UTC, `en-GB` short form "11 Nov 2026" inside `<time dateTime>`. Reading time
  "{n} min read".
- **Radii**: `l2` for blocks and covers, as elsewhere. No shadows.

### Prose (`BlogProse`), identical in all three post pages

A single column, max width 40rem, `md` text with line height 1.7, block gap `4`. The 40rem container aligns
with the headers, code blocks and stats rows; running text (paragraphs, lists, quotes, callout text) is
additionally capped at `68ch` so the line-length anti-goal holds.

- paragraph. Block content is a `ReactNode` the host writes: for inline code the host uses Park `Code`, for
  links Park `Link` (wrapping its own router link with `asChild` for internal links). `BlogProse` does not
  transform or restyle raw tags. The mock data file is therefore `.tsx`;
- heading: `h2` in `xl` semibold with tight tracking and extra top margin, `h3` in `lg`; each gets an `id`
  (from the block's `id`, else slugged from its text) and `scroll-margin-top`;
- unordered or ordered list;
- pull quote: `xl`, left 2px rule in the Nightfall purple (a token, e.g. via `gradients`-adjacent colour or
  `purple`-free: use `border.emphasized` in the theme if no purple token exists, builder's choice), no
  quotation marks added;
- code block: `<pre><code>`, mono `sm`, always dark (`gray.dark` surface via forced dark), horizontal scroll,
  optional `language` label top-right, optional caption; no highlighting;
- callout: outlined box with a bold label ("Note" by default) and text; tone `neutral | warning`;
  warning adds an icon, not only colour;
- stats row: up to three outlined cells, big value over a muted label; stacks to one column below `sm`;
- figure: a `BlogCover` or image with a caption.

### Comments (`BlogComments`), identical in all three post pages

Requested by the owner after the mockup rounds ("a comments section down below the content in the different
post views"); the design below is our call and was not mocked up.

A `<section id="comments">` in the reading column (max 40rem), separated from what is above by a hairline and
generous space:

- heading (`h2`, `xl`) "Comments" followed by the total in muted text, e.g. "Comments 5" with an accessible
  name of "Comments (5)"; the total counts replies;
- the **form** first (only when the host passes `onAddComment`): "Name" input, "Comment" textarea (4 rows),
  solid "Post comment" button, all Park `Field`s;
- the **list**, oldest first: each comment is an `<article>` with a 2rem avatar (initials fallback), the
  author's name in medium weight, the date ("11 Nov 2026" in `<time>`), the body as plain text
  (`white-space: pre-wrap`, `overflow-wrap: anywhere`, never interpreted as HTML), and a plain "Reply" button
  when `onAddComment` is passed;
- **replies**: one level, indented under their parent behind a left hairline; replies have no "Reply" button;
  pressing "Reply" opens the same form inline under that comment (with "Cancel"), focuses its first empty
  field, and only one reply form is open at a time;
- empty: "No comments yet." (followed by the form when present).

Where it sits: **Editorial list**: after the author row, before previous / next. **Magazine grid**: after the
tags and share row, before "Keep reading". **Journal with a rail**: after the prose in the main column (after
"Copy link" below `lg`), and the rail's "On this page" gains a last entry "Comments" linking to `#comments`,
tracked like any other section.

### Editorial list

Index: one column, max 45rem, centred. Title (`3xl`–`4xl`, tight tracking) and description. The **featured**
post (the newest post flagged `featured`, else the newest) is a Nightfall block: "Featured" and topic badges,
title `2xl`, summary, byline; the whole block is one link. Then a row with topic chips on the left ("All"
plus each topic; toggle buttons with `aria-pressed`, selected is solid) and the post count on the right
("8 posts"). Then the list: each row is `date | title, summary, byline | topic badge`, hairline between rows;
below `sm` the date moves above the title and the badge joins the byline. The featured post is not repeated
in the list while the filter is "All"; with a topic selected the feature block hides and the list shows every
match. Shows 6 rows, then an "Older posts" button reveals 6 more (hidden when none remain).

Post: a full-width Nightfall band holding, in a 40rem column: "← All posts" link, topic badge, `h1` (`4xl`),
summary, byline. Then the prose. Then a hairline and a row with the author (2rem avatar, name, role) on the
left and "Copy link" on the right. Then previous / next as two outlined cells (older on the left, newer on
the right; a missing side renders an empty cell so the other keeps its place; on the newest post the right
cell is omitted rather than saying "Nothing newer yet" — our call, the mockup showed placeholder text).

### Magazine grid

Index: max width 72rem. Hero for the newest post: cover (about 5:3) on the left, topic badge, title `3xl`,
summary, byline on the right; stacks below `md`. Then Park `Tabs` (line variant) with "All posts" plus one
tab per topic, post count on the right, and a single panel. Then a card grid, 3 columns on `lg`, 2 on `sm`,
1 below: cover, topic badge, title, summary, byline (author and short date "04 Nov"). The whole card is one
link (title is the anchor, stretched over the card). The hero post is excluded from the grid on "All posts";
with a topic selected the hero hides. 6 cards per page with Park `Pagination` below, shown only when there is
more than one page; changing topic returns to page 1.

Post: centred header in a 48rem column (topic badge, `h1` `4xl`, summary, author block with 2rem avatar,
name, "date · reading time"), a wide cover (max 72rem, about 3:1), the prose centred, then a hairline row
with the post's tags (Park `Badge` outline) on the left and "Copy link" plus "Share" on the right ("Share"
renders only when `navigator.share` exists, checked after mount). Then "Keep reading": three cards in the
index card style, chosen as same-topic posts first, then newest, never the current post.

### Journal with a rail

Index: max width 72rem, two columns from `lg`: a 14rem rail and the feed. Rail (sticky under the top of the
viewport from `lg`): title (`2xl`) and description; "Topics" list of buttons with counts ("All posts 8",
"Engineering 4" …), selected one on `bg.subtle` with `aria-pressed`; a subscribe card (heading, email field,
solid button) when `onSubscribe` is passed. The top bar's own Subscribe button is hidden in this variation,
on the index (the rail has the form) and on the post (the approved mockup shows none). Feed: posts grouped by month, each group headed "November 2026" on the left and
"2 posts" on the right over a hairline; each item is `day number over weekday | title, summary, topic badge +
author + reading time | small cover thumbnail`. The thumbnail shows only when the post has an explicit
`cover` (so some rows are text-only, as in the mockup). Below `lg` the rail becomes a block above the feed:
title and description, topics as a wrapping chip row, subscribe card after the feed. Shows 5 items, then a
"Load older posts" button reveals 5 more.

Post: the same two columns. Rail (sticky from `lg`): "← {index title}" link; "On this page" built from the
post's `h2` and `h3` blocks (h3 indented), current section marked with a darker left rule and
`aria-current="location"`, tracking via the existing `useCurrentSection`; "Details" as a `dl` (Author,
Published, Topic, Reading); "Copy link" button. Main: topic badge, `h1` (`3xl`–`4xl`), summary, hairline,
prose. Footer row links to the previous (older) post. Below `lg` the rail collapses: the back link and the
details `dl` sit above the title in one row, "On this page" is hidden, "Copy link" follows the prose.

## Behaviour

- **Topic filter**: client-side; `topic` / `defaultTopic` / `onTopicChange` (controlled or uncontrolled,
  `undefined` = all). A visually hidden `aria-live="polite"` region announces "{n} posts" /
  "1 post" / "No posts in {topic}" when the filter changes. An empty result shows the existing `EmptyState`
  widget with a "Show all posts" action.
- **Subscribe** (our call; the mockups only drew the button): one `SubscribeForm` (react-hook-form + zod
  email, Park `Field`), used inline in the Journal rail and inside a Park `Dialog` opened by the top bar's
  button in the other two variations. `onSubscribe(email)` returns a promise; while pending the button shows
  its loading state; on resolve the form is replaced by "Thanks. Check {email} to confirm."; on reject an
  inline error appears and the form stays. The dialog returns focus to the trigger on close.
- **Copy link**: writes `window.location.href` to the clipboard, label switches to "Copied" for 2 seconds,
  announced through a polite live region; if the clipboard API is missing or rejects, the label reads
  "Copy failed".
- **Comments**: the section renders when the host passes `comments` (an empty array shows the empty
  message); without the prop there is no section and no "Comments" entry in the Journal rail.
  `onAddComment({ name, body, parentId? })` returns a promise. Validation: name required, at most 80
  characters; comment required, at most 2000; both trimmed. While pending the button shows its loading
  state and cannot be pressed twice; on resolve the comment field clears (the name is kept for the next
  comment), an inline reply form closes, and a polite status says "Comment posted."; the page does not add
  the comment itself, the host does by passing new `comments`. On reject an inline alert shows the
  rejection's message or "Your comment could not be posted. Try again." and the text is kept.
- **Links**: every post link is `postHref(post)`, supplied by the host; `indexHref` likewise. `linkComponent`
  as on the other pages (default: a bare anchor).
- **Post order**: pages sort posts by `publishedAt` descending themselves; hosts need not pre-sort.
  Previous = next older, next = next newer, across all posts regardless of topic.
- **Top-bar extras from the mockups that are not built** (our call): the mockups drew "Topics", "Authors",
  "RSS" nav items and a "Search" button. Topic and author pages and search are non-goals, and the anti-goals
  rule out inert controls, so the preview's top bar carries "Posts" only, plus Subscribe. `BlogLayout` still
  takes arbitrary `nav` links, so a host with those pages can add them.

## Components and API (`packages/ui/src/pages/blog/`)

Names are fixed; internals are the builder's. One file per variation page; shared parts in their own files.

```ts
export type BlogVariant = 'editorial-list' | 'magazine-grid' | 'journal-rail'
/** id → the exact variation title: Editorial list, Magazine grid, Journal with a rail. */
export const blogVariants: Record<BlogVariant, { title: string; description: string }>

export interface BlogAuthor {
  id: string
  name: string
  role?: string
  avatarSrc?: string
}
export interface BlogTopic {
  id: string
  label: string
}
export type BlogCoverSpec = { preset: 1 | 2 | 3 | 4 | 5 | 6 } | { src: string; alt: string }

export type BlogBlock =
  | { type: 'paragraph'; content: ReactNode }
  | { type: 'heading'; level: 2 | 3; text: string; id?: string }
  | { type: 'list'; ordered?: boolean; items: ReactNode[] }
  | { type: 'quote'; content: ReactNode; cite?: string }
  | { type: 'code'; code: string; language?: string; caption?: string }
  | { type: 'callout'; tone?: 'neutral' | 'warning'; label?: string; content: ReactNode }
  | { type: 'stats'; items: { value: string; label: string }[] }
  | { type: 'figure'; cover: BlogCoverSpec; caption?: string }

/** `replies` is one level deep; replies of replies are ignored. `body` is plain text. */
export interface BlogComment {
  id: string
  author: { name: string; avatarSrc?: string }
  postedAt: string // ISO 8601
  body: string
  replies?: BlogComment[]
}

export interface BlogPost {
  slug: string // unique; used for keys and derived cover preset
  title: string
  summary: string
  topic: BlogTopic
  author: BlogAuthor
  publishedAt: string // ISO 8601
  readingMinutes: number
  featured?: boolean
  cover?: BlogCoverSpec
  tags?: string[]
  body: BlogBlock[]
}

interface BlogChromeProps {
  // shared by index and post pages
  variant: BlogVariant
  logo?: ReactNode
  brand: string
  section?: string // default "Blog"
  nav?: { label: string; href: string; current?: boolean }[]
  footer?: ReactNode // replaces the default footer left slot
  onSubscribe?: (email: string) => Promise<void>
  linkComponent?: LinkComponent
  indexHref: string
  postHref: (post: BlogPost) => string
}

export interface BlogIndexPageProps extends BlogChromeProps {
  title: string
  description?: ReactNode
  posts: BlogPost[]
  topic?: string // topic id; controlled
  defaultTopic?: string
  onTopicChange?: (topicId: string | undefined) => void
}

export interface BlogPostPageProps extends BlogChromeProps {
  post: BlogPost
  posts: BlogPost[] // all posts, for previous / next and "Keep reading"
  indexTitle?: string // back-link text in Journal ("← Platform journal"); default "All posts"
  comments?: BlogComment[] // omit for no comments section
  onAddComment?: (input: { name: string; body: string; parentId?: string }) => Promise<void>
}
```

Exports: `BlogIndexPage`, `BlogPostPage` (each switches on `variant` to its variation's component),
`BlogLayout`, `BlogProse`, `BlogCover`, `BlogComments`, `SubscribeForm`, `blogVariants`, and the types above. The list of
topics shown by a filter is derived from `posts` (distinct `topic.id`, in order of first appearance after
sorting), so there is no separate `topics` prop. `packages/ui/src/index.ts` gains `export * from './pages/blog'`.

Accessibility: `header` / `main` / `footer` landmarks from `BlogLayout`; exactly one `h1` per page (index:
the blog title; post: the post title); each post in a list is an `article` with its title as a heading one
level below its section; the post body is an `article`; rails are `aside` or `nav` with labels ("Topics",
"On this page"); previous / next is a `nav` labelled "More posts"; all interactive targets keyboard-reachable
with the standard focus ring; text contrast AA in both themes and on Nightfall.

## Preview

Routes (App Router, statically generated):

- `/blog` redirects to `/blog/editorial-list`;
- `/blog/[variant]` renders `BlogIndexPage`; an unknown variant calls `notFound()`;
- `/blog/[variant]/[slug]` renders `BlogPostPage`; an unknown slug calls `notFound()` (the existing 404
  status page).

A `BlogDemo` client component under `apps/preview/src/components/blog/` wires the pages to
`apps/preview/src/lib/mock-blog.tsx`, the `BrandMark`, `NextLink`, and a mock `onSubscribe` (resolves after a
short delay; rejects for an address containing "fail" so the error state can be seen, in the style of the
auth mocks). Page titles: the variation title for an index, the post title for a post.

Mock content: the Kemo Console platform team's blog. Index title "Notes from the platform team" (Journal:
"Platform journal"). Eight posts across four topics (Engineering 4, Releases 2, Incidents 1, Design 1) and
four authors, dated 9 Sep to 11 Nov 2026, with the titles, summaries, authors and dates from the mockups
(seven are drawn there; add one Engineering post dated between 9 and 21 September, so September has three). The newest post ("How we cut
cold-start time for cluster consoles by 62%") is `featured` and has a full body that uses every block type
and at least four `h2` sections, so the Journal's "On this page" has something to track. The other seven
have shorter but real bodies (four to eight blocks). Five or six posts have an explicit `cover`; the rest
leave it unset. People and events are fictional.

Preview panel: a new section titled "Blog" between "Pages" and "Status pages" with six entries, in this
order: "Editorial list" → `/blog/editorial-list`, "Editorial list: post" → the featured post in that
variation, then the same pair for "Magazine grid" and "Journal with a rail".

Comments in the preview: `mock-blog.tsx` also holds seed comments per post (the featured post has four,
one of them a reply; two other posts have one or two; the rest none, to show the empty state). `BlogDemo`
keeps comments in component state and its mock `onAddComment` appends the new comment or reply after a short
delay (rejecting when the text contains "fail"), so posting visibly works; state resets on reload.

README: a "Blog pages" section in the style of the existing page sections: what the three variations are,
the content model, a minimal host example, and the note that covers are generated.

## Tests

Unit (Vitest + Testing Library), next to the components:

- content: sorting by date, featured selection, previous / next, "Keep reading" selection, month grouping,
  topic derivation, derived cover preset stable for a slug;
- each index variation: renders every expected post once, one `h1`, filter changes the list and announces
  the count, empty state and its reset, reveal / pagination behaviour, featured/hero hidden under a filter,
  controlled `topic`;
- each post variation: one `h1`, byline and `time dateTime`, its own furniture (prev / next; tags and Keep
  reading; On this page and details);
- `BlogComments`: count including replies, order, replies nested once, empty state, no form or Reply without
  `onAddComment`, validation, pending, success (field cleared, name kept, status), rejection, reply form
  opens / cancels / posts with `parentId`, a body containing markup renders as text; each post variation
  shows the section in its place and omits it without `comments`; the Journal rail lists "Comments";
- `BlogProse`: every block type, heading ids, ordered vs unordered list, callout warning has a non-colour cue;
- `SubscribeForm`: invalid email, pending, success, rejection; dialog focus return;
- copy link: success, failure, label reverts.

e2e (Playwright, new spec file): each of the six panel entries loads with the right `h1`; index → post →
back in each variation; topic filter in each; Magazine pagination; subscribe success via dialog and via the
rail; posting a comment and a reply on a post in each variation; Journal "On this page" marks a section after clicking it; `/blog` redirect; unknown slug shows the 404
page; no horizontal scroll at 375px on all six; dark theme smoke on one index and one post. e2e runs against
a built preview on :3100 with a scratch Playwright config, never the owner's dev server on :3000.

## Decisions

1. Three variations, all built, titled exactly "Editorial list", "Magazine grid", "Journal with a rail"
   (owner).
2. Each variation is an index page plus a post page: six example pages (owner).
3. The blog is outside the console shell and outside the console's navigation, and is its own "Blog" section
   in the preview panel above "Status pages" and "Components" (owner).
4. Layouts as drawn in the two mockup files (owner approved both rounds).

5. Every post page has a comments section below the content (owner, after the mockup rounds).

## Our calls (not yet seen by the owner beyond the mockups)

1. One `variant` prop on two page components, rather than six named components.
2. Post bodies are typed blocks, not Markdown, so there is no parser dependency and the Journal can build
   its "On this page" from the data.
3. Topics, Authors, RSS and Search from the mockup's top bar are not built; the preview nav shows "Posts".
4. Subscribe is a real mock flow: a dialog from the top bar (Editorial list, Magazine grid) and the inline
   rail form (Journal).
5. Six panel entries (index and post for each variation) so every example page is one click away.
6. Both colour themes are supported; the mockups showed light only.
7. Routes are `/blog/<variation>` and `/blog/<variation>/<slug>`; `/blog` redirects to the first variation.
8. Sample content is a fictional platform-team engineering blog; covers are generated gradients.
9. Filter state is component state, not the URL.
10. "Share" appears only where the browser supports it; previous / next omit a missing side.
11. Inline code and links in a post body are written by the host with Park `Code` and `Link`.
12. Running text is capped at 68 characters per line inside the 40rem column.
13. Eight sample posts; the Journal post page has no Subscribe.

14. Comments: name-and-text form with no sign-in, one level of replies, oldest first, plain-text bodies,
    placement per variation as described under "Comments", and a working mock in the preview.

## Left to the builder

File split inside `pages/blog/`; exact token choices where the mockup gives pixels; the pull-quote rule's
token; the wording and bodies of the seven shorter posts and the two extra posts; breakpoints' fine detail
between the stated layouts; how the slug-to-preset derivation hashes; test file organisation; whether the
variation components share a small internal hooks file for filtering and paging.
