import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chrome, testPosts } from '../test-posts'
import type { BlogComment } from '../types'
import { EditorialListPost } from './post-page'

const sorted = testPosts // already newest first
const newest = sorted[0]!
const middle = sorted[3]!
const oldest = sorted[sorted.length - 1]!
const base = { ...chrome, variant: 'editorial-list' as const, posts: testPosts }

const comments: BlogComment[] = [
  { id: 'a', author: { name: 'Ada' }, postedAt: '2026-11-11T10:00:00Z', body: 'First' },
  { id: 'b', author: { name: 'Ben' }, postedAt: '2026-11-11T11:00:00Z', body: 'Second' },
]

describe('EditorialListPost', () => {
  it('renders the header band, body and author', () => {
    const { container } = render(<EditorialListPost {...base} post={newest} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(newest.title)
    expect(screen.getByRole('link', { name: '← All posts' })).toHaveAttribute('href', '/blog')
    expect(container.querySelector('time[datetime="2026-11-11T09:00:00Z"]')).not.toBeNull()
    expect(screen.getByText('Staff engineer, Console platform')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Where the time went' }),
    ).toBeInTheDocument()
  })

  it('links the older and newer posts', () => {
    render(<EditorialListPost {...base} post={middle} />)
    const nav = screen.getByRole('navigation', { name: 'More posts' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]).toHaveAttribute('href', '/blog/' + sorted[4]!.slug)
    expect(links[0]).toHaveTextContent('← Previous')
    expect(links[1]).toHaveAttribute('href', '/blog/' + sorted[2]!.slug)
    expect(links[1]).toHaveTextContent('Next →')
  })

  it('omits the newer side on the newest post and the older side on the oldest', () => {
    const { unmount } = render(<EditorialListPost {...base} post={newest} />)
    let nav = screen.getByRole('navigation', { name: 'More posts' })
    expect(within(nav).getAllByRole('link')).toHaveLength(1)
    expect(within(nav).getByRole('link')).toHaveTextContent('← Previous')
    expect(within(nav).queryByText(/Next/)).not.toBeInTheDocument()
    unmount()
    render(<EditorialListPost {...base} post={oldest} />)
    nav = screen.getByRole('navigation', { name: 'More posts' })
    expect(within(nav).getAllByRole('link')).toHaveLength(1)
    expect(within(nav).getByRole('link')).toHaveTextContent('Next →')
    expect(within(nav).queryByText(/Previous/)).not.toBeInTheDocument()
  })

  it('renders without neighbours when it is the only post', () => {
    render(<EditorialListPost {...base} post={newest} posts={[newest]} />)
    expect(screen.queryByRole('navigation', { name: 'More posts' })).toBeNull()
  })

  it('uses indexTitle for the back link', () => {
    render(<EditorialListPost {...base} post={newest} indexTitle="Notes" />)
    expect(screen.getByRole('link', { name: '← Notes' })).toHaveAttribute('href', '/blog')
  })

  it('shows comments between the author row and More posts, and none without the prop', async () => {
    const user = userEvent.setup()
    const onAddComment = vi.fn().mockResolvedValue(undefined)
    const { unmount } = render(
      <EditorialListPost {...base} post={middle} comments={comments} onAddComment={onAddComment} />,
    )
    const copy = screen.getByRole('button', { name: 'Copy link' })
    const heading = screen.getByRole('heading', { name: 'Comments (2)' })
    const nav = screen.getByRole('navigation', { name: 'More posts' })
    expect(copy.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    await user.type(screen.getByLabelText('Name'), 'Cy')
    await user.type(screen.getByLabelText('Comment'), 'Nice')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(onAddComment).toHaveBeenCalledWith({ name: 'Cy', body: 'Nice' })
    unmount()
    render(<EditorialListPost {...base} post={middle} />)
    expect(screen.queryByRole('heading', { name: /Comments/ })).not.toBeInTheDocument()
  })
})
