import { describe, expect, it } from 'vitest'
import {
  adjacentPosts,
  blogVariants,
  countComments,
  countLabel,
  coverPreset,
  featuredPost,
  filterByTopic,
  formatDate,
  formatDay,
  formatShortDate,
  groupByMonth,
  hasExplicitCover,
  readingLabel,
  relatedPosts,
  sortPosts,
  tocOf,
  topicsOf,
} from './content'
import type { BlogComment, BlogPost } from './types'

const author = { id: 'a', name: 'Ada' }

function post(
  slug: string,
  publishedAt: string,
  topicId: string,
  extra: Partial<BlogPost> = {},
): BlogPost {
  return {
    slug,
    title: slug,
    summary: `${slug} summary`,
    topic: { id: topicId, label: topicId.toUpperCase() },
    author,
    publishedAt,
    readingMinutes: 4,
    body: [],
    ...extra,
  }
}

const a = post('a', '2026-11-11T09:00:00Z', 'ops')
const b = post('b', '2026-11-04T09:00:00Z', 'dev')
const c = post('c', '2026-10-20T09:00:00Z', 'ops')
const d = post('d', '2026-09-02T09:00:00Z', 'design')

describe('blog content helpers', () => {
  it('names the three variations exactly', () => {
    expect(Object.entries(blogVariants).map(([id, v]) => [id, v.title])).toEqual([
      ['editorial-list', 'Editorial list'],
      ['magazine-grid', 'Magazine grid'],
      ['journal-rail', 'Journal with a rail'],
    ])
    for (const v of Object.values(blogVariants)) expect(v.description.length).toBeGreaterThan(10)
  })

  it('sorts newest first without mutating', () => {
    const tieB = post('tie-b', '2026-11-11T09:00:00Z', 'ops')
    const tieA = post('tie-a', '2026-11-11T09:00:00Z', 'ops')
    const input = [d, tieB, c, tieA, b]
    const copy = [...input]
    expect(sortPosts(input).map((p) => p.slug)).toEqual(['tie-a', 'tie-b', 'b', 'c', 'd'])
    expect(input).toEqual(copy)
  })

  it('picks the newest featured post, else the newest', () => {
    const f1 = post('f1', '2026-10-01T00:00:00Z', 'ops', { featured: true })
    const f2 = post('f2', '2026-09-01T00:00:00Z', 'ops', { featured: true })
    expect(featuredPost(sortPosts([a, f2, f1, b]))?.slug).toBe('f1')
    expect(featuredPost(sortPosts([b, a, c]))?.slug).toBe('a')
    expect(featuredPost([])).toBeUndefined()
  })

  it('derives topics in first-appearance order', () => {
    expect(topicsOf([a, b, c, d]).map((t) => t.id)).toEqual(['ops', 'dev', 'design'])
  })

  it('filters by topic', () => {
    const sorted = [a, b, c, d]
    expect(filterByTopic(sorted, 'ops').map((p) => p.slug)).toEqual(['a', 'c'])
    expect(filterByTopic(sorted)).toEqual(sorted)
    expect(filterByTopic(sorted, 'nope')).toEqual([])
  })

  it('finds older and newer neighbours', () => {
    const sorted = [a, b, c, d]
    expect(adjacentPosts(sorted, 'b')).toEqual({ older: c, newer: a })
    expect(adjacentPosts(sorted, 'a')).toEqual({ older: b })
    expect(adjacentPosts(sorted, 'd')).toEqual({ newer: c })
    expect(adjacentPosts(sorted, 'missing')).toEqual({})
  })

  it('prefers same-topic posts for related and never returns the post itself', () => {
    const sorted = [a, b, c, d]
    const related = relatedPosts(sorted, a)
    expect(related.map((p) => p.slug)).toEqual(['c', 'b', 'd'])
    expect(related).not.toContain(a)
    expect(relatedPosts(sorted, a, 2).map((p) => p.slug)).toEqual(['c', 'b'])
  })

  it('returns nothing related when it is the only post', () => {
    expect(relatedPosts([a], a)).toEqual([])
  })

  it('groups by UTC month', () => {
    const edge = post('edge', '2026-11-01T00:30:00Z', 'ops')
    const groups = groupByMonth(sortPosts([edge, c, a]))
    expect(groups.map((g) => [g.key, g.label, g.posts.map((p) => p.slug)])).toEqual([
      ['2026-11', 'November 2026', ['a', 'edge']],
      ['2026-10', 'October 2026', ['c']],
    ])
  })

  it('formats dates in UTC', () => {
    expect(formatDate('2026-11-11T09:00:00Z')).toBe('11 Nov 2026')
    expect(formatShortDate('2026-11-04T23:30:00-05:00')).toBe('05 Nov')
    expect(formatDay('2026-11-11T09:00:00Z')).toEqual({ day: '11', weekday: 'Wed' })
  })

  it('uses a three-letter abbreviation for September', () => {
    expect(formatDate('2026-09-02T09:00:00Z')).toBe('02 Sep 2026')
  })

  it('labels counts', () => {
    expect(countLabel(8)).toBe('8 posts')
    expect(countLabel(1)).toBe('1 post')
    expect(countLabel(0)).toBe('0 posts')
    expect(readingLabel(9)).toBe('9 min read')
  })

  it('keeps an explicit preset and derives a stable one from the slug', () => {
    const explicit = post('x', a.publishedAt, 'ops', { cover: { preset: 5 } })
    expect(coverPreset(explicit)).toBe(5)
    expect(hasExplicitCover(explicit)).toBe(true)
    expect(hasExplicitCover(a)).toBe(false)
    const image = post('y', a.publishedAt, 'ops', { cover: { src: '/x.png', alt: 'x' } })
    expect(hasExplicitCover(image)).toBe(true)
    expect(coverPreset(a)).toBe(coverPreset(a))
    for (const p of [a, b, c, d, image]) {
      expect([1, 2, 3, 4, 5, 6]).toContain(coverPreset(p))
    }
  })

  it('counts comments and their replies, ignoring deeper nesting', () => {
    const base = { author: { name: 'N' }, postedAt: '2026-11-11T09:00:00Z', body: 'b' }
    const comments: BlogComment[] = [
      {
        ...base,
        id: '1',
        replies: [
          { ...base, id: '1a' },
          { ...base, id: '1b', replies: [{ ...base, id: '1b1' }] },
        ],
      },
      { ...base, id: '2' },
      { ...base, id: '3' },
    ]
    expect(countComments(comments)).toBe(5)
    expect(countComments([])).toBe(0)
  })

  it('builds a table of contents with unique ids', () => {
    expect(
      tocOf([
        { type: 'heading', level: 2, text: 'Results' },
        { type: 'paragraph', content: 'x' },
        { type: 'heading', level: 3, text: 'Results' },
        { type: 'heading', level: 2, text: 'Next', id: 'what-next' },
      ]),
    ).toEqual([
      { id: 'section-results', text: 'Results', level: 2 },
      { id: 'section-results-2', text: 'Results', level: 3 },
      { id: 'what-next', text: 'Next', level: 2 },
    ])
  })

  it('does not collide with the comments section when a heading is titled Comments', () => {
    const ids = tocOf([{ type: 'heading', level: 2, text: 'Comments' }]).map((t) => t.id)
    expect(ids).toEqual(['section-comments'])
    expect(ids).not.toContain('comments')
  })

  it('keeps an explicit id verbatim, so it cannot clash with a generated -2 id', () => {
    const ids = tocOf([
      { type: 'heading', level: 2, text: 'Results' },
      { type: 'heading', level: 2, text: 'Results again', id: 'section-results-2' },
      { type: 'heading', level: 3, text: 'Results' },
    ]).map((t) => t.id)
    expect(ids).toEqual(['section-results', 'section-results-2', 'section-results-3'])
    expect(new Set(ids).size).toBe(ids.length)
  })
})
