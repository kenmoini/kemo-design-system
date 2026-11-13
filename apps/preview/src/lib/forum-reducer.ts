import {
  firstParagraphText,
  type ForumCategory,
  type ForumPost,
  type ForumReaction,
  type ForumTopic,
  type ForumUser,
  isSolved,
  paragraphsOf,
  type ReactionEmoji,
  type VoteDirection,
} from '@kemo/ui'
import { FORUM_NOW, forumCategories, forumTopics, shiftTime, viewer } from './mock-forum'

// The forum demo's in-memory state. Every change goes through `forumReducer`, so it stays pure and
// deterministic: new ids come from `nextId` and times from the demo clock, `now`. The clock never
// reads the wall clock: every change moves it on by `STEP_MS`, so a new post reads "just now", and
// the shell's `tick` moves it half a minute at a time while the page is open, so the ages move.

export interface ForumState {
  categories: ForumCategory[]
  /** By slug. */
  topics: Record<string, ForumTopic>
  /** Slugs, newest activity first. */
  order: string[]
  /** The demo clock. */
  now: string
  /** The number in the next new post's and topic's id. */
  nextId: number
  viewer: ForumUser
}

export type ForumAction =
  /** A new post by the viewer: nested under `parentId`, quoting the post `quoteOf`. */
  | { type: 'reply'; slug: string; body: string; parentId?: string; quoteOf?: string }
  /** Toggle the viewer's `emoji` on a post. */
  | { type: 'react'; slug: string; postId: string; emoji: ReactionEmoji }
  /** The viewer's vote on a post; on the first post, the topic's vote. */
  | { type: 'vote'; slug: string; postId: string; direction: VoteDirection }
  /** Mark `postId` as the accepted answer, unmarking any other. */
  | { type: 'accept'; slug: string; postId: string }
  | { type: 'follow'; slug: string; following: boolean }
  | { type: 'create'; title: string; categoryId: string; tags: string[]; body: string }
  /** Time passes: the clock moves on by `CLOCK_TICK_MS`. */
  | { type: 'tick' }

/** How far the clock moves with each change. */
export const STEP_MS = 3000
/** How far the clock moves with each `tick`, and how often the shell sends one. */
export const CLOCK_TICK_MS = 30_000

const step = (state: ForumState) => shiftTime(state.now, STEP_MS)

const SLUG_LENGTH = 60

/** A new topic's slug: the title in kebab-case, at most 60 characters, then `-{n}`. */
export function slugFor(title: string, n: number): string {
  const kebab = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_LENGTH)
    .replace(/-+$/, '')
  return `${kebab || 'topic'}-${n}`
}

/** One more than the highest number in a seeded post id (`p45` gives 46), so ids never repeat. */
function firstFreeId(topics: ForumTopic[]): number {
  let highest = 0
  for (const t of topics) {
    for (const p of t.posts ?? []) highest = Math.max(highest, Number(p.id.slice(1)) || 0)
  }
  return highest + 1
}

const byActivity = (a: ForumTopic, b: ForumTopic) =>
  Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt) || (a.slug < b.slug ? -1 : 1)

export const initialState: ForumState = {
  categories: forumCategories,
  topics: Object.fromEntries(forumTopics.map((t) => [t.slug, t])),
  order: [...forumTopics].sort(byActivity).map((t) => t.slug),
  now: FORUM_NOW,
  nextId: firstFreeId(forumTopics),
  viewer,
}

const toFront = (order: string[], slug: string) => [slug, ...order.filter((s) => s !== slug)]

function updateCategory(
  categories: ForumCategory[],
  id: string,
  update: (category: ForumCategory) => ForumCategory,
): ForumCategory[] {
  return categories.map((c) => (c.id === id ? update(c) : c))
}

/** `reactions` with the viewer's `emoji` toggled; a reaction nobody holds any more is dropped. */
function toggleReaction(reactions: ForumReaction[], emoji: ReactionEmoji): ForumReaction[] {
  const current = reactions.find((r) => r.emoji === emoji)
  if (!current) return [...reactions, { emoji, count: 1, reacted: true }]
  const reacted = !current.reacted
  const count = current.count + (reacted ? 1 : -1)
  if (count <= 0) return reactions.filter((r) => r !== current)
  return reactions.map((r) => (r === current ? { ...r, count, reacted } : r))
}

const weight = (direction: VoteDirection | undefined) =>
  direction === 'up' ? 1 : direction === 'down' ? -1 : 0

type Votes = NonNullable<ForumPost['votes']>

/** `votes` after the viewer's vote changes to `direction`. */
function castVote(votes: Votes | undefined, direction: VoteDirection): Votes {
  const score = (votes?.score ?? 0) + weight(direction) - weight(votes?.viewer)
  return direction ? { score, viewer: direction } : { score }
}

export function forumReducer(state: ForumState, action: ForumAction): ForumState {
  if (action.type === 'tick') return { ...state, now: shiftTime(state.now, CLOCK_TICK_MS) }

  if (action.type === 'create') {
    if (!state.categories.some((c) => c.id === action.categoryId)) return state
    const at = step(state)
    const slug = slugFor(action.title, state.nextId)
    const first: ForumPost = {
      id: `p${state.nextId}`,
      author: state.viewer,
      postedAt: at,
      body: paragraphsOf(action.body),
      reactions: [],
      votes: { score: 0 },
    }
    const created: ForumTopic = {
      id: `t${state.nextId}`,
      slug,
      title: action.title,
      excerpt: firstParagraphText(first),
      categoryId: action.categoryId,
      author: state.viewer,
      createdAt: at,
      lastActivityAt: at,
      replyCount: 0,
      viewCount: 0,
      votes: { score: 0 },
      tags: action.tags,
      posts: [first],
    }
    return {
      ...state,
      categories: updateCategory(state.categories, action.categoryId, (c) => ({
        ...c,
        topicCount: c.topicCount + 1,
        postCount: c.postCount + 1,
      })),
      topics: { ...state.topics, [slug]: created },
      order: [slug, ...state.order],
      now: at,
      nextId: state.nextId + 1,
    }
  }

  const topic = state.topics[action.slug]
  if (!topic) return state
  /** `state` with the topic changed, the clock moved on and anything in `rest` replaced. */
  const changed = (next: ForumTopic, rest: Partial<ForumState> = {}): ForumState => ({
    ...state,
    topics: { ...state.topics, [topic.slug]: next },
    now: step(state),
    ...rest,
  })

  switch (action.type) {
    case 'follow':
      if ((topic.following ?? false) === action.following) return state
      return changed({ ...topic, following: action.following })

    case 'reply': {
      if (!topic.posts) return state
      const at = step(state)
      const quoted = topic.posts.find((p) => p.id === action.quoteOf)
      const post: ForumPost = {
        id: `p${state.nextId}`,
        author: state.viewer,
        postedAt: at,
        body: paragraphsOf(action.body),
        parentId: action.parentId,
        quote: quoted && { author: quoted.author, excerpt: firstParagraphText(quoted) },
        reactions: [],
        votes: { score: 0 },
      }
      return changed(
        {
          ...topic,
          posts: [...topic.posts, post],
          replyCount: topic.replyCount + 1,
          lastActivityAt: at,
        },
        {
          categories: updateCategory(state.categories, topic.categoryId, (c) => ({
            ...c,
            postCount: c.postCount + 1,
          })),
          order: toFront(state.order, topic.slug),
          nextId: state.nextId + 1,
        },
      )
    }

    case 'react': {
      const post = topic.posts?.find((p) => p.id === action.postId)
      if (!topic.posts || !post) return state
      const reactions = toggleReaction(post.reactions ?? [], action.emoji)
      return changed({
        ...topic,
        posts: topic.posts.map((p) => (p === post ? { ...p, reactions } : p)),
      })
    }

    case 'vote': {
      const post = topic.posts?.find((p) => p.id === action.postId)
      if (!topic.posts || !post) return state
      // The first post is the question: its votes are the topic's.
      if (post === topic.posts[0]) {
        return changed({ ...topic, votes: castVote(topic.votes, action.direction) })
      }
      const votes = castVote(post.votes, action.direction)
      return changed({
        ...topic,
        posts: topic.posts.map((p) => (p === post ? { ...p, votes } : p)),
      })
    }

    case 'accept': {
      const post = topic.posts?.find((p) => p.id === action.postId)
      // Only an answer can be accepted: a top-level post other than the first.
      if (!topic.posts || !post || post === topic.posts[0] || post.parentId !== undefined) {
        return state
      }
      if (post.accepted) return state
      const wasSolved = isSolved(topic)
      return changed(
        {
          ...topic,
          posts: topic.posts.map((p) =>
            p === post ? { ...p, accepted: true } : p.accepted ? { ...p, accepted: false } : p,
          ),
        },
        wasSolved
          ? {}
          : {
              categories: updateCategory(state.categories, topic.categoryId, (c) => ({
                ...c,
                solvedCount: c.solvedCount + 1,
              })),
            },
      )
    }
  }
}
