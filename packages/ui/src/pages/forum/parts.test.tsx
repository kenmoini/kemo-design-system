import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Count, CategoryTile, RelativeTime, StatusBadge } from './parts'
import type { ForumCategory, ForumTopic } from './types'

const topic = (over: Partial<ForumTopic> = {}): ForumTopic => ({
  id: 't',
  slug: 't',
  title: 'T',
  excerpt: 'E',
  categoryId: 'c',
  author: { id: 'a', name: 'Ada' },
  createdAt: '2026-11-01T00:00:00Z',
  lastActivityAt: '2026-11-01T00:00:00Z',
  replyCount: 0,
  viewCount: 0,
  tags: [],
  ...over,
})

const category: ForumCategory = {
  id: 'console',
  label: 'Kemo Console',
  description: '',
  section: 'Product',
  topicCount: 1,
  postCount: 1,
  solvedCount: 0,
}

describe('StatusBadge', () => {
  it('shows Solved for an accepted post', () => {
    const posts = [
      { id: 'p1', author: { id: 'b', name: 'Bo' }, postedAt: '2026-11-01T00:00:00Z', body: [] },
      {
        id: 'p2',
        author: { id: 'b', name: 'Bo' },
        postedAt: '2026-11-02T00:00:00Z',
        body: [],
        accepted: true,
      },
    ]
    render(<StatusBadge topic={topic({ posts })} />)
    expect(screen.getByText('Solved')).toBeInTheDocument()
  })

  it('renders nothing for a plain topic', () => {
    const { container } = render(<StatusBadge topic={topic()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows Needs info and Pinned together, in order', () => {
    render(<StatusBadge topic={topic({ status: 'needs-info', pinned: true })} />)
    const texts = screen.getAllByText(/Needs info|Pinned/).map((n) => n.textContent)
    expect(texts).toEqual(['Needs info', 'Pinned'])
  })
})

describe('RelativeTime', () => {
  it('renders dateTime, title and the prefixed relative text', () => {
    render(<RelativeTime iso="2026-11-12T10:00:00Z" now="2026-11-12T12:00:00Z" prefix="Active" />)
    const el = screen.getByText('Active 2 h ago')
    expect(el.tagName).toBe('TIME')
    expect(el).toHaveAttribute('datetime', '2026-11-12T10:00:00Z')
    expect(el).toHaveAttribute('title', '12 Nov 2026, 10:00 UTC')
  })
})

describe('CategoryTile', () => {
  it('is aria-hidden and shows the first letter', () => {
    render(<CategoryTile category={category} />)
    const tile = screen.getByText('K')
    expect(tile).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('Count', () => {
  it('abbreviates on request', () => {
    render(<Count value={1234} abbreviate />)
    expect(screen.getByText('1.2k')).toBeInTheDocument()
  })
})
