# Forum pages

A public community forum, presentational like the other families: categories, topics and posts come
in as props, the host supplies the routes, `linkComponent`, the clock (`now`) and what happens on a
reply, a reaction, a vote, an accepted answer, a follow and a new topic. It is the first family that
is interactive at its core, and it sits outside the console shell with its own slim top bar and
footer. Three variations of the same four pages (front page, category page, topic page and
composer), picked with `variant`:

Screenshots: [gallery](gallery/README.md#forum-pages).

| `variant`     | Title            | Front page                                                         | Topic page                                                      |
| ------------- | ---------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| `boards`      | Boards           | Boards grouped by section with counts and latest post, then Latest | Numbered posts in time order beside an author column, 10 a page |
| `discussions` | Discussions feed | One feed with filter chips and "Load more", beside a rail          | The original post as a card with reactions, replies nested once |
| `qa`          | Q&A desk         | Search hero, four category cards, Needs an answer and Trending     | Votes and comments, the accepted answer first, "Your answer"    |

Exports from `@kemo/ui`: `ForumIndexPage`, `ForumCategoryPage`, `ForumTopicPage` and
`ForumComposerPage` (each renders the variation named by `variant`; the composer is one page in the
variation's words), `ForumLayout` (the top bar and footer), `ReplyComposer` (the reply form, or the
one-line comment form), `forumVariants` (the ids, titles and descriptions above), `vocabulary` (each
variation's words: the primary action, the search label, the composer's heading and submit, the
reply's submit and status, the follow labels), the helpers `relativeTime(iso, now)`,
`isSolved(topic)`, `searchTopics(topics, categories, query)`, `paragraphsOf(text)` (plain text to
paragraph blocks, split on blank lines) and `groupReplies(posts)` (the original post, the posts
replying to it, and the top-level replies with theirs), the smaller readers and orderings the pages
use (`replyCountOf`, `sortTopics`, `answeredRatio` and the rest of `pages/forum/content.ts`), and
the types `ForumVariant`, `ForumUser`, `ForumCategory`, `ForumTopic`, `ForumPost`, `ForumBlock`,
`ForumReaction`, `ForumTag`, `ReactionEmoji`, `VoteDirection`, `ListFilter`, `ForumChromeProps`
(the props every page shares), `ForumIndexPageProps`, `ForumCategoryPageProps`,
`ForumTopicPageProps`, `ForumComposerPageProps`, `ForumLayoutProps` and `ReplyComposerProps`.

The content model is four types, and a post's body is the blog's typed blocks:

```ts
interface ForumCategory {
  id: string // unique; also the URL segment
  label: string
  description: string
  section: string // "Product", "Community"; Boards groups by it, in order of first appearance
  topicCount: number // the category's totals, shown as they are
  postCount: number
  solvedCount: number // topics with an accepted answer; every answered ratio and open count
  accent?: 1 | 2 | 3 | 4 | 5 | 6 // the tile's gradient; picked from the id when omitted
}
interface ForumTopic {
  id: string
  slug: string // unique; the URL segment
  title: string
  excerpt: string // one or two sentences for the lists
  categoryId: string
  author: ForumUser
  createdAt: string // ISO 8601; Newest and Needs an answer order by it
  lastActivityAt: string // Latest orders by it
  replyCount: number // used when `posts` is absent
  viewCount: number
  votes?: { score: number; viewer?: 'up' | 'down' } // the question's votes; Top and Votes use it
  reactionTotal?: number // used when `posts` is absent
  tags: string[] // lower-case
  kind?: 'question' | 'discussion' | 'announcement' // default question in Q&A, discussion elsewhere
  status?: 'needs-info' // the only explicit status: "Solved" is derived
  pinned?: boolean // leads Latest, Newest and the Boards category rows
  following?: boolean // by the viewer
  participants?: ForumUser[] // the Discussions rail; derived from `posts` when absent
  posts?: ForumPost[] // the first is the topic's body; list rows may leave them out
}
interface ForumPost {
  id: string // the page anchors it as `#post-{id}`
  author: ForumUser
  postedAt: string
  editedAt?: string // "· edited"
  body: ForumBlock[] // paragraph | list | quote | code | callout (the blog's blocks)
  parentId?: string // one level: a nested reply (Discussions) or a comment (Q&A)
  quote?: { author: ForumUser; excerpt: string } // Boards' quote block above the body
  reactions?: ForumReaction[] // { emoji: '👍' | '🎉' | '❤️' | '👀' | '🚀', count, reacted? }
  votes?: { score: number; viewer?: 'up' | 'down' } // Q&A answers
  accepted?: boolean // at most one per topic, never on a post with a parentId
}
interface ForumUser {
  id: string
  name: string
  avatarSrc?: string // the initials when absent
  role?: 'staff' | 'member' // staff carries a "Staff" badge
  joinedAt?: string // the Boards author column
  postCount?: number // the Boards author column
  reputation?: number // the Q&A author cards
}
```

What the pages derive rather than read:

- **Solved**: a topic is solved when one of its posts is `accepted` (`isSolved`); there is no
  solved flag, so a list row that should read "Solved" needs at least its accepted post.
- **Counts**: when a topic carries `posts`, its reply count is `posts.length - 1`, its reaction
  total the sum over its posts and its participants their authors; without `posts` the pages use
  `replyCount`, `reactionTotal` and `participants`. A Q&A answer count is the top-level posts after
  the question.
- **Times**: every relative time ("just now", "12 min ago", "3 h ago", "yesterday", "5 days ago",
  then the date after 30 days) is computed from the required `now`, never from the wall clock, so
  the server and the browser print the same text. Each `<time>` carries the absolute UTC time in its
  `title`.
- **Answered ratios**: the Q&A hero ("1,146 of 1,248 questions have an accepted answer"), each
  category card's percentage, the category page's ratio line and the "102 open" count come from the
  categories' `solvedCount` and `topicCount`, not from the loaded topics, so they agree with the
  totals beside them.
- **The four Q&A category cards** are the four categories with the most topics; the rest go in the
  "Also:" line. Trending (topics active in the last seven days, by votes), Needs an answer (the
  newest unsolved), This week, Top contributors and Related are computed from the loaded topics and
  `now`.
- **One post model, three readings**: a post with a `parentId` is a nested reply under its parent in
  Discussions, a comment under its post in Q&A, and just the next numbered post in Boards, which
  shows the thread flat in time order. A post whose parent is the original post sits under the
  original card in Discussions and is a comment on the question in Q&A. There is no comment type:
  Discussions' "Reply" and Q&A's "Add a comment" both call `onReply` with a `parentId`.

How the pages behave:

- **Filters** are client-side chips (toggle buttons with `aria-pressed`): All, Unanswered and Solved
  on the Boards category page; Latest, Top, Unanswered and Solved on both Discussions lists; Newest,
  Unanswered and Votes on the Q&A category page. Unanswered means no replies in Boards and
  Discussions, and no accepted answer in Q&A. A visually hidden polite live region announces the
  count when the list changes.
- **Search** is a client-side filter on the front and category pages: typing (300 ms debounce) or
  submitting sets the query, a topic matches when every word appears in its title, excerpt, tags or
  category label (any case), and the results replace the page's body under "{n} results for “q”"
  with a Clear button that returns focus to the field; no match shows "No topics match “q”" (or
  discussions, or questions). A category page searches its own topics in Discussions and Q&A, and
  every topic in Boards (whose results show each topic's category). Boards and Discussions put the
  field in the top bar from `md` and above the list below it; Q&A in its hero, and above the list on
  its category page. The query is page state: pass `query` and `onQueryChange` to control it, or
  `defaultQuery` to start from one. `searchHref(query)` is a link into a search: on the Boards and
  Discussions topic and composer pages the top bar's field navigates to it, and the Q&A topic rail's
  "Hot tags" link through it; without it both are absent.
- **Paging**: the Boards and Q&A category pages show 10 rows a page with a pager (a filter change
  returns to page 1), the Boards thread 10 posts a page under "Posts 1–10 of 13" above and below,
  and the Discussions feed 8 rows and "Load more".
- **Replies**: `onReply({ body, parentId?, quoteOf? })`. The composer takes 2 to 5,000 characters of
  plain text (paragraphs on blank lines, never rendered as HTML); while it waits the button spins,
  when it resolves the field clears and a polite status says "Reply posted." ("Answer posted." in
  Q&A), and when it rejects the `Error`'s message shows and the text stays. The page does not add
  the post: the host passes the topic back with it. In Boards the new post is the last one, so on a
  thread longer than a page it lands on the last page. Boards' "Quote" attaches a removable quote
  and sends `quoteOf` (the host adds the `quote` to the new post); Discussions' "Reply" opens an
  inline composer that posts with the top-level reply's id; Q&A's "Add a comment" opens a one-line
  field (1 to 600 characters) and announces "Comment posted.".
- **Reactions**: `onReact(postId, emoji)` toggles the viewer's reaction; pills carry the count in
  their name ("👍 4, react") and `aria-pressed` from `reacted`. Discussions shows every emoji with a
  count and a "+" menu of the five; Boards a single 👍 count; Q&A has votes instead.
- **Votes** (Q&A): `onVote(postId, 'up' | 'down' | null)`; pressing the pressed arrow again sends
  `null`. The question's arrows show `topic.votes` and send the first post's id.
- **Accept**: `onAcceptAnswer(postId)` turns every Q&A answer's check into a button ("Accept this
  answer" / "Accepted answer"). The host decides who may accept: pass it only when the viewer is the
  asker or staff. The accepted answer leads the answers in Q&A and the replies in Discussions, and
  is tinted in place in Boards.
- **Follow**: `onFollow(topicId, following)` toggles "Watch" / "Watching" (Boards), "Subscribe" /
  "Subscribed ✓" (Discussions) or "Follow" / "Following" (Q&A), shown from `topic.following`.
- **Composer**: Title ("Question" in Q&A, with a hint to end on a question mark) of 10 to 120
  characters after trimming, a required Category (`defaultCategoryId` presets it), up to five Tags
  (lower-cased, duplicates dropped) and a Body of at least 20 characters. Messages appear under
  their fields and the first invalid field takes focus. On submit `onCreateTopic(values)` receives
  `{ title, categoryId, tags, body }`; it resolves and the host navigates (the page does nothing
  more), or rejects and its message shows above the buttons. Cancel links to `cancelHref`.

A control whose callback is missing is absent: without `onReply` the composer, Quote and Reply go
and the page says "Sign in to reply." ("Sign in to answer." in Q&A; a link with `signInHref`).
`viewer` is who is signed in: the reply composer shows their avatar, and the host stamps them as the
author of what they post. A host wires the pages like this (the preview does it in
`apps/preview/src/components/forum/forum-demo.tsx`). As with the blog, the wiring lives in a
`'use client'` component, since the hrefs, `linkComponent` and the handlers are functions; a server
page loads the data and `now` and renders it.

```tsx
'use client'
import { type ForumChromeProps, type ForumUser, ForumIndexPage, ForumTopicPage } from '@kemo/ui'
import NextLink from 'next/link'

// `now` comes from the server page (when it loaded the data), so both renders print the same ages.
const chrome = (now: string, viewer?: ForumUser): ForumChromeProps => ({
  variant: 'qa',
  brand: 'Kemo',
  now,
  viewer,
  linkComponent: NextLink,
  indexHref: '/forum',
  signInHref: '/login',
  categoryHref: (category) => `/forum/c/${category.id}`,
  topicHref: (topic) => `/forum/t/${topic.slug}`,
  composerHref: (category) => (category ? `/forum/new?category=${category.id}` : '/forum/new'),
  searchHref: (query) => `/forum?q=${encodeURIComponent(query)}`,
})

<ForumIndexPage {...chrome(now)} title="Kemo Community" categories={categories} topics={topics} />
<ForumTopicPage
  {...chrome(now, viewer)}
  topic={topic}
  category={category}
  related={topics}
  onReply={async (input) => setTopic(await api.reply(topic.id, input))} // throw to fail
  onVote={async (postId, direction) => setTopic(await api.vote(postId, direction))}
  onAcceptAnswer={
    viewer?.id === topic.author.id
      ? async (postId) => setTopic(await api.accept(topic.id, postId))
      : undefined
  }
  onFollow={async (topicId, following) => setTopic(await api.follow(topicId, following))}
/>
```

`title` is the Boards `h1`, with `description` under it; the Discussions front page uses it as a
visually hidden `h1`, and Q&A's hero says "Ask the community". `memberCount` fills the third Boards
stat. `nav` lists the top bar's links (shown from `md`), `section` follows the brand ("Community" by
default; hidden below `sm`), `footer` fills the left of the footer row and `year` pins its year in a
statically generated page.

Not included: Markdown or rich-text editing, sign-in and sessions, member profiles, moderation
(edit, delete, flag, lock, move), notifications, private messages, a search index or server paging,
and uploads.

In the preview, `/forum` redirects to `/forum/boards`; `/forum/<variation>` is the front page
(`?q=` starts a search), `/forum/<variation>/c/<category>` a category, `/forum/<variation>/t/<slug>`
a topic and `/forum/<variation>/new` the composer (`?category=` presets it), for the three
variations. The content is in `apps/preview/src/lib/mock-forum.tsx`: the Kemo Community, with eight
categories in two sections, eight people and 28 topics, among them the pinned guidelines and the
sample thread "Schema browser shows no CRD fields after 4.2" with thirteen posts. The demo's state
is a reducer (`apps/preview/src/lib/forum-reducer.ts`) held by `ForumDemoShell`
(`apps/preview/src/components/forum/forum-demo-shell.tsx`) in
`apps/preview/src/app/forum/layout.tsx`, above every forum page and variation, so a reply or a new
topic survives a trip to another page or variation (a reload starts over). Its clock never reads
the wall clock: `now` starts at the seed's fixed instant, moves 3 s with every change, so a new post
reads "just now", and 30 s every 30 s while the page is visible, so the ages move. Each save waits
300 ms, and a reply, comment or topic whose text contains "fail" is rejected with "The forum could
not save that. Try again.", so the error states can be tried. The viewer is Jonas Lindqvist, the
sample thread's author, so Accept is offered there and his replies carry the "Author" badge in
Discussions. A new topic's slug is its title in kebab case plus `-{n}`; the server knows only the
seeded topics, so an unknown slug renders the 404 page in the browser once it has hydrated. The
preview panel lists nine pages under "Forum" (each variation's front page, Kemo Console and the
sample thread); the composers are reached through each page's primary action.
