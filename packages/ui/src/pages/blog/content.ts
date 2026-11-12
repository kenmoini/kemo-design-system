import type { BlogBlock, BlogComment, BlogPost, BlogTopic, BlogVariant } from './types'

export const blogVariants: Record<BlogVariant, { title: string; description: string }> = {
  'editorial-list': {
    title: 'Editorial list',
    description:
      'A narrow reading column with one featured Nightfall block and a dated text list of posts.',
  },
  'magazine-grid': {
    title: 'Magazine grid',
    description:
      'A split hero, topic tabs and three-column cover cards for a browsable, image-led blog.',
  },
  'journal-rail': {
    title: 'Journal with a rail',
    description: 'A sticky rail with about, topics and subscribe beside a feed grouped by month.',
  },
}

const MONTH_KEYS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const dateParts = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'UTC',
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  weekday: 'short',
})

function partsOf(iso: string): Partial<Record<string, string>> {
  const out: Record<string, string> = {}
  for (const part of dateParts.formatToParts(new Date(iso))) {
    if (part.type !== 'literal')
      out[part.type] = part.value.replace(/[.,]/g, '').replace(/^Sept$/, 'Sep')
  }
  return out
}

export function formatDate(iso: string): string {
  const p = partsOf(iso)
  return `${p.day} ${p.month} ${p.year}`
}

export function formatShortDate(iso: string): string {
  const p = partsOf(iso)
  return `${p.day} ${p.month}`
}

export function formatDay(iso: string): { day: string; weekday: string } {
  const p = partsOf(iso)
  return { day: p.day ?? '', weekday: p.weekday ?? '' }
}

export function countLabel(n: number): string {
  return n === 1 ? '1 post' : `${n} posts`
}

export function readingLabel(minutes: number): string {
  return `${minutes} min read`
}

export function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort((x, y) => {
    const diff = Date.parse(y.publishedAt) - Date.parse(x.publishedAt)
    if (diff !== 0) return diff
    return x.slug < y.slug ? -1 : x.slug > y.slug ? 1 : 0
  })
}

export function featuredPost(sorted: BlogPost[]): BlogPost | undefined {
  return sorted.find((p) => p.featured) ?? sorted[0]
}

export function topicsOf(sorted: BlogPost[]): BlogTopic[] {
  const seen = new Map<string, BlogTopic>()
  for (const p of sorted) if (!seen.has(p.topic.id)) seen.set(p.topic.id, p.topic)
  return [...seen.values()]
}

export function filterByTopic(sorted: BlogPost[], topicId?: string): BlogPost[] {
  return topicId === undefined ? sorted : sorted.filter((p) => p.topic.id === topicId)
}

export function adjacentPosts(
  sorted: BlogPost[],
  slug: string,
): { older?: BlogPost; newer?: BlogPost } {
  const i = sorted.findIndex((p) => p.slug === slug)
  if (i === -1) return {}
  const result: { older?: BlogPost; newer?: BlogPost } = {}
  if (i + 1 < sorted.length) result.older = sorted[i + 1]
  if (i > 0) result.newer = sorted[i - 1]
  return result
}

export function relatedPosts(sorted: BlogPost[], post: BlogPost, count = 3): BlogPost[] {
  const others = sorted.filter((p) => p.slug !== post.slug)
  const same = others.filter((p) => p.topic.id === post.topic.id)
  const rest = others.filter((p) => p.topic.id !== post.topic.id)
  return [...same, ...rest].slice(0, count)
}

export function groupByMonth(
  sorted: BlogPost[],
): { key: string; label: string; posts: BlogPost[] }[] {
  const groups: { key: string; label: string; posts: BlogPost[] }[] = []
  for (const p of sorted) {
    const d = new Date(p.publishedAt)
    const month = d.getUTCMonth()
    const key = `${d.getUTCFullYear()}-${String(month + 1).padStart(2, '0')}`
    const last = groups[groups.length - 1]
    if (last && last.key === key) last.posts.push(p)
    else groups.push({ key, label: `${MONTH_KEYS[month]} ${d.getUTCFullYear()}`, posts: [p] })
  }
  return groups
}

export function hasExplicitCover(post: BlogPost): boolean {
  return post.cover !== undefined
}

export function coverPreset(post: BlogPost): 1 | 2 | 3 | 4 | 5 | 6 {
  if (post.cover && 'preset' in post.cover) return post.cover.preset
  let hash = 0
  for (const ch of post.slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return ((hash % 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6
}

export function countComments(comments: BlogComment[]): number {
  return comments.reduce((n, c) => n + 1 + (c.replies?.length ?? 0), 0)
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function tocOf(body: BlogBlock[]): { id: string; text: string; level: 2 | 3 }[] {
  const used = new Map<string, number>()
  const out: { id: string; text: string; level: 2 | 3 }[] = []
  for (const block of body) {
    if (block.type !== 'heading') continue
    const base = block.id ?? (slugify(block.text) || 'section')
    const n = (used.get(base) ?? 0) + 1
    used.set(base, n)
    out.push({ id: n === 1 ? base : `${base}-${n}`, text: block.text, level: block.level })
  }
  return out
}
