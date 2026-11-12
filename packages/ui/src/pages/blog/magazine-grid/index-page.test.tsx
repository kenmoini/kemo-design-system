import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chrome, testPosts } from '../test-posts'
import { MagazineGridIndex } from './index-page'

const coldStart = 'How we cut cold-start time for cluster consoles by 62%'
const props = { ...chrome, variant: 'magazine-grid' as const, title: 'Notes', posts: testPosts }

describe('MagazineGridIndex', () => {
  it('leads with the newest post and paginates the rest six to a page', () => {
    render(<MagazineGridIndex {...props} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Notes')
    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(7) // the hero and six cards
    expect(within(articles[0]!).getByRole('heading', { level: 2 })).toHaveTextContent(coldStart)
    expect(screen.getAllByText(coldStart)).toHaveLength(1)
    expect(screen.getByRole('navigation', { name: 'Pagination' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('8 posts')
  })

  it('moves to the second page', async () => {
    const user = userEvent.setup()
    render(<MagazineGridIndex {...props} />)
    const first = screen.getAllByRole('article')[1]!
    const firstTitle = within(first).getByRole('heading').textContent!
    await user.click(screen.getByRole('button', { name: /page 2/i }))
    expect(screen.getAllByRole('article')).toHaveLength(2) // the hero and the one left over
    expect(screen.queryByText(firstTitle)).not.toBeInTheDocument()
  })

  it('filters by tab, hides the hero and returns to page one', async () => {
    const user = userEvent.setup()
    render(<MagazineGridIndex {...props} />)
    await user.click(screen.getByRole('button', { name: /page 2/i }))
    await user.click(screen.getByRole('tab', { name: 'Engineering' }))
    expect(screen.getByRole('tab', { name: 'Engineering' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('link', { name: coldStart })).toBeInTheDocument()
    expect(screen.queryByRole('navigation', { name: 'Pagination' })).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('4 posts in Engineering')
  })

  it('makes the whole card one link', () => {
    const Link = vi.fn(({ children, ...rest }: React.ComponentProps<'a'>) => (
      <a data-host {...rest}>
        {children}
      </a>
    ))
    render(<MagazineGridIndex {...props} linkComponent={Link} />)
    const articles = screen.getAllByRole('article')
    for (const article of articles) {
      const links = within(article).getAllByRole('link')
      expect(links).toHaveLength(1)
      expect(links[0]!.getAttribute('href')).toMatch(/^\/blog\/[a-z0-9-]+$/)
      expect(links[0]).toHaveAttribute('data-host')
    }
    expect(within(articles[0]!).getByRole('link')).toHaveAttribute('href', '/blog/cold-start')
    expect(within(articles[1]!).getByRole('link')).toHaveAttribute('href', '/blog/console-4-2')
  })

  it('honours a controlled topic', async () => {
    const user = userEvent.setup()
    const onTopicChange = vi.fn()
    const { rerender } = render(
      <MagazineGridIndex {...props} topic="releases" onTopicChange={onTopicChange} />,
    )
    expect(screen.getByRole('tab', { name: 'Releases' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getAllByRole('article')).toHaveLength(2)
    await user.click(screen.getByRole('tab', { name: 'All posts' }))
    expect(onTopicChange).toHaveBeenCalledWith(undefined)
    rerender(<MagazineGridIndex {...props} topic="nope" onTopicChange={onTopicChange} />)
    expect(screen.getByText('No posts in this topic.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all posts' }))
    expect(onTopicChange).toHaveBeenLastCalledWith(undefined)
  })

  it('renders an empty blog', () => {
    render(<MagazineGridIndex {...props} posts={[]} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText('No posts yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })
})
