import { act, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { chrome, testPosts } from '../test-posts'
import { tocOf } from '../content'
import type { BlogComment } from '../types'
import { JournalRailPost } from './post-page'

const post = testPosts[0]!
const base = { ...chrome, variant: 'journal-rail' as const, posts: testPosts, post }
const toc = tocOf(post.body)

const comments: BlogComment[] = [
  {
    id: 'a',
    author: { name: 'Ada' },
    postedAt: '2026-11-11T10:00:00Z',
    body: 'First',
    replies: [{ id: 'a1', author: { name: 'Cy' }, postedAt: '2026-11-11T10:30:00Z', body: 'Re' }],
  },
  { id: 'b', author: { name: 'Ben' }, postedAt: '2026-11-11T11:00:00Z', body: 'Second' },
]

afterEach(() => {
  window.location.hash = ''
})

/** The keys of `named`, sorted by where their elements sit in the document. */
const documentOrder = (named: Record<string, Element>) =>
  Object.entries(named)
    .sort(([, a], [, b]) =>
      a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    )
    .map(([name]) => name)

describe('JournalRailPost', () => {
  it('puts the page in reading order: back link, details, title, body, Copy link, comments', () => {
    render(<JournalRailPost {...base} comments={comments} />)
    expect(
      documentOrder({
        back: screen.getByRole('link', { name: '← All posts' }),
        details: screen.getByText('Author', { selector: 'dt' }).closest('dl')!,
        title: screen.getByRole('heading', { level: 1 }),
        body: screen.getByText(/Opening a cluster used to take/).closest('article')!,
        copy: screen.getByRole('button', { name: 'Copy link' }),
        comments: screen.getByRole('region', { name: 'Comments (3)' }),
      }),
    ).toEqual(['back', 'details', 'title', 'body', 'copy', 'comments'])
  })

  it('lists the sections and marks the current one', () => {
    render(<JournalRailPost {...base} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const links = within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole(
      'link',
    )
    expect(links.map((l) => l.textContent)).toEqual(toc.map((t) => t.text))
    expect(links.map((l) => l.getAttribute('href'))).toEqual(toc.map((t) => `#${t.id}`))
    expect(links[0]).toHaveAttribute('aria-current', 'location')
    expect(links[1]).not.toHaveAttribute('aria-current')
  })

  it('follows the hash', () => {
    render(<JournalRailPost {...base} />)
    act(() => {
      window.location.hash = `#${toc[1]!.id}`
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    const links = within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole(
      'link',
    )
    expect(links[1]).toHaveAttribute('aria-current', 'location')
    expect(links[0]).not.toHaveAttribute('aria-current')
  })

  it('omits On this page when the body has no headings', () => {
    render(<JournalRailPost {...base} post={{ ...post, body: [] }} />)
    expect(screen.queryByRole('navigation', { name: 'On this page' })).not.toBeInTheDocument()
    expect(screen.getByText('Details')).toBeInTheDocument()
    expect(screen.getByText('Author')).toBeInTheDocument()
  })

  it('shows comments after the body and lists Comments last in On this page', () => {
    const { unmount } = render(<JournalRailPost {...base} comments={comments} />)
    const links = within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole(
      'link',
    )
    const last = links[links.length - 1]!
    expect(last).toHaveAttribute('href', '#comments')
    expect(last).toHaveTextContent('Comments 3')
    const main = screen.getByRole('main')
    expect(within(main).getByRole('heading', { name: 'Comments (3)' })).toBeInTheDocument()
    unmount()
    render(<JournalRailPost {...base} />)
    expect(screen.queryByRole('heading', { name: /Comments/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Comments/ })).not.toBeInTheDocument()
  })

  it('lists Comments in On this page even when the body has no headings', () => {
    render(<JournalRailPost {...base} post={{ ...post, body: [] }} comments={comments} />)
    const links = within(screen.getByRole('navigation', { name: 'On this page' })).getAllByRole(
      'link',
    )
    expect(links).toHaveLength(1)
    expect(links[0]).toHaveAttribute('href', '#comments')
  })

  it('renders the details and the back link', () => {
    const { container } = render(<JournalRailPost {...base} indexTitle="Platform journal" />)
    expect(screen.getByRole('link', { name: '← Platform journal' })).toHaveAttribute(
      'href',
      '/blog',
    )
    const terms = [...container.querySelectorAll('dt')].map((t) => t.textContent)
    expect(terms).toEqual(['Author', 'Published', 'Topic', 'Reading'])
    const defs = [...container.querySelectorAll('dd')].map((d) => d.textContent)
    expect(defs).toEqual(['Priya Raman', '11 Nov 2026', 'Engineering', '9 min'])
    expect(screen.getAllByRole('button', { name: 'Copy link' })).toHaveLength(1)
  })

  it('defaults the back link to All posts', () => {
    render(<JournalRailPost {...base} />)
    expect(screen.getByRole('link', { name: '← All posts' })).toBeInTheDocument()
  })

  it('renders the summary, the body and no top-bar Subscribe', () => {
    render(<JournalRailPost {...base} onSubscribe={() => Promise.resolve()} />)
    expect(screen.getByText(post.summary)).toBeInTheDocument()
    expect(screen.getByRole('article')).toHaveTextContent('Opening a cluster used to take')
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument()
  })

  it('links the older post in the footer, and nothing when alone', () => {
    const { unmount } = render(<JournalRailPost {...base} />)
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: `← ${testPosts[1]!.title}` })).toHaveAttribute(
      'href',
      '/blog/console-4-2',
    )
    unmount()
    render(<JournalRailPost {...base} posts={[post]} />)
    expect(within(screen.getByRole('contentinfo')).queryByRole('link')).not.toBeInTheDocument()
  })

  it("lets the host's footer win over the older-post link", () => {
    render(<JournalRailPost {...base} footer={<span>Host footer</span>} />)
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByText('Host footer')).toBeInTheDocument()
    expect(within(footer).queryByRole('link')).not.toBeInTheDocument()
  })
})
