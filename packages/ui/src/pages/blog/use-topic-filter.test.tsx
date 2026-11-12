import { act, render, renderHook, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PostCountStatus } from './post-count-status'
import type { BlogPost } from './types'
import { useReveal } from './use-reveal'
import { useTopicFilter } from './use-topic-filter'

const author = { id: 'a', name: 'Ada' }

function post(slug: string, publishedAt: string, topicId: string, label: string): BlogPost {
  return {
    slug,
    title: slug,
    summary: `${slug} summary`,
    topic: { id: topicId, label },
    author,
    publishedAt,
    readingMinutes: 4,
    body: [],
  }
}

const posts = [
  post('a', '2026-11-01T00:00:00Z', 'releases', 'Releases'),
  post('b', '2026-11-03T00:00:00Z', 'design', 'Design'),
  post('c', '2026-11-02T00:00:00Z', 'releases', 'Releases'),
]

describe('useTopicFilter', () => {
  it('is uncontrolled by default and starts at defaultTopic', () => {
    const { result } = renderHook(() => useTopicFilter(posts, { defaultTopic: 'design' }))
    expect(result.current.topic).toBe('design')
    expect(result.current.visible.map((p) => p.slug)).toEqual(['b'])
    act(() => result.current.setTopic(undefined))
    expect(result.current.topic).toBeUndefined()
    expect(result.current.visible).toHaveLength(3)
    expect(result.current.sorted.map((p) => p.slug)).toEqual(['b', 'c', 'a'])
    expect(result.current.topics.map((t) => t.id)).toEqual(['design', 'releases'])
  })

  it('filters and reports the label', () => {
    const onTopicChange = vi.fn()
    const { result } = renderHook(() => useTopicFilter(posts, { onTopicChange }))
    act(() => result.current.setTopic('releases'))
    expect(result.current.visible.map((p) => p.slug)).toEqual(['c', 'a'])
    expect(result.current.topicLabel).toBe('Releases')
    expect(onTopicChange).toHaveBeenCalledWith('releases')
  })

  it('is controlled when topic and onTopicChange are passed', () => {
    const onTopicChange = vi.fn()
    const { result, rerender } = renderHook(
      (props: { topic: string | undefined }) =>
        useTopicFilter(posts, { topic: props.topic, onTopicChange }),
      { initialProps: { topic: undefined as string | undefined } },
    )
    act(() => result.current.setTopic('design'))
    expect(onTopicChange).toHaveBeenCalledWith('design')
    expect(result.current.topic).toBeUndefined()
    expect(result.current.visible).toHaveLength(3)
    rerender({ topic: 'design' })
    expect(result.current.topic).toBe('design')
    expect(result.current.visible).toHaveLength(1)
  })

  it('returns nothing visible for an unknown topic', () => {
    const { result } = renderHook(() => useTopicFilter(posts, { defaultTopic: 'nope' }))
    expect(result.current.visible).toEqual([])
    expect(result.current.topicLabel).toBeUndefined()
  })
})

describe('PostCountStatus', () => {
  it('words each case', () => {
    const { rerender } = render(<PostCountStatus count={8} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('8 posts')
    rerender(<PostCountStatus count={2} topic="releases" topicLabel="Releases" />)
    expect(screen.getByRole('status')).toHaveTextContent('2 posts in Releases')
    rerender(<PostCountStatus count={1} topic="design" topicLabel="Design" />)
    expect(screen.getByRole('status')).toHaveTextContent('1 post in Design')
    rerender(<PostCountStatus count={0} topic="nope" />)
    expect(screen.getByRole('status')).toHaveTextContent('No posts in this topic')
    rerender(<PostCountStatus count={0} topic="design" topicLabel="Design" />)
    expect(screen.getByRole('status')).toHaveTextContent('No posts in Design')
  })
})

describe('useReveal', () => {
  it('grows by the step and resets on key change', () => {
    const { result, rerender } = renderHook(({ key }) => useReveal(7, 3, key), {
      initialProps: { key: 'a' },
    })
    expect(result.current).toMatchObject({ shown: 3, hasMore: true })
    act(() => result.current.more())
    expect(result.current.shown).toBe(6)
    act(() => result.current.more())
    expect(result.current.shown).toBe(7)
    expect(result.current.hasMore).toBe(false)
    rerender({ key: 'b' })
    expect(result.current.shown).toBe(3)
    expect(result.current.hasMore).toBe(true)
  })
})
