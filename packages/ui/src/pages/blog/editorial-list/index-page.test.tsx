import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chrome, testPosts } from '../test-posts'
import { EditorialListIndex } from './index-page'

const coldStart = 'How we cut cold-start time for cluster consoles by 62%'
const props = { ...chrome, variant: 'editorial-list' as const, title: 'Notes', posts: testPosts }

describe('EditorialListIndex', () => {
  it('renders one h1, the featured post once and the next six rows', () => {
    render(<EditorialListIndex {...props} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Notes')
    expect(screen.getByText('Featured')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(6)
    expect(screen.getAllByText(coldStart)).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Older posts' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('8 posts')
  })

  it('shows the long absolute date in each row, inside a time element', () => {
    render(<EditorialListIndex {...props} />)
    const time = within(screen.getAllByRole('article')[0]!).getAllByText('04 Nov 2026')[0]!
    expect(time.tagName).toBe('TIME')
    expect(time).toHaveAttribute('datetime', '2026-11-04T09:00:00Z')
  })

  it('reveals the rest', async () => {
    const user = userEvent.setup()
    render(<EditorialListIndex {...props} />)
    await user.click(screen.getByRole('button', { name: 'Older posts' }))
    expect(screen.getAllByRole('article')).toHaveLength(7)
    expect(screen.queryByRole('button', { name: 'Older posts' })).not.toBeInTheDocument()
  })

  it('filters by topic, hides the feature and announces the count', async () => {
    const user = userEvent.setup()
    render(<EditorialListIndex {...props} />)
    await user.click(screen.getByRole('button', { name: 'Releases' }))
    expect(screen.getByRole('button', { name: 'Releases' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('Featured')).not.toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(2)
    expect(screen.getByRole('status')).toHaveTextContent('2 posts in Releases')
  })

  it('shows the featured post in the rows when its topic is selected', async () => {
    const user = userEvent.setup()
    render(<EditorialListIndex {...props} />)
    await user.click(screen.getByRole('button', { name: 'Engineering' }))
    expect(screen.getAllByRole('article')).toHaveLength(4)
    expect(screen.getByRole('link', { name: coldStart })).toBeInTheDocument()
    expect(screen.queryByText('Featured')).not.toBeInTheDocument()
  })

  it('links every post through postHref and the host link', () => {
    const Link = vi.fn(({ children, ...rest }: React.ComponentProps<'a'>) => (
      <a data-host {...rest}>
        {children}
      </a>
    ))
    render(<EditorialListIndex {...props} linkComponent={Link} />)
    const feature = screen.getByRole('link', { name: coldStart })
    expect(feature).toHaveAttribute('href', '/blog/cold-start')
    expect(feature).toHaveAttribute('data-host')
    const rows = screen.getAllByRole('article')
    for (const row of rows) {
      const link = within(row).getByRole('heading', { level: 2 }).querySelector('a')!
      expect(link.getAttribute('href')).toMatch(/^\/blog\/[a-z0-9-]+$/)
      expect(link).toHaveAttribute('data-host')
    }
    expect(
      within(rows[0]!).getByRole('link', { name: 'Console 4.2: schema-aware YAML editing' }),
    ).toHaveAttribute('href', '/blog/console-4-2')
  })

  it('honours a controlled topic and offers a way back from an empty one', async () => {
    const user = userEvent.setup()
    const onTopicChange = vi.fn()
    render(<EditorialListIndex {...props} topic="nope" onTopicChange={onTopicChange} />)
    expect(screen.getByText('No posts in this topic.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all posts' }))
    expect(onTopicChange).toHaveBeenCalledWith(undefined)
  })

  it('renders an empty blog', () => {
    render(<EditorialListIndex {...props} posts={[]} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Notes' })).toBeInTheDocument()
    expect(screen.getByText('No posts yet.')).toBeInTheDocument()
    expect(screen.queryByText('Featured')).not.toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Topics' })).not.toBeInTheDocument()
  })
})
