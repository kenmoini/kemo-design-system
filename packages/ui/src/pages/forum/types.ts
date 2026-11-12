import type { ReactNode } from 'react'
import type { LinkComponent } from '../auth/types'
import type { BlogBlock } from '../blog/types'

export type ForumVariant = 'boards' | 'discussions' | 'qa'

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

export type ReactionEmoji = ForumReaction['emoji']
export type VoteDirection = 'up' | 'down' | null
export type ListFilter = 'latest' | 'top' | 'unanswered' | 'solved' | 'newest' | 'votes'

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

export interface ForumChromeProps {
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
  onReact?: (postId: string, emoji: ReactionEmoji) => Promise<void>
  onVote?: (postId: string, direction: VoteDirection) => Promise<void>
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
