# Forum pages

Date: 2026-11-12. Status: both mockup rounds approved in the visual brainstorm (all three directions are to
be built; the direction names are the variation titles). Everything marked "our call" below was decided by
the author of this document, not by the owner.

Mockups (fragments for the brainstorm frame; they render standalone in a browser):

- `docs/superpowers/specs/assets/2026-11-12-forum-home-layouts.html` (front page, one per direction)
- `docs/superpowers/specs/assets/2026-11-12-forum-thread-layouts.html` (thread page, one per direction)

## Intent

A fourth kind of example page for the design system: a public community forum, where people who run Kemo
Console ask, answer and announce. Like the blog it lives outside the console shell and is reading-first, but
it is also the first example family that is **interactive at its core**: lists that filter and page, threads
that take replies, votes, reactions and an accepted answer, and a composer that creates a topic.

As with the blog, these are examples, so we build **three variations** rather than choosing one, each a
different kind of forum a team might want:

| Variation id  | Variation title (exact) | What it is                                                                                     |
| ------------- | ----------------------- | ---------------------------------------------------------------------------------------------- |
| `boards`      | Boards                  | The classic forum: boards grouped in sections, topic rows with counts, numbered posts in order |
| `discussions` | Discussions feed        | One feed across categories with a rail; a thread is a card with reactions and nested replies   |
| `qa`          | Q&A desk                | Search-first and answer-first; votes, an accepted answer pinned under the question             |

Each variation has **four pages**: the front page, a category page, a topic (thread) page and a composer for
a new topic. Twelve example pages in all, plus a redirect. The forum sits outside the console shell with its
own slim top bar and footer, is its own "Forum" section in the preview panel (after "Blog"), and is not in
the console's side navigation.

As with the other families, these are presentational components in `@kemo/ui` with host-injected data and
handlers; the preview app is the example host and holds the demo state.

## Goals, non-goals, anti-goals

Goals: one content model that all twelve pages render; the three variations differing in layout, furniture
and vocabulary, not in visual language; working filters, search, paging, replies, nested replies, reactions,
votes, accept, follow and topic creation in the preview, with state that survives navigation inside the
demo; light and dark themes; 375px to wide desktop; preview routes, panel entries, a guide under `docs/`,
gallery screenshots, unit tests and e2e.

Non-goals: Markdown or rich-text editing (bodies are typed blocks the host writes; new replies are plain
text), sign-in or sessions (the viewer is a prop), member profiles or a members page, moderation tools
(edit, delete, flag, lock, move), notifications, private messages, a real search index (search is a
client-side filter over the loaded topics), server paging, file uploads, localisation, SEO metadata beyond
the page title.

Anti-goals (it fails even if it works): inert controls in the preview (every visible button, link, chip or
toggle does something); state shown by colour alone (solved, accepted, pinned, staff all carry a word or a
glyph); the three variations drifting into three visual languages; a forum that reads like a console page
with the sidebar removed; the thread page losing its reading quality on a long thread (body lines over
about 75 characters, cramped leading); keyboard order that differs from reading order; hydration
mismatches from relative times (see "Time").

## Constraints

Unchanged from the earlier phases: Panda CSS 2.5 `panda lib` workflow; Park UI components synced from the
registry, never hand-edited; our files only under `src/pages/**`, `src/layouts/**`, `src/widgets/**`,
`src/lib/**`, `src/theme/tokens/{fonts,easings,gradients,chart}.ts`, `src/theme/radii.ts`; relative
`styled-system` imports inside the package (`../../../styled-system/*` from `src/pages/forum/`, Park
components from `../../components/ui`); tokens only, no raw colours outside `gradients.ts`; `'use client'`
where hooks are used; Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; lint
with zero warnings; Vitest + Testing Library for units, Playwright for the preview; one commit per task on
`main`, staged by explicit path (another session may be committing to `main`; never `git add -A`).

Lessons from the blog build that apply here: the theme's surface and border tokens are `canvas`,
`gray.surface.bg` and `border` (there is no `bg.default`, `bg.canvas` or `border.subtle`); Panda does not
extract style objects spread into JSX (use `cva` or `css()` maps; check `dist/panda/buildinfo.json` when a
class is missing); Park `Avatar` ignores `w` and `h` overrides (use its recipe sizes); inline code uses the
`code` font token; a sticky grid item in Chromium is held by the whole grid, not its cell; the `html
[data-hydrated]` marker is the e2e signal to wait for before the first interaction.

No new dependencies. Everything needed is already in the package (`lucide-react`, Park `Avatar`, `Badge`,
`Breadcrumb`, `Button`, `Card`, `Field`, `Input`, `Textarea`, `Select`, `TagsInput`, `Tabs`, `Menu`,
`Pagination`, `Tooltip`, `Code`, `Dialog`, react-hook-form + zod, the blog's `BlogProse`, `CopyLinkButton`
and `use-reveal`, the widgets' `EmptyState`).

## The look

Shared by all twelve pages. Sizes are from the mockups, drawn at roughly 85% scale; treat the mockups as the
reference for proportion and the tokens below as the reference for values.

- **Canvas**: `canvas`, cards and the top bar `gray.surface.bg`, text `fg.default`, secondary `fg.muted`,
  tertiary `fg.subtle`, hairlines `border`. Neutral accent, as everywhere else. Radii `l2`, no shadows.
- **Colour**: the only colour is Nightfall (`bgGradient: 'auth'`, forced dark via `className="dark"` as the
  blog does), in exactly these places: the Announcements board tile (Boards front page), the "Start a
  discussion" rail block (Discussions front and category pages), the hero band (Q&A front page), and the
  category accent swatches described below. The status palette is reserved for state and always comes with
  a word: solved and accepted answers in green (`green.2` surface, `green.11` text, `green.6` border, dark
  mode by token flip), "Needs info" in amber, "Announcement" in blue (a shipped palette), everything else
  neutral.
- **Category accent**: each category has an accent `1`–`6` mapping to `gradients.cover1` … `cover6` (the
  blog's cover tokens, reused, no new tokens). Boards uses it as the 1.75rem board tile behind the
  category's first letter; Discussions as the 0.4375rem square before a category name in the rail; Q&A does
  not use it. Derived from the category id when unset, the way blog covers derive from the slug.
- **Top bar** (`ForumLayout`): the same anatomy as `BlogLayout`, 3.5rem, bottom hairline, not sticky.
  Left: `logo` slot, `brand` semibold `sm`, "/ {section}" in `fg.subtle` (default section "Community"),
  brand and section link to the front page; then host `nav` links (`sm`, `fg.muted`, current `fg.default`
  medium with `aria-current="page"`). Right: a **search field** (Park `Input`, `sm`, about 14rem,
  placeholder per variation: "Search topics", "Search discussions"; the Q&A variation has no bar search
  because its hero carries one), a ghost "Sign in" button when `signInHref` is given, and the solid primary
  action linking to the composer, labelled per variation: "New topic", "New discussion", "Ask a question".
  Below `md` the nav links and the search field hide; the bar keeps brand, Sign in and the primary action,
  and the page that has a search box (front and category pages) shows one above its list instead. The
  bar's field is bound to the page's query on the front and category pages (see "Search"); on the topic
  and composer pages submitting it navigates to `searchHref(query)`, and when the host passes no
  `searchHref` those pages render no field at all, so it is never inert.
- **Footer**: top hairline, `xs` `fg.subtle`, a left slot for host-supplied links (the preview passes
  "Guidelines" and "Code of conduct", both to the pinned guidelines topic, and "Status" to `/maintenance`,
  so every footer link goes somewhere real) and a right slot (default "© {year} {brand}").
- **Avatars**: Park `Avatar` with initials fallback, recipe sizes only: `xs` in metadata lines and nested
  replies, `sm` on list rows and replies, `md` on the Boards author column and the Discussions original
  post.
- **Badges**: Park `Badge`, `sm`. Subtle for category and tag names; status badges as above; "Staff" solid
  (black on white, white on black in dark) after a staff member's name; "Pinned" subtle with a pin icon;
  "Author" subtle after the topic author's name on their own replies (Discussions and Q&A).
- **Counts**: tabular numerals; thousands with a comma ("3,902"); views abbreviated past 999 ("1.2k").
- **Time**: relative, computed from a `now` prop ("just now", "14 min ago", "2 h ago", "yesterday", "3 days
  ago", then "11 Nov 2026" past 30 days), inside `<time dateTime>` with the absolute UTC date-time in
  `title`. The Boards author column shows "Joined Mar 2026".
- **Post bodies**: typed blocks rendered by the blog's `BlogProse` with a new `size` prop (`md` as today, or
  `sm` for the forum: `sm` text, line height 1.6, block gap `3`, max width 40rem; the 68ch cap stays).
  Adding the prop must not change the blog's rendering or tests. Code blocks stay dark; inline code and
  links in a block are written by the host with Park `Code` and `Link`, as in the blog.

### Front page

**Boards** (mockup A). Max width 62.5rem, centred. Header row: title `h1` ("Kemo Community") and a
description on the left; on the right three stats (topics, posts, members: a big number over a muted
label) that stack under the title below `md`. Then one **section per `section` value**, in order of first
appearance: a column-header line (section name, "Topics", "Posts", "Latest") over the rows. A board row is
`tile + name (link) + description | topics | posts | latest post (avatar, title as a link to the topic,
author · time)`, hairline between rows. Below `md` the counts collapse into one muted line under the
description ("486 topics · 3,902 posts") and the latest post moves under it. Then **Latest**: a three-up
grid of outlined cards (status or kind badge, title link, author and reply count) for the three topics
with the newest `lastActivityAt`; one column below `sm`.

**Discussions feed** (mockup B). Max width 65rem; two columns from `lg` (feed, 14.75rem rail), one column
below with the rail's blocks after the feed except the call to action, which goes first. The page's `h1`
(the `title` prop) is visually hidden, as the mockup shows no page heading. Feed: a filter
row of chips ("Latest", "Top", "Unanswered", "Solved"; toggle buttons with `aria-pressed`, selected solid)
with the count of the current list on the right ("1,248 discussions" / "102 unanswered"). The pinned topic
(see "Pinned") sits first on `gray.surface.bg` when the filter is "Latest". A row is `avatar | title (link),
excerpt (two lines, clamped), meta line of category badge, status badge, author · time | counts column
(replies, then reactions total)`. Shows 8 rows, then "Load more" reveals 8 more (the blog's `use-reveal`).
Rail, in order: the Nightfall **"Start a discussion"** block (heading, sentence, white solid button to the
composer); **Categories**: "All" plus one row per category (`accent square + label | count`), each a link
to the category page, the current one marked; **This week**: three outlined cells (new topics, replies,
solved) computed from the data and `now`; **Top contributors**: the four authors with the most posts in
the loaded data (avatar, name, post count; a staff member shows "Staff" instead of the count).

**Q&A desk** (mockup C). Full-width Nightfall **hero band** with a centred column: `h1` "Ask the community",
a sentence with the answered ratio ("1,146 of 1,248 questions have an accepted answer. Search first, then
ask."; both numbers are sums over `categories` of `solvedCount` and `topicCount`), the search form (a
white `lg` input with a solid button; the input is labelled "Search questions"), and a "Popular:" line of
tag chips (the five most used tags; each sets the search query to that tag). Then, in a 62.5rem column:
**category cards** for the four categories with the most topics (name link, description, "{n} questions ·
{p}% answered" from the category's own `solvedCount` and `topicCount`, and a thin bar for the percentage,
labelled for assistive technology), four across from `lg`, two from `sm`, one below; a muted "Also:" line
of badge links for the remaining categories, in section order. With the mock counts this yields exactly the
mockup's split (Kemo Console, Deployments & GitOps, Access & SSO, Getting started as cards). Then two
columns from `md` (one below): **Needs an answer** (the five newest loaded questions without an accepted
answer; the header's open count is the sum over `categories` of `topicCount - solvedCount`) and
**Trending this week** (the five highest-voted
topics active in the last seven days). Both use the **question cell**: a 2.75rem cell with the answer
count over "answers" (green with a check when accepted, dashed when zero) beside title, badges, author
and time or votes.

### Search (front and category pages)

The search field (bar or hero) is a form; submitting it, or typing with a 300 ms debounce, sets the page's
`query`. With a non-empty query the page body is replaced by **results**: a line "{n} results for “{q}”"
(`h2`, with a "Clear" button that empties the query and returns focus to the field) and the matching
topics in the variation's own row style (Boards: topic rows as on its category page; Discussions: feed
rows; Q&A: question cells), newest activity first. A topic matches when the query's words all appear in
its title, excerpt, tags or category label, case-insensitive. No matches: the `EmptyState` widget ("No
topics match “{q}”" with the Clear action). The query is state on the page (controlled `query` /
`defaultQuery` / `onQueryChange`), the same stance as the blog's filter. A host that wants a link into a
search passes `searchHref(query)` (the preview maps it to `/forum/<variant>?q=…` and feeds the `q` search
param into `defaultQuery` on the front page); the Q&A hero's "Popular" chips set the query in place, and
the Q&A topic rail's "Hot tags" use `searchHref`.

### Category page

**Boards**: breadcrumb (Boards › category) from Park `Breadcrumb`; header with the accent tile, name
`h1`, description and the two counts; on the right the primary action. Then a bar: a count on the left
("486 topics"), a chip row ("All", "Unanswered", "Solved") on the right. Rows: `avatar | title (link), tag
badges, excerpt (one line, clamped) | replies | views | last activity (avatar, author · time)`; pinned
topics first with the "Pinned" badge; hairlines between. Park `Pagination`, 10 rows a page, hidden when one
page; changing the filter returns to page 1. Below `md` the counts fold into the meta line.

**Discussions feed**: the front page with the feed filtered to the category and the rail's category list
marking it; the feed's filter row gains the category name as a heading above it (`h1`, with the
description under it); the pinned topic shows only if it belongs to this category.

**Q&A desk**: breadcrumb (Questions › category), `h1` and description, the answered ratio line ("{solved}
of {n} questions have an accepted answer", from the category's counts); a bar with chips "Newest",
"Unanswered", "Votes" and the count; the list in question cells, 10 a page with `Pagination`; the primary
action on the right of the header. Below `md` as Boards.

### Topic page

All three: a breadcrumb (front › category › topic in Boards; front › category in the others), the topic
title as `h1`, the meta line, the posts, and the composer at the end. "Solved" is derived: a topic is solved
when any post is accepted. Everything the viewer can do is a host callback (see "Behaviour"); a callback
that is not passed hides its control.

**Boards** (thread mockup A). Max 62.5rem. Header: `h1` (`2xl`), meta line (status badge, category badge,
tag badges, "· {n} replies · {views} views · started {time} by {author}"); tools on the right: "Watch" /
"Watching" toggle, "Share" (copy link) and a solid "Reply" that scrolls to and focuses the composer. A
**post bar** above and below the list: "Posts {a}–{b} of {total}" and a pager (`Pagination`, 10 posts a
page; the original post is #1 and counts). A **post** is a two-column row from `md`: the author column
(9.25rem; `md` avatar, name, "Staff" or "Member", "Joined {month year}", "{n} posts") with a right
hairline, and the body column (header "#{n}" plus "· original post" on the first, time on the right; an
optional **quote** block above the body: the quoted author in medium weight and the quoted excerpt behind a
left rule; then the body; then the actions line: a reaction count button "👍 {n}" with `aria-pressed`,
"Quote" (attaches a removable quote block above the composer's field, showing "{author} wrote" and the
post's first paragraph, and focuses the field; the reply is sent with `quoteOf` set to that post's id, and
the host attaches the `quote` to the new post), "Reply" (focuses the composer), "Share" (copies the post's
link `#post-{id}`)). The accepted post keeps its place
and is tinted green with a "✓ Accepted answer · marked by {topic author}" label above its header. Below
`md` the author column becomes a header line (avatar, name, role, time).

**Discussions feed** (thread mockup B). Max 65rem; two columns from `lg` (thread, 14.75rem rail). Header:
breadcrumb, `h1` (`2xl`), meta (status badge, category badge, "· {avatar} {author} started {time} · {n}
replies · {p} participants"). The **original post** is an outlined card: header row (`md` avatar, name,
"Staff" when staff, time and "· edited" when `editedAt`), the body, then a **reactions row**: one pill per
emoji with its count (`aria-pressed` when the viewer reacted), plus a "+" pill that opens a small Park
`Menu` with the five allowed emoji (👍 🎉 ❤️ 👀 🚀). Then the **replies bar**: "{n} replies" `h2` and a
sort toggle "Oldest" / "Top" (segmented buttons, `aria-pressed`). **Replies**: a flat list of top-level
replies, each `sm` avatar | header (name, "Staff"/"Author" badge, time) | body | actions (reactions pills as
on the original post, "Reply" that opens an inline composer under it); **nested replies** (one level, by
`parentId`) render under their parent in a nested list behind a left hairline, indented 2.5rem, with `xs`
avatars; the inline composer for a nested reply posts with the top-level parent's id. The **marked answer**
(the accepted post) renders first regardless of sort, in a green outlined card with "✓ Answer · marked by
{topic author}", carrying its own nested replies. Then the composer (avatar beside it). Rail: Category
(name link and count), Labels (the tags as badges), Participants (avatars in a row with the count in the
label, up to 8 then "+n"), Notifications ("Subscribe" / "Subscribed ✓" toggle button), Related (up to
three: same-category topics with the most shared tags, then newest; each title link with "category · time"
beneath). Below `lg` the rail follows the posts.

**Q&A desk** (thread mockup C). Max 65rem; two columns from `lg` (question column, 14.75rem rail). Header:
breadcrumb, `h1` (`2xl`), meta: "Asked {time}", "Modified {time}", "Viewed {views}", status badge. The
**question**: a **vote column** (2.75rem: up button, score, down button; `aria-pressed` on the viewer's
vote; accessible names "Upvote, score 18" / "Downvote") beside the body, the tag badges, an actions line
("Share" copies the link, "Follow" toggle), a right-aligned **author card** ("asked {time}", `sm` avatar,
name, "{rep} rep" or "Staff") and **comments**: the posts whose `parentId` is this post, as a thin list
(hairline rows of "{name} {first paragraph} · {time}") with an "Add a comment" button that swaps to a
one-line input (required, at most 600 characters) with Post and Cancel, posting through `onReply` with
that `parentId`; a polite status says "Comment posted.". Then the **answers bar**: "{n} answers" `h2`
(the top-level posts after the question) and a sort segment ("Votes", "Oldest", "Newest"). **Answers**: the
same anatomy as the question (vote column, body, actions, author card "answered {time}", comments); the
accepted answer first,
in a green outlined box with "✓ Accepted answer", and a filled check under its vote column; when the host
passes `onAcceptAnswer`, every answer's check is a button ("Accept this answer" / "Accepted answer", the
accepted one `aria-pressed`). Then **"Your answer"** (`h2`) over the composer. Rail: Related questions (up
to four, same rule as Discussions' Related, each with its answer-count cell, green when solved), Linked
docs (host-supplied links, omitted when none), Hot tags (the five most used tags across `related` plus
this topic, as badge links through `searchHref(tag)`; the block is omitted when the host passes no
`searchHref`).

### Composer page

One shared component with the variation's chrome and words. A 40rem column: `h1` ("New topic", "New
discussion", "Ask a question"), a short sentence of guidance, then a form (react-hook-form + zod, Park
`Field`s): **Title** (required, 10–120 characters after trimming; the Q&A variation's label is "Question"
and its hint says to end with a question mark, not enforced), **Category** (Park `Select`, required, the
categories in their section order; preset when the page is reached from a category), **Tags** (Park
`TagsInput`, up to five, lower-cased, duplicates dropped), **Body** (`Textarea`, 8 rows, required, at least
20 characters; hint "Plain text. Blank line starts a new paragraph. Include the console version."), and a
footer with "Cancel" (a link to the category page when preset, else the front page) and the solid submit
("Post topic", "Start discussion", "Post your question"). Submit calls `onCreateTopic(values)`; while
pending the button shows its loading state; on reject an inline `FormError` shows the message; on resolve
the host navigates (the page does nothing further). Validation messages appear under their field and the
first invalid field takes focus.

### Reply composer

Shared by the three topic pages. A `Textarea` (4 rows; placeholder "Share what you tried and the console
version." in Boards, "Add to the discussion" in Discussions, "Answer the question; comments go under the
post they are about." in Q&A), a hint "Plain text. Be kind." on the left of the footer and the solid submit
on the right ("Post reply", "Comment", "Post your answer"). Required, at least 2 characters after trimming,
at most 5,000. The text becomes paragraphs on blank lines; the host receives `{ body: string, parentId?,
quoteOf? }`. While pending the button is loading; on resolve the field clears and a polite status says
"Reply posted." (Q&A: "Answer posted."); on reject an inline alert shows the message or "Your reply could
not be posted. Try again." and the text is kept. The page does not add the post itself; the host passes the
new `posts`. Without `onReply` the composer and every "Reply"/"Quote" control are absent, and the topic
page shows a muted line "Sign in to reply." with a link when `signInHref` is given.

## Behaviour

- **Filters and sorts** are client-side and announced: a visually hidden `aria-live="polite"` region says
  "{n} topics" / "{n} discussions" / "{n} questions" (or "No … yet") when the list changes. An empty list
  shows `EmptyState` with a sensible action ("Show all" or the primary action).
- **Pinned**: a topic with `pinned: true` leads the Latest feed, the Boards category rows and the Q&A
  Newest list, with the "Pinned" badge; at most one pinned topic is expected per category.
- **Counts**: `replyCount` is derived from `posts` when the topic carries them (`posts.length - 1`), else
  the stored `replyCount` (lists hold topics without posts). Reaction totals likewise.
- **Reactions**: `onReact(postId, emoji)` toggles; the page reflects `reactions[].reacted` from data.
  Allowed emoji are the five above; a post shows only emoji with a count above zero.
- **Votes**: `onVote(postId, direction)` with `'up' | 'down' | null` (null clears); the page shows the
  viewer's current vote from `votes.viewer`. Voting on one's own post is allowed in the demo (no viewer
  identity rules beyond what the host passes).
- **Accept**: `onAcceptAnswer(postId)`; the host decides who may accept (the preview allows it when the
  viewer is the topic's author or staff). Accepting a different answer moves the mark.
- **Follow / Watch / Subscribe**: `onFollow(topicId, following)`; the page reflects `topic.following`.
- **Copy link / Share**: the blog's `CopyLinkButton` behaviour (label "Copied" for 2 s, polite
  announcement, "Copy failed" on rejection); a post's Share copies `{href}#post-{id}`.
- **One post model, three readings**: a post with a `parentId` is a nested reply in Discussions, a comment
  under its parent in Q&A, and an ordinary numbered post in Boards (which shows the thread flat, in time
  order). Q&A's "Add a comment" and Discussions' nested "Reply" both call `onReply` with a `parentId`;
  there is no separate comment type or callback.
- **Links**: `topicHref(topic)`, `categoryHref(category)`, `composerHref(category?)`, `indexHref`,
  `signInHref`, supplied by the host; `linkComponent` as on every other page (default: a bare anchor).
- **Viewer**: `viewer?: ForumUser` is who is signed in for the purposes of "Author"/"Staff" labelling of
  new posts and the composer's avatar. Without it the reply composer still works (the host stamps the
  author).
- **Now**: every relative time is computed from the `now` prop (ISO string, required on every page), never
  from `Date.now()`, so server and client render the same text. The preview holds `now` in its demo clock.
- **Order rules**: Latest by `lastActivityAt` desc; Top by votes score desc then activity; Unanswered =
  `replyCount === 0` (Boards, Discussions) or no accepted answer (Q&A: "Needs an answer"); Solved = has an
  accepted post; Newest by `createdAt` desc; Trending = topics with activity in the last seven days by
  votes desc; "This week" counts topics created, posts posted and topics solved (by the accepted post's
  time) in the last seven days.

## Components and API (`packages/ui/src/pages/forum/`)

Names are fixed; internals are the builder's. One file per variation page; shared parts in their own files.
Variation-specific components stay internal (not exported), as the blog's do.

```ts
export type ForumVariant = 'boards' | 'discussions' | 'qa'
/** id → the exact variation title: Boards, Discussions feed, Q&A desk. */
export const forumVariants: Record<ForumVariant, { title: string; description: string }>

export interface ForumUser {
  id: string
  name: string
  avatarSrc?: string
  role?: 'staff' | 'member' // default member
  joinedAt?: string // ISO 8601; Boards author column
  postCount?: number // Boards author column, Discussions top contributors
  reputation?: number // Q&A author cards
}
export interface ForumCategory {
  id: string // also the URL segment
  label: string
  description: string
  section: string // "Product", "Community"; Boards groups by it
  topicCount: number
  postCount: number
  solvedCount: number // topics with an accepted answer; Q&A ratios and the open count
  accent?: 1 | 2 | 3 | 4 | 5 | 6
}
export interface ForumTag {
  id: string // lower-case, also the chip text
}
export type ForumBlock = Extract<
  BlogBlock,
  | { type: 'paragraph' }
  | { type: 'list' }
  | { type: 'quote' }
  | { type: 'code' }
  | { type: 'callout' }
>
export interface ForumReaction {
  emoji: '👍' | '🎉' | '❤️' | '👀' | '🚀'
  count: number
  reacted?: boolean // by the viewer
}
export interface ForumPost {
  id: string
  author: ForumUser
  postedAt: string
  editedAt?: string
  body: ForumBlock[]
  /** One level: a nested reply (Discussions) or a comment (Q&A) on the top-level post `parentId`. */
  parentId?: string
  quote?: { author: ForumUser; excerpt: string } // Boards
  reactions?: ForumReaction[]
  votes?: { score: number; viewer?: 'up' | 'down' } // Q&A
  accepted?: boolean // at most one per topic; never on a post with a parentId
}
export interface ForumTopic {
  id: string
  slug: string // unique; URL segment
  title: string
  excerpt: string // one or two sentences for lists
  categoryId: string
  author: ForumUser
  createdAt: string
  lastActivityAt: string
  replyCount: number // used when `posts` is absent
  viewCount: number
  votes?: { score: number; viewer?: 'up' | 'down' } // the question's votes (Q&A); Top sort elsewhere
  reactionTotal?: number // used when `posts` is absent
  tags: string[]
  kind?: 'question' | 'discussion' | 'announcement' // default question in qa, discussion elsewhere
  status?: 'needs-info' // "Solved" is derived from posts; this is the only explicit status
  pinned?: boolean
  following?: boolean // by the viewer
  participants?: ForumUser[] // Discussions rail; derived from posts when absent
  posts?: ForumPost[] // the first post is the topic body; absent on list rows
}

interface ForumChromeProps {
  variant: ForumVariant
  logo?: ReactNode
  brand: string
  section?: string // default "Community"
  nav?: { label: string; href: string; current?: boolean }[]
  footer?: ReactNode // replaces the default footer left slot
  year?: number
  now: string // ISO 8601; every relative time is computed from it
  viewer?: ForumUser
  linkComponent?: LinkComponent
  indexHref: string
  signInHref?: string
  categoryHref: (category: ForumCategory) => string
  topicHref: (topic: ForumTopic) => string
  composerHref: (category?: ForumCategory) => string
  searchHref?: (query: string) => string // a link into a search on the front page (Q&A hot tags)
}

export interface ForumIndexPageProps extends ForumChromeProps {
  title: string // Boards h1; Discussions and Q&A use it as the document-level name only
  description?: ReactNode
  categories: ForumCategory[]
  topics: ForumTopic[] // list rows (no posts needed)
  memberCount?: number // Boards stats
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
}
export interface ForumCategoryPageProps extends ForumChromeProps {
  category: ForumCategory
  categories: ForumCategory[] // Discussions rail
  topics: ForumTopic[] // all topics, or only this category's; the page filters by categoryId
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
}
export interface ForumTopicPageProps extends ForumChromeProps {
  topic: ForumTopic // with `posts`
  category: ForumCategory
  related?: ForumTopic[] // candidates for Related; the page ranks them
  docs?: { label: string; href: string; description?: string }[] // Q&A "Linked docs"
  onReply?: (input: { body: string; parentId?: string; quoteOf?: string }) => Promise<void>
  onReact?: (postId: string, emoji: ForumReaction['emoji']) => Promise<void>
  onVote?: (postId: string, direction: 'up' | 'down' | null) => Promise<void>
  onAcceptAnswer?: (postId: string) => Promise<void>
  onFollow?: (topicId: string, following: boolean) => Promise<void>
}
export interface ForumComposerPageProps extends ForumChromeProps {
  categories: ForumCategory[]
  defaultCategoryId?: string
  cancelHref: string
  onCreateTopic: (values: {
    title: string
    categoryId: string
    tags: string[]
    body: string
  }) => Promise<void>
}
```

Exports: `ForumIndexPage`, `ForumCategoryPage`, `ForumTopicPage`, `ForumComposerPage` (each switches on
`variant` to its variation's component or chrome), `ForumLayout`, `ReplyComposer`, `forumVariants`, the
helpers `relativeTime(iso, now)`, `isSolved(topic)`, `searchTopics(topics, categories, query)`, and the
types above. `packages/ui/src/index.ts` gains `export * from './pages/forum'`. `BlogProse` gains the `size`
prop (a non-breaking addition to the blog's public API, documented in `docs/blog-pages.md`).

Accessibility: `header` / `main` / `footer` landmarks from `ForumLayout`; exactly one `h1` per page; lists
of topics are `ul` of `article`s with the title as a heading one level below the section's; posts are
`article`s with `id="post-{id}"`; nested replies are a nested `ul`; rails are `aside` with labels
("Categories", "About this discussion", "Related"); vote and reaction buttons carry counts in their
accessible names and `aria-pressed`; every list change, post, comment and copy is announced through a
polite live region; all interactive targets keyboard-reachable with the standard focus ring; text
contrast AA in both themes and on Nightfall; the green accepted surfaces keep AA for their text.

## Preview

Routes (App Router):

- `/forum` redirects to `/forum/boards`;
- `/forum/[variant]` renders `ForumIndexPage`; an unknown variant calls `notFound()`; `?q=<text>` is
  passed as `defaultQuery`;
- `/forum/[variant]/c/[category]` renders `ForumCategoryPage`; unknown category → `notFound()`;
- `/forum/[variant]/t/[slug]` renders `ForumTopicPage`; unknown slug → the client-side 404 (created
  topics live in client state, as the Deployments demo does);
- `/forum/[variant]/new` renders `ForumComposerPage`; `?category=<id>` presets the category.

Demo state lives in a client provider under `apps/preview/src/app/forum/layout.tsx` (a reducer, the
Deployments pattern), holding categories, topics with their posts, the viewer and the **demo clock** (`now`
starts at the seed's fixed instant, ticks every 30 s after mount, and advances by a few seconds on every
mutation so a new post reads "just now" then ages). Mutations: reply (appends a post, bumps counts and
activity), react, vote, accept, follow, comment, create topic (slug from the title plus a counter, then
`router.push` to the new topic). Each handler waits a short mock delay and rejects when the text contains
"fail" (the house convention), so error states can be seen. A `ForumDemo` client component under
`apps/preview/src/components/forum/` wires each page to the store, the `BrandMark`, `NextLink` and the
hrefs; the viewer is Jonas Lindqvist (the sample thread's author) so accept and "Author" can be seen.

Mock content (`apps/preview/src/lib/mock-forum.tsx`): the Kemo Community. Eight categories in two sections
exactly as drawn (Product: Announcements, Kemo Console, Deployments & GitOps, Access & SSO; Community:
Getting started, Show and tell, Feature requests, Bug reports) with the counts from the mockup. Eight
users (Priya Raman is staff; the others members with joined dates and post counts). Twenty-eight topics,
at least twelve in Kemo Console so its category page pages at 10, spread over the last 60 days with the
titles, excerpts, authors and times from the mockups; every category's `solvedCount` is set so the ratios
read like the mockup (1,146 of 1,248 overall). One pinned Announcements topic ("Forum guidelines and how to
ask a question that gets answered") with a full body; the sample thread ("Schema browser shows no CRD
fields after 4.2") with thirteen posts reconciled from the three thread mockups into one set: the original
post; Dan's "which version?" (top-level); Jonas's "4.2.1" nested under Dan, with a `quote` of Dan for the
Boards view; Priya's accepted answer with reactions; Jonas's "that was it" and Mei's note nested under
Priya; Tomas's "same here" (top-level); plus six short top-level replies dated after, so the Boards pager
has a second page. Because one dataset serves three readings, the Q&A view shows Dan's exchange as a short
answer with a comment rather than as comments on the question, which is the one place the built page
differs from the Q&A thread mockup (our call). Four more topics with full bodies and two to five posts (one
with "Needs info", one with an announcement kind, one unsolved question, one show-and-tell); the rest
list-only. Tags across topics:
yaml-editor, crd, 4.2, oidc, groups, rbac, scaling, events, gitops, dark-mode, show-and-tell. Linked docs
for the sample thread: the preview passes one entry, "Registering schemas" with the description "FAQ", linking
to `/faq` (the only documentation-like page the preview has). People and events are fictional.

Preview panel: a new section titled "Forum" after "Blog" with nine entries: for each variation, in order
Boards, Discussions feed, Q&A desk: "{title}" → the front page, "{title}: category" → Kemo Console,
"{title}: topic" → the sample thread. The composer is reached from the primary action.

Gallery: a `forum` family in `apps/preview/gallery/manifest.ts` with the twelve routes (both themes by
default) and `heading` set on the topic entries, guide `../forum-pages.md`. Capture it with
`GALLERY_ONLY=forum pnpm gallery` at the end of the phase and commit the PNGs with the index.

Docs: `docs/forum-pages.md` in the style of the blog guide (variations table, the content model, a minimal
host example, the behaviours and what is derived), a "Screenshots" line, a README Documentation row and
roadmap item 8 ("Done: forum pages …"; publishing becomes 9), and a sentence in `docs/blog-pages.md` for
`BlogProse`'s `size`.

## Tests

Unit (Vitest + Testing Library), next to the components:

- helpers: `relativeTime` bands and the 30-day switch to the absolute date; `isSolved`; `searchTopics`
  (all words, any field, case); order rules (Latest, Top, Unanswered, Solved, Newest, Trending, This week,
  top contributors, Related ranking, the four card categories); answered ratios and the open count from
  `solvedCount`; reply-count derivation; nested grouping by `parentId`; paragraphs from blank lines;
- `ForumLayout`: brand link, nav current, search submit and debounce, Sign in only with `signInHref`,
  primary label per variation, small-screen hiding;
- each front page: one `h1`, every expected topic once, sections or cards, filters announce, Load more,
  search results and empty state with Clear returning focus, This week and Top contributors derived,
  category links;
- each category page: filter, pagination resets on filter change, pinned first, breadcrumb;
- each topic page: one `h1`, posts in order, accepted post placement and label, pager (Boards), nesting and
  sort (Discussions), vote column and comments (Q&A), reactions toggle with `aria-pressed`, follow toggle,
  copy link, composer pending / success (field cleared, status) / rejection (text kept), Quote prefills,
  Reply focuses, absent composer without `onReply` with the sign-in line, every callback-driven control
  absent without its callback, a plain-text reply never renders as HTML;
- composer: validation per field with focus on the first invalid, tags limit and normalisation, preset
  category, pending, rejection, cancel link;
- `BlogProse` `size="sm"`: renders the five block types; the blog's existing tests unchanged.

e2e (Playwright, new `apps/preview/e2e/forum.spec.ts`): the nine panel entries load with the right `h1` and
no console errors, plus the three composers; front → category → topic → back in each variation; filters in
each list; search with results and with none in each variation; pagination on the Boards and Q&A category
pages and the Boards thread; a reply in each variation (the post appears, the status is announced); a
nested reply in Discussions; a reaction, a vote, accept and follow; a comment in Q&A; creating a topic in
each variation lands on the new topic and it appears in the lists; a "fail" reply shows the error and
keeps the text; `/forum` redirect; unknown slug shows the 404 page; no horizontal scroll at 375px on all
twelve pages; dark theme smoke on one page per variation. e2e runs against a built preview on :3100 with a
scratch Playwright config, never the owner's dev server on :3000.

## Decisions

1. Three variations, all built, titled exactly "Boards", "Discussions feed", "Q&A desk" (owner).
2. Each variation is a front page, a category page, a topic page and a composer: twelve example pages
   (owner, by approving the front and thread rounds and the played-back category and composer).
3. The forum is outside the console shell and its navigation, and is its own "Forum" section in the preview
   panel after "Blog" (owner).
4. Layouts as drawn in the two mockup files (owner approved both rounds).

## Our calls (not yet seen by the owner beyond the mockups)

1. One `variant` prop on four page components, rather than twelve named components.
2. Post bodies reuse the blog's block types and `BlogProse` (with a new `size`), so the design system has
   one prose renderer; new replies are plain text turned into paragraphs.
3. Search is a client-side filter with a results view on the front and category pages; no search page or
   route.
4. The mockups' secondary nav items ("Latest", "Unanswered", "Members", "Categories", "Topics", "Docs") are
   not pages; the preview's nav carries the front-page link only (Discussions adds "Categories" as an
   anchor to its rail). "Following" and the sort menu on the Discussions feed are dropped (no viewer
   following data beyond `following`; the chips already define order). Editor toolbars and "Preview" tabs
   are dropped (plain text).
5. Nine panel entries; the composer is reached from the primary action.
6. Both colour themes; the mockups showed light only.
7. Routes `/forum/<variation>`, `/forum/<variation>/c/<category>`, `/forum/<variation>/t/<slug>`,
   `/forum/<variation>/new`; `/forum` redirects to Boards.
8. Demo state in a layout-level provider with the Deployments demo clock, so replies and created topics
   survive navigation within the preview.
9. Relative times from a required `now` prop; absolute UTC in `title`.
10. "Solved" is derived from an accepted post; "Needs info" is the only explicit status.
11. Category accents reuse the blog's cover gradient tokens; no new tokens.
12. Q&A "Popular" chips set the front page's query in place; "Hot tags" on the topic page are links
    through an optional `searchHref`, and the preview maps that to `?q=` on the front page (the one place
    a query rides in the URL, as a link target, not as the page's state).
13. Footer links in the preview point at real pages: the guidelines topic and `/maintenance`.
14. Twenty-eight sample topics; the sample thread has twelve replies so the Boards thread pages at 10.
15. Category pages page at 10 rows (so the twelve Kemo Console topics show a pager; 20 would have hidden
    it), matching the Boards thread's 10 posts a page.
16. `ForumCategory.solvedCount` feeds every answered ratio and the open count; computing them from the 28
    loaded topics would contradict the totals shown beside them.
17. Q&A category cards are the four categories with the most topics, which reproduces the approved mockup
    without a flag in the content model; the rest go in the "Also:" line.
18. The top bar's search field navigates through `searchHref` on the topic and composer pages and is
    absent there when the host passes none, so no page carries an inert field; the preview passes
    `searchHref` everywhere.
19. One post model: a `parentId` makes a post a nested reply (Discussions), a comment (Q&A) or just the
    next post (Boards); there is no comment type. The sample thread's Q&A reading therefore differs from
    its mockup in one spot (see "Mock content").

## Left to the builder

File split inside `pages/forum/`; exact token choices where the mockup gives pixels; the clamp technique for
excerpts; the debounce implementation; the slug and counter scheme for created topics; how the Discussions
"+" reaction menu is keyed; the exact copy of the guidance sentence on each composer; test file
organisation; whether the three variations share internal row components (they should where the row is the
same shape); the bodies of the topics not drawn; the breakpoints' fine detail between the stated layouts.
