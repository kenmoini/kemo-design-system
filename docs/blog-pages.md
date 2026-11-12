# Blog pages

A blog family, presentational like the others: posts and comments come in as props, the host
supplies the routes, `linkComponent`, and what happens on subscribe and on a new comment. Three
variations of the same index and post pages, picked with `variant` or rendered directly:

| `variant`        | Title               | Index                                          | Post                                 |
| ---------------- | ------------------- | ---------------------------------------------- | ------------------------------------ |
| `editorial-list` | Editorial list      | Featured block, topic buttons, dated rows      | Single column, byline, previous/next |
| `magazine-grid`  | Magazine grid       | Hero, topic tabs, three-column cards, paginate | Cover banner, share and copy link    |
| `journal-rail`   | Journal with a rail | Rail (topics, subscribe) beside a feed         | Rail with "On this page" and details |

Exports from `@kemo/ui`: `BlogIndexPage` and `BlogPostPage` (each renders the variation named by
`variant`), `BlogLayout` (the top bar and footer), `BlogComments`, `SubscribeForm`, `BlogCover`,
`BlogProse`, `blogVariants` (the ids, titles and descriptions above) and the types `BlogVariant`,
`BlogPost`, `BlogBlock`, `BlogComment`, `BlogAuthor`, `BlogTopic`, `BlogCoverSpec`,
`BlogChromeProps` (the props every page shares), `BlogIndexPageProps`, `BlogPostPageProps`,
`BlogLayoutProps`, `BlogCoverProps`, `SubscribeFormProps` and `BlogCommentsProps`.

A post is data, and its body is a list of typed blocks:

```ts
interface BlogPost {
  slug: string // unique; keys, and the cover preset when `cover` is omitted
  title: string
  summary: string
  topic: BlogTopic // { id, label }
  author: BlogAuthor // { id, name, role?, avatarSrc? }
  publishedAt: string // ISO 8601; shown as an absolute UTC date, "11 Nov 2026"
  readingMinutes: number
  featured?: boolean // the newest featured post leads the index
  cover?: BlogCoverSpec
  tags?: string[]
  body: BlogBlock[]
}
// paragraph | heading (2 or 3) | list | quote | code | callout (neutral or warning) | stats | figure
```

A host wires the pages like this (the preview does it in
`apps/preview/src/components/blog/blog-demo.tsx`). The wiring lives in a `'use client'` component:
`postHref`, `linkComponent` and the handlers are functions, which a server component can't hand to
a client one. A server page can load the posts and render that component.

```tsx
'use client'
import { BlogIndexPage, BlogPostPage, type BlogChromeProps } from '@kemo/ui'
import NextLink from 'next/link'

const chrome: BlogChromeProps = {
  variant: 'editorial-list',
  brand: 'Kemo',
  indexHref: '/blog',
  postHref: (post) => `/blog/${post.slug}`,
  linkComponent: NextLink,
  onSubscribe: async (email) => {
    await fetch('/api/subscribe', { method: 'POST', body: JSON.stringify({ email }) }) // throw to fail
  },
}

<BlogIndexPage {...chrome} title="Notes from the platform team" posts={posts} />
<BlogPostPage {...chrome} post={post} posts={posts} />
```

Inline markup in a paragraph, list item, quote or callout is plain React: use the Park `Code` for
inline code and `Link` for links (`<Code>req_7f3a91</Code>`, `<Link href="/docs">the docs</Link>`),
and a `code` block for multi-line code. A cover is either a generated gradient preset
(`{ preset: 1 }` to `{ preset: 6 }`, picked from the slug when omitted) or an image
(`{ src, alt }`). On the index the topic filter is controlled whenever the `topic` key is passed,
even as `undefined` (all posts), with or without `onTopicChange`: it shows that topic until the
prop changes, so pass both for a filter the reader can move. Leave `topic` out and the filter keeps
its own state, starting at `defaultTopic`; `onTopicChange` is called on every change either way.
`indexTitle` sets the post's back link in Editorial list and Journal ("All posts" by default; the
preview passes "Platform journal" to the Journal); Magazine grid has no back link and ignores it.
`footer` fills the left of the footer row; on a Journal post it replaces the link to the older
post. The footer prints the current year; pass `year` to pin it in a statically generated page.
Omit `onSubscribe` to drop every subscribe control.

Comments are opt-in. Pass `comments` (`BlogComment[]`, oldest first on the page, one level of
replies) and `onAddComment` to `BlogPostPage` for the section and its form; omit both for none, or
pass only `comments` for a read-only thread. The host stores and returns the comments: the form
calls `onAddComment({ name, body, parentId? })`, and once it resolves the host adds the comment to
the list it passes back. Reject (an `Error`'s message is shown) to keep the text and say why.
Bodies are plain text; markup is shown as text, not rendered.

```tsx
const [comments, setComments] = useState(initial)
<BlogPostPage
  {...chrome}
  post={post}
  posts={posts}
  comments={comments}
  onAddComment={async ({ name, body, parentId }) => {
    const saved = await api.addComment(post.slug, { name, body, parentId }) // throws on failure
    setComments((current) => withComment(current, saved, parentId))
  }}
/>
```

Not included: search, topic and author pages, RSS, Markdown parsing, and comment moderation or
sign-in. A name and a comment is all the form asks for.

In the preview, `/blog` redirects to `/blog/editorial-list`; `/blog/<variation>` is the index and
`/blog/<variation>/<slug>` a post, for the three variations. The posts and comments are in
`apps/preview/src/lib/mock-blog.tsx`: eight posts across four topics, with seed comments on three of them.
An address or comment that contains "fail" is rejected, so both error states can be tried. The
preview panel lists the six pages under "Blog".
