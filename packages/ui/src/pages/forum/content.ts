import { formatDate } from '../blog/content'
import type {
  ForumBlock,
  ForumCategory,
  ForumPost,
  ForumTopic,
  ForumUser,
  ForumVariant,
  ListFilter,
  ReactionEmoji,
} from './types'

export const forumVariants: Record<ForumVariant, { title: string; description: string }> = {
  boards: {
    title: 'Boards',
    description:
      'The classic forum: boards grouped into sections, topic rows with counts and numbered posts in order.',
  },
  discussions: {
    title: 'Discussions feed',
    description:
      'One feed across categories with a rail; a thread is a card with reactions and nested replies.',
  },
  qa: {
    title: 'Q&A desk',
    description:
      'Search-first and answer-first: votes, and an accepted answer pinned under the question.',
  },
}

export const vocabulary: Record<
  ForumVariant,
  {
    noun: 'topics' | 'discussions' | 'questions'
    primary: string
    searchPlaceholder: string
    composerHeading: string
    composerSubmit: string
    titleLabel: 'Title' | 'Question'
    replyPlaceholder: string
    replySubmit: string
    replyPosted: string
    followOff: string
    followOn: string
    sectionLabel: string
  }
> = {
  boards: {
    noun: 'topics',
    primary: 'New topic',
    searchPlaceholder: 'Search topics',
    composerHeading: 'New topic',
    composerSubmit: 'Post topic',
    titleLabel: 'Title',
    replyPlaceholder: 'Share what you tried and the console version.',
    replySubmit: 'Post reply',
    replyPosted: 'Reply posted.',
    followOff: 'Watch',
    followOn: 'Watching',
    sectionLabel: 'Boards',
  },
  discussions: {
    noun: 'discussions',
    primary: 'New discussion',
    searchPlaceholder: 'Search discussions',
    composerHeading: 'New discussion',
    composerSubmit: 'Start discussion',
    titleLabel: 'Title',
    replyPlaceholder: 'Add to the discussion',
    replySubmit: 'Comment',
    replyPosted: 'Reply posted.',
    followOff: 'Subscribe',
    followOn: 'Subscribed ✓',
    sectionLabel: 'Discussions',
  },
  qa: {
    noun: 'questions',
    primary: 'Ask a question',
    searchPlaceholder: '',
    composerHeading: 'Ask a question',
    composerSubmit: 'Post your question',
    titleLabel: 'Question',
    replyPlaceholder: 'Answer the question; comments go under the post they are about.',
    replySubmit: 'Post your answer',
    replyPosted: 'Answer posted.',
    followOff: 'Follow',
    followOn: 'Following',
    sectionLabel: 'Questions',
  },
}

export const REACTION_EMOJI: readonly ReactionEmoji[] = ['👍', '🎉', '❤️', '👀', '🚀']

const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY

function hashOf(text: string): number {
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash
}

function compareText(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0
}

function timeOf(iso: string): number {
  return Date.parse(iso)
}

function withinWeek(iso: string, now: string): boolean {
  const delta = timeOf(now) - timeOf(iso)
  return delta >= 0 && delta < WEEK
}

// Formatting

export function relativeTime(iso: string, now: string): string {
  const delta = timeOf(now) - timeOf(iso)
  if (delta < MINUTE) return 'just now'
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)} min ago`
  if (delta < DAY) return `${Math.floor(delta / HOUR)} h ago`
  if (delta < 2 * DAY) return 'yesterday'
  if (delta < 30 * DAY) return `${Math.floor(delta / DAY)} days ago`
  return formatDate(iso)
}

export function absoluteTime(iso: string): string {
  const d = new Date(iso)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${formatDate(iso)}, ${hh}:${mm} UTC`
}

const monthYear = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  month: 'short',
  year: 'numeric',
})

export function joinedLabel(iso: string): string {
  return `Joined ${monthYear
    .format(new Date(iso))
    .replace(/\./g, '')
    .replace(/^Sept\b/, 'Sep')}`
}

const counts = new Intl.NumberFormat('en-GB')

export function formatCount(n: number): string {
  return counts.format(n)
}

export function abbreviate(n: number): string {
  if (n < 1000) return formatCount(n)
  return `${(Math.floor(n / 100) / 10).toFixed(1).replace(/\.0$/, '')}k`
}

// Topic readers

export function acceptedPost(topic: ForumTopic): ForumPost | undefined {
  return topic.posts?.find((p) => p.accepted)
}

export function isSolved(topic: ForumTopic): boolean {
  return acceptedPost(topic) !== undefined
}

export function replyCountOf(topic: ForumTopic): number {
  return topic.posts ? Math.max(0, topic.posts.length - 1) : topic.replyCount
}

export function reactionTotalOf(topic: ForumTopic): number {
  if (!topic.posts) return topic.reactionTotal ?? 0
  let total = 0
  for (const p of topic.posts) for (const r of p.reactions ?? []) total += r.count
  return total
}

export function scoreOf(topic: ForumTopic): number {
  return topic.votes?.score ?? 0
}

export function answerCountOf(topic: ForumTopic): number {
  if (!topic.posts) return topic.replyCount
  return topic.posts.slice(1).filter((p) => p.parentId === undefined).length
}

export function participantsOf(topic: ForumTopic): ForumUser[] {
  if (!topic.posts) return topic.participants ?? [topic.author]
  const seen = new Map<string, ForumUser>()
  for (const user of [topic.author, ...topic.posts.map((p) => p.author)]) {
    if (!seen.has(user.id)) seen.set(user.id, user)
  }
  return [...seen.values()]
}

export function groupReplies(posts: ForumPost[]): {
  original?: ForumPost
  /** Posts replying to the original itself: comments on the question in Q&A, nested replies elsewhere. */
  originalChildren: ForumPost[]
  replies: { post: ForumPost; children: ForumPost[] }[]
} {
  const [original, ...rest] = posts
  const topLevelIds = new Set(rest.filter((p) => p.parentId === undefined).map((p) => p.id))
  const originalChildren: ForumPost[] = []
  const replies: { post: ForumPost; children: ForumPost[] }[] = []
  const byId = new Map<string, { post: ForumPost; children: ForumPost[] }>()
  for (const p of rest) {
    if (p.parentId !== undefined && p.parentId === original?.id) {
      originalChildren.push(p)
      continue
    }
    if (p.parentId !== undefined && topLevelIds.has(p.parentId)) continue
    const entry = { post: p, children: [] as ForumPost[] }
    replies.push(entry)
    byId.set(p.id, entry)
  }
  for (const p of rest) {
    if (p.parentId !== undefined && topLevelIds.has(p.parentId))
      byId.get(p.parentId)?.children.push(p)
  }
  return { original, originalChildren, replies }
}

// Ordering and search

function latestOrder(a: ForumTopic, b: ForumTopic): number {
  return (
    Number(b.pinned === true) - Number(a.pinned === true) ||
    timeOf(b.lastActivityAt) - timeOf(a.lastActivityAt) ||
    compareText(a.slug, b.slug)
  )
}

function activityOrder(a: ForumTopic, b: ForumTopic): number {
  return timeOf(b.lastActivityAt) - timeOf(a.lastActivityAt) || compareText(a.slug, b.slug)
}

export function sortTopics(
  topics: ForumTopic[],
  filter: ListFilter,
  variant: ForumVariant,
): ForumTopic[] {
  const list = [...topics]
  switch (filter) {
    case 'latest':
      return list.sort(latestOrder)
    case 'top':
      return list.sort((a, b) => scoreOf(b) - scoreOf(a) || activityOrder(a, b))
    case 'unanswered':
      return list
        .filter((t) => (variant === 'qa' ? !isSolved(t) : replyCountOf(t) === 0))
        .sort(activityOrder)
    case 'solved':
      return list.filter(isSolved).sort(activityOrder)
    case 'newest':
      return list.sort(
        (a, b) =>
          Number(b.pinned === true) - Number(a.pinned === true) ||
          timeOf(b.createdAt) - timeOf(a.createdAt) ||
          compareText(a.slug, b.slug),
      )
    case 'votes':
      return list.sort(
        (a, b) =>
          scoreOf(b) - scoreOf(a) ||
          timeOf(b.createdAt) - timeOf(a.createdAt) ||
          compareText(a.slug, b.slug),
      )
  }
}

export function searchTopics(
  topics: ForumTopic[],
  categories: ForumCategory[],
  query: string,
): ForumTopic[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const labels = new Map(categories.map((c) => [c.id, c.label]))
  return topics
    .filter((t) => {
      const haystack = [t.title, t.excerpt, t.tags.join(' '), labels.get(t.categoryId) ?? '']
        .join(' ')
        .toLowerCase()
      return words.every((w) => haystack.includes(w))
    })
    .sort(latestOrder)
}

export function trendingTopics(topics: ForumTopic[], now: string, count = 5): ForumTopic[] {
  return topics
    .filter((t) => withinWeek(t.lastActivityAt, now))
    .sort((a, b) => scoreOf(b) - scoreOf(a) || activityOrder(a, b))
    .slice(0, count)
}

export function needsAnswer(topics: ForumTopic[], count = 5): ForumTopic[] {
  return topics
    .filter((t) => !isSolved(t))
    .sort((a, b) => timeOf(b.createdAt) - timeOf(a.createdAt) || compareText(a.slug, b.slug))
    .slice(0, count)
}

export function weekStats(
  topics: ForumTopic[],
  now: string,
): { topics: number; replies: number; solved: number } {
  let created = 0
  let replies = 0
  let solved = 0
  for (const t of topics) {
    if (withinWeek(t.createdAt, now)) created += 1
    if (t.posts) replies += t.posts.slice(1).filter((p) => withinWeek(p.postedAt, now)).length
    const accepted = acceptedPost(t)
    if (accepted && withinWeek(accepted.postedAt, now)) solved += 1
  }
  return { topics: created, replies, solved }
}

export function topContributors(
  topics: ForumTopic[],
  count = 4,
): { user: ForumUser; count: number }[] {
  const tally = new Map<string, { user: ForumUser; count: number }>()
  const add = (user: ForumUser) => {
    const entry = tally.get(user.id)
    if (entry) entry.count += 1
    else tally.set(user.id, { user, count: 1 })
  }
  for (const t of topics) {
    add(t.author)
    for (const p of t.posts ?? []) add(p.author)
  }
  return [...tally.values()]
    .sort((a, b) => b.count - a.count || compareText(a.user.name, b.user.name))
    .slice(0, count)
}

export function relatedTopics(
  topic: ForumTopic,
  candidates: ForumTopic[],
  count: number,
): ForumTopic[] {
  const shared = (t: ForumTopic) => t.tags.filter((tag) => topic.tags.includes(tag)).length
  const sameCategory = (t: ForumTopic) => Number(t.categoryId === topic.categoryId)
  return candidates
    .filter((t) => t.slug !== topic.slug)
    .sort(
      (a, b) => sameCategory(b) - sameCategory(a) || shared(b) - shared(a) || activityOrder(a, b),
    )
    .slice(0, count)
}

// Categories

export function cardCategories(categories: ForumCategory[]): ForumCategory[] {
  const chosen = new Set(
    categories
      .map((c, index) => ({ c, index }))
      .sort((a, b) => b.c.topicCount - a.c.topicCount || a.index - b.index)
      .slice(0, 4)
      .map((entry) => entry.c),
  )
  return categories.filter((c) => chosen.has(c))
}

export function restCategories(categories: ForumCategory[]): ForumCategory[] {
  const cards = new Set(cardCategories(categories))
  return categories.filter((c) => !cards.has(c))
}

export function answeredRatio(categories: ForumCategory[]): {
  solved: number
  total: number
  percent: number
} {
  const solved = categories.reduce((n, c) => n + c.solvedCount, 0)
  const total = categories.reduce((n, c) => n + c.topicCount, 0)
  return { solved, total, percent: total === 0 ? 0 : Math.round((solved / total) * 100) }
}

export function openCount(categories: ForumCategory[]): number {
  return categories.reduce((n, c) => n + Math.max(0, c.topicCount - c.solvedCount), 0)
}

export function categoryAccent(category: ForumCategory): 1 | 2 | 3 | 4 | 5 | 6 {
  return category.accent ?? (((hashOf(category.id) % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6)
}

export function hotTags(topics: ForumTopic[], count = 5): string[] {
  const tally = new Map<string, number>()
  for (const t of topics) for (const tag of t.tags) tally.set(tag, (tally.get(tag) ?? 0) + 1)
  return [...tally.entries()]
    .sort((a, b) => b[1] - a[1] || compareText(a[0], b[0]))
    .slice(0, count)
    .map(([tag]) => tag)
}

// Text and paging

export function paragraphsOf(text: string): ForumBlock[] {
  return text
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter((part) => part !== '')
    .map((content) => ({ type: 'paragraph', content }))
}

export function firstParagraphText(post: ForumPost): string {
  for (const block of post.body) {
    if (block.type === 'paragraph' && typeof block.content === 'string') return block.content
  }
  return ''
}

export function pageOf<T>(items: T[], page: number, pageSize: number): T[] {
  return items.slice((page - 1) * pageSize, page * pageSize)
}
