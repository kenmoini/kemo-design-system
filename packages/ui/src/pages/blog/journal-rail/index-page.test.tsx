import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chrome, testPosts } from '../test-posts'
import { JournalRailIndex } from './index-page'

const props = {
  ...chrome,
  variant: 'journal-rail' as const,
  title: 'Platform journal',
  description: 'Notes from the team.',
  posts: testPosts,
}

/** The keys of `named`, sorted by where their elements sit in the document. */
const documentOrder = (named: Record<string, Element>) =>
  Object.entries(named)
    .sort(([, a], [, b]) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    .map(([name]) => name)

describe('JournalRailIndex', () => {
  it('puts the page in reading order: title, topics, the feed, then the subscribe card', () => {
    render(<JournalRailIndex {...props} onSubscribe={vi.fn().mockResolvedValue(undefined)} />)
    const title = screen.getByRole('heading', { level: 1 })
    expect(screen.getAllByRole('heading')[0]).toBe(title)
    expect(
      documentOrder({
        title,
        topics: screen.getByRole('navigation', { name: 'Topics' }),
        feed: screen.getAllByRole('article')[0]!,
        more: screen.getByRole('button', { name: 'Load older posts' }),
        subscribe: screen.getByRole('complementary', { name: 'Get new posts by email' }),
      }),
    ).toEqual(['title', 'topics', 'feed', 'more', 'subscribe'])
  })

  it('groups the first five posts by month with counts', () => {
    render(<JournalRailIndex {...props} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Platform journal')
    expect(screen.getAllByRole('article')).toHaveLength(5)
    const nov = screen.getByRole('region', { name: 'November 2026' })
    expect(nov).toHaveTextContent('2 posts')
    const oct = screen.getByRole('region', { name: 'October 2026' })
    expect(oct).toHaveTextContent('3 posts')
    expect(screen.queryByRole('heading', { name: 'September 2026' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Load older posts' })).toBeInTheDocument()
  })

  it('renders each item as day, title link, summary and byline', () => {
    const { container } = render(<JournalRailIndex {...props} />)
    const first = screen.getAllByRole('article')[0]!
    expect(within(first).getByRole('heading', { level: 3 })).toHaveTextContent(testPosts[0]!.title)
    expect(within(first).getByRole('link')).toHaveAttribute('href', '/blog/cold-start')
    expect(within(first).getByText(testPosts[0]!.summary)).toBeInTheDocument()
    expect(within(first).getByText('Priya Raman')).toBeInTheDocument()
    expect(within(first).getByText('9 min read')).toBeInTheDocument()
    const time = container.querySelector('article time[datetime="2026-11-11T09:00:00Z"]')
    expect(time).toHaveTextContent('11')
    expect(time).toHaveTextContent('Wed')
  })

  it('loads older posts', async () => {
    const user = userEvent.setup()
    render(<JournalRailIndex {...props} />)
    await user.click(screen.getByRole('button', { name: 'Load older posts' }))
    expect(screen.getAllByRole('article')).toHaveLength(8)
    expect(screen.getByRole('region', { name: 'September 2026' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load older posts' })).not.toBeInTheDocument()
  })

  it('lists topics with counts and filters', async () => {
    const user = userEvent.setup()
    render(<JournalRailIndex {...props} />)
    const nav = screen.getByRole('navigation', { name: 'Topics' })
    expect(within(nav).getByRole('button', { name: 'All posts 8' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(within(nav).getByRole('button', { name: 'Engineering 4' }))
    expect(within(nav).getByRole('button', { name: 'Engineering 4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('status')).toHaveTextContent('4 posts in Engineering')
    // counts come from all posts, not the filtered set
    expect(within(nav).getByRole('button', { name: 'All posts 8' })).toBeInTheDocument()
  })

  it('honours a controlled topic and shows the empty topic state', async () => {
    const user = userEvent.setup()
    const onTopicChange = vi.fn()
    render(<JournalRailIndex {...props} topic="nope" onTopicChange={onTopicChange} />)
    expect(screen.getByText('No posts in this topic.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all posts' }))
    expect(onTopicChange).toHaveBeenCalledWith(undefined)
  })

  it('holds a topic passed without onTopicChange', async () => {
    const user = userEvent.setup()
    render(<JournalRailIndex {...props} topic="releases" />)
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.click(screen.getByRole('button', { name: 'Engineering 4' }))
    expect(screen.getByRole('button', { name: 'Releases 2' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getAllByRole('article')).toHaveLength(2)
  })

  it('shows a thumbnail only for posts with an explicit cover', async () => {
    const user = userEvent.setup()
    const { container } = render(<JournalRailIndex {...props} />)
    const withCover = (n: number) => testPosts.slice(0, n).filter((p) => p.cover).length
    expect(container.querySelectorAll('[data-preset]')).toHaveLength(withCover(5))
    await user.click(screen.getByRole('button', { name: 'Load older posts' }))
    expect(container.querySelectorAll('[data-preset]')).toHaveLength(withCover(8))
    expect(withCover(8)).toBeLessThan(8)
  })

  it('puts the subscribe form in the rail and none in the top bar', () => {
    const onSubscribe = vi.fn().mockResolvedValue(undefined)
    const { unmount } = render(<JournalRailIndex {...props} onSubscribe={onSubscribe} />)
    const buttons = screen.getAllByRole('button', { name: 'Subscribe' })
    expect(buttons).toHaveLength(1)
    const rail = screen.getByRole('complementary')
    expect(rail).toContainElement(buttons[0]!)
    expect(within(rail).getByText('Get new posts by email')).toBeInTheDocument()
    unmount()
    render(<JournalRailIndex {...props} />)
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument()
    expect(screen.queryByText('Get new posts by email')).not.toBeInTheDocument()
  })

  it('renders an empty blog', () => {
    render(<JournalRailIndex {...props} posts={[]} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Platform journal' })).toBeInTheDocument()
    expect(screen.getByText('No posts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load older posts' })).not.toBeInTheDocument()
  })
})
