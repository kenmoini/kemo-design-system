import { describe, expect, it } from 'vitest'
import {
  abbreviate,
  absoluteTime,
  acceptedPost,
  answerCountOf,
  answeredRatio,
  cardCategories,
  categoryAccent,
  firstParagraphText,
  forumVariants,
  formatCount,
  groupReplies,
  hotTags,
  isSolved,
  joinedLabel,
  needsAnswer,
  openCount,
  pageOf,
  paragraphsOf,
  participantsOf,
  REACTION_EMOJI,
  reactionTotalOf,
  relatedTopics,
  relativeTime,
  replyCountOf,
  restCategories,
  scoreOf,
  searchTopics,
  sortTopics,
  topContributors,
  trendingTopics,
  vocabulary,
  weekStats,
} from './content'
import type { ForumCategory, ForumPost, ForumTopic, ForumUser } from './types'

const NOW = '2026-11-12T12:00:00Z'
const ago = (ms: number) => new Date(Date.parse(NOW) - ms).toISOString()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

const ada: ForumUser = { id: 'ada', name: 'Ada' }
const bo: ForumUser = { id: 'bo', name: 'Bo' }
const cy: ForumUser = { id: 'cy', name: 'Cy' }

function post(id: string, author: ForumUser, postedAt: string, extra: Partial<ForumPost> = {}) {
  const p: ForumPost = {
    id,
    author,
    postedAt,
    body: [{ type: 'paragraph', content: `${id} body` }],
    ...extra,
  }
  return p
}

function topic(slug: string, extra: Partial<ForumTopic> = {}): ForumTopic {
  return {
    id: slug,
    slug,
    title: slug,
    excerpt: `${slug} excerpt`,
    categoryId: 'console',
    author: ada,
    createdAt: ago(10 * DAY),
    lastActivityAt: ago(5 * DAY),
    replyCount: 0,
    viewCount: 0,
    tags: [],
    ...extra,
  }
}

function category(id: string, topicCount: number, extra: Partial<ForumCategory> = {}) {
  const c: ForumCategory = {
    id,
    label: id,
    description: `${id} description`,
    section: 'Product',
    topicCount,
    postCount: topicCount * 3,
    solvedCount: 0,
    ...extra,
  }
  return c
}

describe('forumVariants and vocabulary', () => {
  it('names the three variations exactly', () => {
    expect(Object.entries(forumVariants).map(([id, v]) => [id, v.title])).toEqual([
      ['boards', 'Boards'],
      ['discussions', 'Discussions feed'],
      ['qa', 'Q&A desk'],
    ])
    expect(forumVariants.qa.description).toBe(
      'Search-first and answer-first: votes, and an accepted answer pinned under the question.',
    )
  })

  it('carries each variation its own words', () => {
    expect(vocabulary.boards.primary).toBe('New topic')
    expect(vocabulary.discussions.followOn).toBe('Subscribed ✓')
    expect(vocabulary.qa.titleLabel).toBe('Question')
    expect(vocabulary.qa.searchPlaceholder).toBe('')
    expect(Object.values(vocabulary).map((v) => v.noun)).toEqual([
      'topics',
      'discussions',
      'questions',
    ])
  })

  it('lists the five reactions', () => {
    expect(REACTION_EMOJI).toEqual(['👍', '🎉', '❤️', '👀', '🚀'])
  })
})

describe('relativeTime', () => {
  it.each([
    [30 * 1000, 'just now'],
    [MIN, '1 min ago'],
    [14 * MIN, '14 min ago'],
    [59 * MIN + 59_000, '59 min ago'],
    [HOUR, '1 h ago'],
    [2 * HOUR, '2 h ago'],
    [23 * HOUR + 59 * MIN, '23 h ago'],
    [24 * HOUR, 'yesterday'],
    [30 * HOUR, 'yesterday'],
    [48 * HOUR, '2 days ago'],
    [3 * DAY, '3 days ago'],
    [29 * DAY + 23 * HOUR, '29 days ago'],
  ])('says %i ms as "%s"', (delta, label) => {
    expect(relativeTime(ago(delta), NOW)).toBe(label)
  })

  it('falls back to the date from 30 days on', () => {
    expect(relativeTime(ago(31 * DAY), NOW)).toBe('12 Oct 2026')
    expect(relativeTime('2026-10-13T12:00:00Z', NOW)).toBe('13 Oct 2026')
  })

  it('treats a future time as just now', () => {
    expect(relativeTime('2026-11-13T12:00:00Z', NOW)).toBe('just now')
  })
})

describe('time and count formats', () => {
  it('writes an absolute UTC time', () => {
    expect(absoluteTime('2026-11-11T14:02:00Z')).toBe('11 Nov 2026, 14:02 UTC')
    expect(absoluteTime('2026-11-11T04:05:00Z')).toBe('11 Nov 2026, 04:05 UTC')
  })

  it('writes the joined month', () => {
    expect(joinedLabel('2026-03-14T09:00:00Z')).toBe('Joined Mar 2026')
  })

  it('groups thousands', () => {
    expect(formatCount(3902)).toBe('3,902')
    expect(formatCount(7)).toBe('7')
  })

  it('abbreviates thousands with one decimal', () => {
    expect(abbreviate(999)).toBe('999')
    expect(abbreviate(1000)).toBe('1k')
    expect(abbreviate(1234)).toBe('1.2k')
    expect(abbreviate(12000)).toBe('12k')
    expect(abbreviate(999_900)).toBe('999.9k')
  })
})

describe('topic readers', () => {
  const accepted = post('p2', bo, ago(DAY), { accepted: true })
  const solved = topic('solved', { posts: [post('p1', ada, ago(2 * DAY)), accepted] })

  it('derives solved state from an accepted post', () => {
    expect(isSolved(solved)).toBe(true)
    expect(acceptedPost(solved)).toBe(accepted)
    expect(isSolved(topic('open'))).toBe(false)
    expect(acceptedPost(topic('open'))).toBeUndefined()
  })

  it('counts replies from posts, else from replyCount', () => {
    expect(replyCountOf(solved)).toBe(1)
    expect(replyCountOf(topic('list', { replyCount: 7 }))).toBe(7)
  })

  it('counts answers as top-level posts after the first', () => {
    const t = topic('qa', {
      posts: [
        post('q', ada, ago(3 * DAY)),
        post('a1', bo, ago(2 * DAY)),
        post('c1', cy, ago(DAY), { parentId: 'a1' }),
        post('a2', cy, ago(DAY)),
      ],
    })
    expect(answerCountOf(t)).toBe(2)
    expect(answerCountOf(topic('list', { replyCount: 4 }))).toBe(4)
  })

  it('totals reactions from posts, else from reactionTotal', () => {
    const t = topic('r', {
      posts: [
        post('a', ada, ago(DAY), { reactions: [{ emoji: '👍', count: 2 }] }),
        post('b', bo, ago(DAY), {
          reactions: [
            { emoji: '🎉', count: 3 },
            { emoji: '🚀', count: 1 },
          ],
        }),
        post('c', cy, ago(DAY)),
      ],
    })
    expect(reactionTotalOf(t)).toBe(6)
    expect(reactionTotalOf(topic('list', { reactionTotal: 9 }))).toBe(9)
    expect(reactionTotalOf(topic('none'))).toBe(0)
  })

  it('reads the score', () => {
    expect(scoreOf(topic('v', { votes: { score: 12 } }))).toBe(12)
    expect(scoreOf(topic('n'))).toBe(0)
  })

  it('lists participants once each, in first appearance', () => {
    const t = topic('p', {
      author: ada,
      posts: [post('1', ada, ago(3 * DAY)), post('2', bo, ago(2 * DAY)), post('3', ada, ago(DAY))],
    })
    expect(participantsOf(t).map((u) => u.id)).toEqual(['ada', 'bo'])
    expect(participantsOf(topic('l', { participants: [cy, bo] })).map((u) => u.id)).toEqual([
      'cy',
      'bo',
    ])
    expect(participantsOf(topic('solo', { author: bo })).map((u) => u.id)).toEqual(['bo'])
  })
})

describe('groupReplies', () => {
  const t = ago(DAY)

  it('nests children under their top-level post', () => {
    const posts = [
      post('o', ada, t),
      post('r1', bo, t),
      post('c1', cy, t, { parentId: 'r1' }),
      post('r2', cy, t),
      post('c2', ada, t, { parentId: 'r1' }),
    ]
    const g = groupReplies(posts)
    expect(g.original?.id).toBe('o')
    expect(g.replies.map((r) => [r.post.id, r.children.map((c) => c.id)])).toEqual([
      ['r1', ['c1', 'c2']],
      ['r2', []],
    ])
  })

  it('makes an orphan top-level', () => {
    const g = groupReplies([post('o', ada, t), post('x', bo, t, { parentId: 'gone' })])
    expect(g.replies.map((r) => r.post.id)).toEqual(['x'])
  })

  it('puts a post whose parent is the original into originalChildren, apart from orphans', () => {
    const g = groupReplies([
      post('o', ada, t),
      post('x', bo, t, { parentId: 'o' }),
      post('y', cy, t, { parentId: 'gone' }),
    ])
    expect(g.originalChildren.map((c) => c.id)).toEqual(['x'])
    expect(g.replies.map((r) => r.post.id)).toEqual(['y'])
  })

  it('handles no posts', () => {
    expect(groupReplies([])).toEqual({
      original: undefined,
      originalChildren: [],
      replies: [],
    })
  })
})

describe('sortTopics', () => {
  const pinned = topic('pinned', {
    pinned: true,
    createdAt: ago(40 * DAY),
    lastActivityAt: ago(30 * DAY),
  })
  const fresh = topic('fresh', {
    createdAt: ago(DAY),
    lastActivityAt: ago(HOUR),
    votes: { score: 1 },
  })
  const hot = topic('hot', {
    createdAt: ago(8 * DAY),
    lastActivityAt: ago(2 * HOUR),
    votes: { score: 9 },
    replyCount: 3,
  })
  const solvedTopic = topic('solved', {
    createdAt: ago(5 * DAY),
    lastActivityAt: ago(3 * HOUR),
    votes: { score: 4 },
    replyCount: 1,
    posts: [post('1', ada, ago(5 * DAY)), post('2', bo, ago(4 * DAY), { accepted: true })],
  })
  const all = [solvedTopic, pinned, hot, fresh]
  const slugs = (list: ForumTopic[]) => list.map((x) => x.slug)

  it('puts pinned first on latest and newest only', () => {
    expect(slugs(sortTopics(all, 'latest', 'boards'))).toEqual(['pinned', 'fresh', 'hot', 'solved'])
    expect(slugs(sortTopics(all, 'newest', 'qa'))).toEqual(['pinned', 'fresh', 'solved', 'hot'])
  })

  it('orders top by score then activity, without pinning', () => {
    expect(slugs(sortTopics(all, 'top', 'discussions'))).toEqual([
      'hot',
      'solved',
      'fresh',
      'pinned',
    ])
  })

  it('orders votes by score then creation, without pinning', () => {
    expect(slugs(sortTopics(all, 'votes', 'qa'))).toEqual(['hot', 'solved', 'fresh', 'pinned'])
  })

  it('filters unanswered by replies, or by solved state in qa', () => {
    expect(slugs(sortTopics(all, 'unanswered', 'boards'))).toEqual(['fresh', 'pinned'])
    expect(slugs(sortTopics(all, 'unanswered', 'qa'))).toEqual(['fresh', 'hot', 'pinned'])
  })

  it('filters solved without pinning', () => {
    const pinnedSolved = topic('pinned-solved', {
      pinned: true,
      lastActivityAt: ago(20 * DAY),
      posts: [post('1', ada, ago(21 * DAY)), post('2', bo, ago(20 * DAY), { accepted: true })],
    })
    expect(slugs(sortTopics([...all, pinnedSolved], 'solved', 'qa'))).toEqual([
      'solved',
      'pinned-solved',
    ])
  })

  it('breaks ties by slug and does not mutate', () => {
    const same = ago(DAY)
    const input = [topic('b', { lastActivityAt: same }), topic('a', { lastActivityAt: same })]
    const copy = [...input]
    expect(slugs(sortTopics(input, 'latest', 'boards'))).toEqual(['a', 'b'])
    expect(input).toEqual(copy)
  })
})

describe('searchTopics', () => {
  const categories = [category('console', 5, { label: 'Kemo Console' })]
  const crd = topic('crd', {
    title: 'Schema browser shows no CRD',
    excerpt: 'After upgrading, the list is empty.',
    tags: ['crd', 'schema'],
    lastActivityAt: ago(DAY),
  })
  const other = topic('other', {
    title: 'Dark mode',
    excerpt: 'Colours look off.',
    tags: ['theme'],
    lastActivityAt: ago(HOUR),
  })

  it('needs every word, across title, excerpt, tags and category label', () => {
    expect(searchTopics([crd, other], categories, 'crd upgrading').map((x) => x.slug)).toEqual([
      'crd',
    ])
    expect(searchTopics([crd, other], categories, 'schema kemo console')).toEqual([crd])
    expect(searchTopics([crd, other], categories, 'crd theme')).toEqual([])
  })

  it('ignores case', () => {
    expect(searchTopics([crd, other], categories, 'DARK mode')).toEqual([other])
  })

  it('returns latest first', () => {
    expect(searchTopics([crd, other], categories, 'console').map((x) => x.slug)).toEqual([
      'other',
      'crd',
    ])
  })

  it('returns nothing for a blank query', () => {
    expect(searchTopics([crd, other], categories, '   ')).toEqual([])
    expect(searchTopics([crd, other], categories, '')).toEqual([])
  })
})

describe('trending, needs answer and week stats', () => {
  const recentHigh = topic('recent-high', { lastActivityAt: ago(DAY), votes: { score: 8 } })
  const recentLow = topic('recent-low', { lastActivityAt: ago(2 * DAY), votes: { score: 2 } })
  const old = topic('old', { lastActivityAt: ago(8 * DAY), votes: { score: 99 } })
  const future = topic('future', { lastActivityAt: ago(-DAY), votes: { score: 99 } })

  it('trends by score within seven days', () => {
    expect(trendingTopics([old, recentLow, future, recentHigh], NOW).map((x) => x.slug)).toEqual([
      'recent-high',
      'recent-low',
    ])
    expect(trendingTopics([recentLow, recentHigh], NOW, 1).map((x) => x.slug)).toEqual([
      'recent-high',
    ])
  })

  it('lists unsolved topics newest first', () => {
    const solved = topic('solved', {
      createdAt: ago(HOUR),
      posts: [post('1', ada, ago(HOUR)), post('2', bo, ago(HOUR), { accepted: true })],
    })
    const a = topic('a', { createdAt: ago(3 * DAY) })
    const b = topic('b', { createdAt: ago(2 * DAY) })
    expect(needsAnswer([a, solved, b]).map((x) => x.slug)).toEqual(['b', 'a'])
    expect(needsAnswer([a, b], 1).map((x) => x.slug)).toEqual(['b'])
  })

  it('counts the week, leaving out a solve from 8 days ago', () => {
    const solvedOld = topic('solved-old', {
      createdAt: ago(9 * DAY),
      posts: [
        post('1', ada, ago(9 * DAY)),
        post('2', bo, ago(8 * DAY), { accepted: true }),
        post('3', cy, ago(DAY)),
      ],
    })
    const fresh = topic('fresh', {
      createdAt: ago(2 * DAY),
      posts: [post('1', ada, ago(2 * DAY)), post('2', bo, ago(DAY), { accepted: true })],
    })
    const listRow = topic('row', { createdAt: ago(DAY), replyCount: 40 })
    expect(weekStats([solvedOld, fresh, listRow], NOW)).toEqual({
      topics: 2,
      replies: 2,
      solved: 1,
    })
    expect(weekStats([], NOW)).toEqual({ topics: 0, replies: 0, solved: 0 })
  })
})

describe('topContributors', () => {
  it('counts authorship and posts, then orders by count and name', () => {
    const t1 = topic('t1', {
      author: ada,
      posts: [post('1', ada, ago(DAY)), post('2', bo, ago(DAY)), post('3', cy, ago(DAY))],
    })
    const t2 = topic('t2', { author: bo })
    const result = topContributors([t1, t2], 2)
    expect(result.map((r) => [r.user.id, r.count])).toEqual([
      ['ada', 2],
      ['bo', 2],
    ])
    expect(topContributors([t1, t2]).map((r) => r.user.id)).toEqual(['ada', 'bo', 'cy'])
  })
})

describe('relatedTopics', () => {
  it('ranks shared tags above recency within the category, and never returns the topic', () => {
    const base = topic('base', { tags: ['a', 'b'] })
    const recent = topic('recent', { tags: [], lastActivityAt: ago(HOUR) })
    const shared = topic('shared', { tags: ['a', 'b'], lastActivityAt: ago(9 * DAY) })
    const one = topic('one', { tags: ['a'], lastActivityAt: ago(2 * DAY) })
    const elsewhere = topic('elsewhere', {
      categoryId: 'other',
      tags: ['a', 'b'],
      lastActivityAt: ago(MIN),
    })
    const got = relatedTopics(base, [base, recent, elsewhere, one, shared], 4)
    expect(got.map((x) => x.slug)).toEqual(['shared', 'one', 'recent', 'elsewhere'])
    expect(relatedTopics(base, [base, recent, one], 1).map((x) => x.slug)).toEqual(['one'])
  })
})

describe('category helpers', () => {
  const eight = [
    category('announcements', 32, { label: 'Announcements', postCount: 118, solvedCount: 20 }),
    category('kemo-console', 486, { label: 'Kemo Console', postCount: 3902, solvedCount: 440 }),
    category('deployments-gitops', 311, {
      label: 'Deployments & GitOps',
      postCount: 2140,
      solvedCount: 280,
    }),
    category('access-sso', 158, { label: 'Access & SSO', postCount: 1034, solvedCount: 140 }),
    category('getting-started', 97, {
      label: 'Getting started',
      section: 'Community',
      postCount: 612,
      solvedCount: 90,
    }),
    category('show-and-tell', 41, {
      label: 'Show and tell',
      section: 'Community',
      postCount: 388,
      solvedCount: 10,
    }),
    category('feature-requests', 88, {
      label: 'Feature requests',
      section: 'Community',
      postCount: 704,
      solvedCount: 50,
    }),
    category('bug-reports', 35, {
      label: 'Bug reports',
      section: 'Community',
      postCount: 412,
      solvedCount: 30,
    }),
  ]

  it('picks the four biggest as cards, in input order, with the rest apart', () => {
    expect(cardCategories(eight).map((c) => c.label)).toEqual([
      'Kemo Console',
      'Deployments & GitOps',
      'Access & SSO',
      'Getting started',
    ])
    expect(restCategories(eight).map((c) => c.label)).toEqual([
      'Announcements',
      'Show and tell',
      'Feature requests',
      'Bug reports',
    ])
  })

  it('breaks count ties by input order', () => {
    const tied = [category('a', 5), category('b', 5), category('c', 5), category('d', 5)]
    expect(cardCategories([...tied, category('e', 5)]).map((c) => c.id)).toEqual([
      'a',
      'b',
      'c',
      'd',
    ])
  })

  it('sums the answered ratio', () => {
    const cats = [category('a', 100, { solvedCount: 50 }), category('b', 50, { solvedCount: 46 })]
    expect(answeredRatio(cats)).toEqual({ solved: 96, total: 150, percent: 64 })
    expect(answeredRatio([])).toEqual({ solved: 0, total: 0, percent: 0 })
  })

  it('counts the open topics without going negative', () => {
    expect(
      openCount([category('a', 10, { solvedCount: 4 }), category('b', 2, { solvedCount: 5 })]),
    ).toBe(6)
  })

  it('keeps an explicit accent and derives a stable one otherwise', () => {
    expect(categoryAccent(category('x', 1, { accent: 5 }))).toBe(5)
    const derived = categoryAccent(category('console', 1))
    expect([1, 2, 3, 4, 5, 6]).toContain(derived)
    expect(categoryAccent(category('console', 9))).toBe(derived)
  })
})

describe('hotTags', () => {
  it('orders by frequency, then alphabetically', () => {
    const topics = [
      topic('1', { tags: ['b', 'a'] }),
      topic('2', { tags: ['b', 'c'] }),
      topic('3', { tags: ['c', 'd'] }),
    ]
    expect(hotTags(topics)).toEqual(['b', 'c', 'a', 'd'])
    expect(hotTags(topics, 2)).toEqual(['b', 'c'])
  })
})

describe('paragraphsOf and firstParagraphText', () => {
  it('splits on blank lines and drops empties', () => {
    expect(paragraphsOf('a\n\n\nb\n')).toEqual([
      { type: 'paragraph', content: 'a' },
      { type: 'paragraph', content: 'b' },
    ])
    expect(paragraphsOf('one\ntwo')).toEqual([{ type: 'paragraph', content: 'one\ntwo' }])
    expect(paragraphsOf('  \n\n ')).toEqual([])
  })

  it('reads the first string paragraph', () => {
    const p = post('x', ada, ago(DAY), {
      body: [
        { type: 'code', code: 'x' },
        { type: 'paragraph', content: 42 },
        { type: 'paragraph', content: 'hello' },
      ],
    })
    expect(firstParagraphText(p)).toBe('hello')
    expect(firstParagraphText(post('y', ada, ago(DAY), { body: [] }))).toBe('')
  })
})

describe('pageOf', () => {
  it('slices a one-based page', () => {
    const items = [1, 2, 3, 4, 5]
    expect(pageOf(items, 1, 2)).toEqual([1, 2])
    expect(pageOf(items, 3, 2)).toEqual([5])
    expect(pageOf(items, 4, 2)).toEqual([])
  })
})
