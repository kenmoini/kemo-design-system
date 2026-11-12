import type { ReactNode } from 'react'
import type { LinkComponent } from '../auth/types'

export type BlogVariant = 'editorial-list' | 'magazine-grid' | 'journal-rail'

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
  author: { name: string; avatarSrc?: string; isAuthor?: boolean }
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

export interface BlogChromeProps {
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
  /**
   * The year in the footer's copyright line; default the current year. Pin it in a statically
   * generated page, which otherwise prints the year it was built in.
   */
  year?: number
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
