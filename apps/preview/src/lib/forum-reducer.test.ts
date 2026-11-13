import { isSolved } from '@kemo/ui'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  CLOCK_TICK_MS,
  type ForumAction,
  type ForumState,
  forumReducer,
  initialState,
  slugFor,
  STEP_MS,
} from './forum-reducer'
import { FORUM_NOW, forumCategories, forumTopics, viewer } from './mock-forum'

const SAMPLE = 'schema-browser-crd'
/** The unsolved question: two posts, no accepted answer. */
const UNSOLVED = 'scale-dialog-zero-replicas'

const run = (state: ForumState, ...actions: ForumAction[]) => actions.reduce(forumReducer, state)
const topicOf = (state: ForumState, slug: string) => state.topics[slug]!
const postOf = (state: ForumState, slug: string, id: string) =>
  topicOf(state, slug).posts!.find((p) => p.id === id)!
const lastPost = (state: ForumState, slug: string) => topicOf(state, slug).posts!.at(-1)!
const categoryOf = (state: ForumState, id: string) => state.categories.find((c) => c.id === id)!
const seconds = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 1000

afterEach(() => {
  vi.useRealTimers()
})

describe('the seed', () => {
  it('starts the clock at FORUM_NOW with every topic in order, newest activity first', () => {
    expect(initialState.now).toBe(FORUM_NOW)
    expect(initialState.viewer).toBe(viewer)
    expect(initialState.order).toHaveLength(forumTopics.length)
    const times = initialState.order.map((slug) =>
      Date.parse(topicOf(initialState, slug).lastActivityAt),
    )
    expect(times).toEqual([...times].sort((a, b) => b - a))
  })

  it('reads like the mockup: 28 topics, a paging Kemo Console, 1,146 of 1,248 solved', () => {
    expect(forumTopics).toHaveLength(28)
    expect(new Set(forumTopics.map((t) => t.slug)).size).toBe(28)
    expect(forumTopics.filter((t) => t.categoryId === 'kemo-console').length).toBeGreaterThan(10)
    expect(forumCategories.reduce((n, c) => n + c.solvedCount, 0)).toBe(1146)
    expect(forumCategories.reduce((n, c) => n + c.topicCount, 0)).toBe(1248)
    const sample = topicOf(initialState, SAMPLE)
    expect(sample.posts).toHaveLength(13)
    expect(sample.posts!.filter((p) => p.accepted).map((p) => p.id)).toEqual(['p4'])
    expect(isSolved(topicOf(initialState, UNSOLVED))).toBe(false)
  })

  it('dates every post within its topic, never after FORUM_NOW', () => {
    for (const topic of forumTopics) {
      const created = Date.parse(topic.createdAt)
      const last = Date.parse(topic.lastActivityAt)
      expect(created).toBeLessThanOrEqual(last)
      expect(last).toBeLessThanOrEqual(Date.parse(FORUM_NOW))
      for (const post of topic.posts ?? []) {
        expect(Date.parse(post.postedAt)).toBeGreaterThanOrEqual(created)
        expect(Date.parse(post.postedAt)).toBeLessThanOrEqual(last)
      }
    }
  })
})

describe('forumReducer', () => {
  it('reply appends a post from the body, bumps the counts and the activity', () => {
    const before = topicOf(initialState, SAMPLE)
    const state = run(initialState, {
      type: 'reply',
      slug: SAMPLE,
      body: 'Same here on 4.2.1.\n\nThe version on the key fixed it.',
    })
    const topic = topicOf(state, SAMPLE)
    const post = lastPost(state, SAMPLE)

    expect(topic.posts).toHaveLength(before.posts!.length + 1)
    expect(post.author).toBe(viewer)
    expect(post.body).toEqual([
      { type: 'paragraph', content: 'Same here on 4.2.1.' },
      { type: 'paragraph', content: 'The version on the key fixed it.' },
    ])
    expect(post.parentId).toBeUndefined()
    expect(post.quote).toBeUndefined()
    expect(post.postedAt).toBe(state.now)
    expect(seconds(initialState.now, state.now)).toBe(STEP_MS / 1000)
    expect(topic.replyCount).toBe(before.replyCount + 1)
    expect(topic.lastActivityAt).toBe(state.now)
    expect(categoryOf(state, 'kemo-console').postCount).toBe(
      categoryOf(initialState, 'kemo-console').postCount + 1,
    )
    expect(state.nextId).toBe(initialState.nextId + 1)
  })

  it('reply moves its topic to the front and never repeats a post id', () => {
    const slug = 'forum-guidelines'
    const state = run(
      initialState,
      { type: 'reply', slug, body: 'One' },
      { type: 'reply', slug, body: 'Two' },
    )
    expect(state.order[0]).toBe(slug)
    expect(state.order).toHaveLength(initialState.order.length)
    const ids = topicOf(state, slug).posts!.map((p) => p.id)
    expect(new Set(ids).size).toBe(ids.length)
    const seeded = new Set(forumTopics.flatMap((t) => (t.posts ?? []).map((p) => p.id)))
    expect(seeded.has(lastPost(state, slug).id)).toBe(false)
  })

  it('reply with quoteOf carries the quoted post’s author and first paragraph', () => {
    const state = run(initialState, { type: 'reply', slug: SAMPLE, body: 'Yes', quoteOf: 'p2' })
    expect(lastPost(state, SAMPLE).quote).toEqual({
      author: postOf(initialState, SAMPLE, 'p2').author,
      excerpt:
        'Which exact version, 4.2.0 or 4.2.1? And does the panel show anything for a plain Deployment on the same cluster?',
    })
  })

  it('reply with parentId nests the new post', () => {
    const state = run(initialState, { type: 'reply', slug: SAMPLE, body: 'Thanks', parentId: 'p4' })
    expect(lastPost(state, SAMPLE).parentId).toBe('p4')
  })

  it('react toggles the viewer’s reaction on and off', () => {
    const on = run(initialState, { type: 'react', slug: SAMPLE, postId: 'p1', emoji: '👍' })
    expect(postOf(on, SAMPLE, 'p1').reactions).toContainEqual({
      emoji: '👍',
      count: 5,
      reacted: true,
    })
    const off = run(on, { type: 'react', slug: SAMPLE, postId: 'p1', emoji: '👍' })
    expect(postOf(off, SAMPLE, 'p1').reactions).toContainEqual({
      emoji: '👍',
      count: 4,
      reacted: false,
    })

    const fresh = run(initialState, { type: 'react', slug: SAMPLE, postId: 'p1', emoji: '🚀' })
    expect(postOf(fresh, SAMPLE, 'p1').reactions).toContainEqual({
      emoji: '🚀',
      count: 1,
      reacted: true,
    })
    const dropped = run(fresh, { type: 'react', slug: SAMPLE, postId: 'p1', emoji: '🚀' })
    expect(postOf(dropped, SAMPLE, 'p1').reactions!.map((r) => r.emoji)).not.toContain('🚀')
  })

  it('vote moves the score by the change in the viewer’s vote', () => {
    const vote = (direction: 'up' | 'down' | null): ForumAction => ({
      type: 'vote',
      slug: SAMPLE,
      postId: 'p6',
      direction,
    })
    const up = run(initialState, vote('up'))
    expect(postOf(up, SAMPLE, 'p6').votes).toEqual({ score: 4, viewer: 'up' })
    const down = run(up, vote('down'))
    expect(postOf(down, SAMPLE, 'p6').votes).toEqual({ score: 2, viewer: 'down' })
    const cleared = run(up, vote(null))
    expect(postOf(cleared, SAMPLE, 'p6').votes).toEqual({ score: 3 })
  })

  it('vote on the first post edits the topic’s votes', () => {
    const state = run(initialState, { type: 'vote', slug: SAMPLE, postId: 'p1', direction: 'up' })
    expect(topicOf(state, SAMPLE).votes).toEqual({ score: 19, viewer: 'up' })
    expect(postOf(state, SAMPLE, 'p1').votes).toEqual(postOf(initialState, SAMPLE, 'p1').votes)
  })

  it('accept moves the single mark and keeps solvedCount consistent', () => {
    const solved = categoryOf(initialState, 'kemo-console').solvedCount

    const moved = run(initialState, { type: 'accept', slug: SAMPLE, postId: 'p7' })
    const accepted = topicOf(moved, SAMPLE).posts!.filter((p) => p.accepted)
    expect(accepted.map((p) => p.id)).toEqual(['p7'])
    expect(categoryOf(moved, 'kemo-console').solvedCount).toBe(solved)

    const answer = topicOf(initialState, UNSOLVED).posts![1]!.id
    const first = run(initialState, { type: 'accept', slug: UNSOLVED, postId: answer })
    expect(isSolved(topicOf(first, UNSOLVED))).toBe(true)
    expect(categoryOf(first, 'kemo-console').solvedCount).toBe(solved + 1)
    const again = run(first, { type: 'accept', slug: UNSOLVED, postId: answer })
    expect(categoryOf(again, 'kemo-console').solvedCount).toBe(solved + 1)
  })

  it('accept leaves the original post and nested replies alone', () => {
    expect(run(initialState, { type: 'accept', slug: SAMPLE, postId: 'p1' })).toBe(initialState)
    expect(run(initialState, { type: 'accept', slug: SAMPLE, postId: 'p5' })).toBe(initialState)
  })

  it('follow sets whether the viewer follows the topic', () => {
    const off = run(initialState, { type: 'follow', slug: SAMPLE, following: false })
    expect(topicOf(off, SAMPLE).following).toBe(false)
    const on = run(off, { type: 'follow', slug: SAMPLE, following: true })
    expect(topicOf(on, SAMPLE).following).toBe(true)
  })

  it('create adds a topic first, with a unique slug and one post, and counts it', () => {
    const values = {
      title: 'Where do Deployment drafts go?',
      categoryId: 'kemo-console',
      tags: ['yaml-editor'],
      body: 'First paragraph.\n\nSecond paragraph.',
    }
    const once = run(initialState, { type: 'create', ...values })
    const slug = slugFor(values.title, initialState.nextId)
    expect(once.order[0]).toBe(slug)
    const topic = topicOf(once, slug)
    expect(topic).toMatchObject({
      id: `t${initialState.nextId}`,
      slug,
      title: values.title,
      categoryId: 'kemo-console',
      tags: ['yaml-editor'],
      author: viewer,
      createdAt: once.now,
      lastActivityAt: once.now,
      replyCount: 0,
      viewCount: 0,
      votes: { score: 0 },
    })
    expect(topic.posts).toHaveLength(1)
    expect(topic.posts![0]).toMatchObject({
      author: viewer,
      postedAt: once.now,
      body: [
        { type: 'paragraph', content: 'First paragraph.' },
        { type: 'paragraph', content: 'Second paragraph.' },
      ],
    })
    expect(categoryOf(once, 'kemo-console').topicCount).toBe(
      categoryOf(initialState, 'kemo-console').topicCount + 1,
    )

    const twice = run(once, { type: 'create', ...values })
    expect(twice.order[0]).not.toBe(slug)
    expect(twice.order[1]).toBe(slug)
    expect(Object.keys(twice.topics)).toHaveLength(forumTopics.length + 2)
  })

  it('slugFor kebab-cases the title, at most 60 characters, then the number', () => {
    expect(slugFor('Console 4.2: what’s new?', 7)).toBe('console-4-2-whats-new-7')
    const long = slugFor('A'.repeat(30) + ' ' + 'b'.repeat(40), 12)
    expect(long).toBe(`${'a'.repeat(30)}-${'b'.repeat(29)}-12`)
    expect(slugFor('???', 3)).toBe('topic-3')
  })

  it('tick moves the clock by 30 s and changes nothing else', () => {
    const state = run(initialState, { type: 'tick' })
    expect(seconds(initialState.now, state.now)).toBe(CLOCK_TICK_MS / 1000)
    expect({ ...state, now: initialState.now }).toEqual(initialState)
  })

  it('moves the clock by a step with every change', () => {
    const actions: ForumAction[] = [
      { type: 'reply', slug: SAMPLE, body: 'Hi' },
      { type: 'react', slug: SAMPLE, postId: 'p2', emoji: '🎉' },
      { type: 'vote', slug: SAMPLE, postId: 'p4', direction: 'up' },
      { type: 'accept', slug: SAMPLE, postId: 'p7' },
      { type: 'follow', slug: SAMPLE, following: false },
      { type: 'create', title: 'New', categoryId: 'bug-reports', tags: [], body: 'Body' },
    ]
    let state = initialState
    for (const action of actions) {
      const next = forumReducer(state, action)
      expect(seconds(state.now, next.now)).toBe(STEP_MS / 1000)
      state = next
    }
  })

  it('ignores an unknown topic or post', () => {
    expect(run(initialState, { type: 'reply', slug: 'nope', body: 'Hi' })).toBe(initialState)
    expect(run(initialState, { type: 'react', slug: SAMPLE, postId: 'x', emoji: '👍' })).toBe(
      initialState,
    )
    expect(
      run(initialState, { type: 'create', title: 'T', categoryId: 'nope', tags: [], body: 'B' }),
    ).toBe(initialState)
  })

  it('never reads the wall clock: the same actions give the same state at any time', () => {
    const actions: ForumAction[] = [
      { type: 'reply', slug: SAMPLE, body: 'Hi', quoteOf: 'p4' },
      { type: 'tick' },
      { type: 'create', title: 'Clock', categoryId: 'kemo-console', tags: [], body: 'Body' },
      { type: 'react', slug: SAMPLE, postId: 'p1', emoji: '👀' },
    ]
    vi.useFakeTimers({ now: Date.parse('2001-01-01T00:00:00Z') })
    const early = run(initialState, ...actions)
    vi.setSystemTime(Date.parse('2099-06-30T12:00:00Z'))
    const late = run(initialState, ...actions)
    expect(late).toEqual(early)
    expect(seconds(FORUM_NOW, late.now)).toBe((3 * STEP_MS + CLOCK_TICK_MS) / 1000)
  })
})
