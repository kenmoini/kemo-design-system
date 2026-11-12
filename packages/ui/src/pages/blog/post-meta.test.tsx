import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthorBlock, Byline } from './post-meta'
import type { BlogPost } from './types'

const post: BlogPost = {
  slug: 'ship-it',
  title: 'Ship it',
  summary: 'Summary',
  topic: { id: 'ops', label: 'Ops' },
  author: { id: 'priya', name: 'Priya Raman', role: 'Staff engineer' },
  publishedAt: '2026-11-11T09:00:00Z',
  readingMinutes: 9,
  body: [],
}

describe('Byline', () => {
  it('renders author, date and reading time', () => {
    render(<Byline post={post} />)
    expect(screen.getByText('Priya Raman')).toBeInTheDocument()
    expect(screen.getByText('11 Nov 2026').closest('time')).toHaveAttribute(
      'dateTime',
      '2026-11-11T09:00:00Z',
    )
    expect(screen.getByText('9 min read')).toBeInTheDocument()
  })

  it('renders only the requested parts', () => {
    render(<Byline post={post} show={['author', 'shortDate']} />)
    expect(screen.getByText('Priya Raman')).toBeInTheDocument()
    expect(screen.getByText('11 Nov')).toBeInTheDocument()
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument()
    expect(screen.queryByText('11 Nov 2026')).not.toBeInTheDocument()
  })
})

describe('AuthorBlock', () => {
  it('shows the role under the author name', () => {
    render(<AuthorBlock author={post.author} />)
    expect(screen.getByText('Priya Raman')).toBeInTheDocument()
    expect(screen.getByText('Staff engineer')).toBeInTheDocument()
  })

  it('prefers an explicit detail over the role', () => {
    render(<AuthorBlock author={post.author} detail="Writes about ops" />)
    expect(screen.getByText('Writes about ops')).toBeInTheDocument()
    expect(screen.queryByText('Staff engineer')).not.toBeInTheDocument()
  })
})
