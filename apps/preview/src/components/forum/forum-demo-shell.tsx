'use client'
import type { ForumTopic, ReactionEmoji, VoteDirection } from '@kemo/ui'
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react'
import {
  CLOCK_TICK_MS,
  type ForumState,
  forumReducer,
  initialState,
  slugFor,
} from '@/lib/forum-reducer'

/** How long the mock "API" takes to save anything. */
const SAVE_MS = 300
/** What a save whose text contains "fail" rejects with (the house convention). */
const SAVE_FAILED = 'The forum could not save that. Try again.'

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export interface ReplyInput {
  body: string
  parentId?: string
  quoteOf?: string
}

export interface NewTopicValues {
  title: string
  categoryId: string
  tags: string[]
  body: string
}

interface ForumDemoValue {
  state: ForumState
  /** Every topic, newest activity first. */
  topics: ForumTopic[]
  /** Rejects when the body contains "fail". */
  reply: (slug: string, input: ReplyInput) => Promise<void>
  react: (slug: string, postId: string, emoji: ReactionEmoji) => Promise<void>
  vote: (slug: string, postId: string, direction: VoteDirection) => Promise<void>
  accept: (slug: string, postId: string) => Promise<void>
  follow: (slug: string, following: boolean) => Promise<void>
  /** Resolves to the new topic's slug; rejects when the body contains "fail". */
  create: (values: NewTopicValues) => Promise<string>
}

const ForumDemoContext = createContext<ForumDemoValue | null>(null)

export function useForumDemo(): ForumDemoValue {
  const value = useContext(ForumDemoContext)
  if (!value) throw new Error('The forum demo needs ForumDemoShell (app/forum).')
  return value
}

/**
 * The state of every `/forum/*` route, kept while the pages (and the variations) change
 * underneath, so a reply or a new topic survives a trip to another page. Also owns the clock's
 * tick.
 */
export function ForumDemoShell({ children }: Readonly<{ children: ReactNode }>) {
  const [state, dispatch] = useReducer(forumReducer, initialState)
  // The latest state, for `create`, which names the new topic after its mock delay.
  const latest = useRef(state)
  useEffect(() => {
    latest.current = state
  }, [state])

  // Time passes while the page shows, so the ages move.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') dispatch({ type: 'tick' })
    }, CLOCK_TICK_MS)
    return () => window.clearInterval(timer)
  }, [])

  const topics = useMemo(
    () => state.order.flatMap((slug) => state.topics[slug] ?? []),
    [state.order, state.topics],
  )

  // Rebuilt only when the state changes, so consumers of the context do not re-render for nothing.
  const value = useMemo<ForumDemoValue>(
    () => ({
      state,
      topics,
      reply: async (slug, input) => {
        await wait(SAVE_MS)
        if (input.body.includes('fail')) throw new Error(SAVE_FAILED)
        dispatch({ type: 'reply', slug, ...input })
      },
      react: async (slug, postId, emoji) => {
        await wait(SAVE_MS)
        dispatch({ type: 'react', slug, postId, emoji })
      },
      vote: async (slug, postId, direction) => {
        await wait(SAVE_MS)
        dispatch({ type: 'vote', slug, postId, direction })
      },
      accept: async (slug, postId) => {
        await wait(SAVE_MS)
        dispatch({ type: 'accept', slug, postId })
      },
      follow: async (slug, following) => {
        await wait(SAVE_MS)
        dispatch({ type: 'follow', slug, following })
      },
      create: async (values) => {
        await wait(SAVE_MS)
        if (values.body.includes('fail')) throw new Error(SAVE_FAILED)
        // The reducer names the topic after the id it is about to use.
        const slug = slugFor(values.title, latest.current.nextId)
        dispatch({ type: 'create', ...values })
        return slug
      },
    }),
    [state, topics],
  )

  return <ForumDemoContext.Provider value={value}>{children}</ForumDemoContext.Provider>
}
