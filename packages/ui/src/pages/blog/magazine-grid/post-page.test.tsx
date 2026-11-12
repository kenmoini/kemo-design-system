import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { chrome, testPosts } from '../test-posts'
import type { BlogComment } from '../types'
import { MagazineGridPost } from './post-page'

const post = { ...testPosts[3]!, tags: ['kubernetes', 'rbac'] }
const base = { ...chrome, variant: 'magazine-grid' as const, posts: testPosts, post }

const comments: BlogComment[] = [
  { id: 'a', author: { name: 'Ada' }, postedAt: '2026-11-11T10:00:00Z', body: 'First' },
  { id: 'b', author: { name: 'Ben' }, postedAt: '2026-11-11T11:00:00Z', body: 'Second' },
]

afterEach(() => {
  vi.unstubAllGlobals()
  Reflect.deleteProperty(navigator, 'share')
})

describe('MagazineGridPost', () => {
  it('renders the centred header, cover, body and tags', () => {
    const { container } = render(<MagazineGridPost {...base} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(post.title)
    expect(screen.getAllByText(post.author.name).length).toBeGreaterThan(0)
    expect(
      screen.getByText(
        (_, el) => el?.tagName === 'P' && el.textContent === '08 Oct 2026 · 6 min read',
      ),
    ).toBeInTheDocument()
    expect(container.querySelector(`time[datetime="${post.publishedAt}"]`)).not.toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'The detail' })).toBeInTheDocument()
    const tags = within(screen.getByRole('list', { name: 'Tags' })).getAllByRole('listitem')
    expect(tags.map((t) => t.textContent)).toEqual(['kubernetes', 'rbac'])
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
  })

  it('offers Share only where the browser supports it', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<MagazineGridPost {...base} />)
    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument()
    unmount()
    const share = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'share', { value: share, configurable: true })
    render(<MagazineGridPost {...base} />)
    await user.click(await screen.findByRole('button', { name: 'Share' }))
    expect(share).toHaveBeenCalledWith({ title: post.title, url: window.location.href })
  })

  it('swallows a cancelled share', async () => {
    const user = userEvent.setup()
    const unhandled = vi.fn()
    process.on('unhandledRejection', unhandled)
    try {
      const share = vi.fn().mockRejectedValue(new DOMException('cancelled', 'AbortError'))
      Object.defineProperty(navigator, 'share', { value: share, configurable: true })
      render(<MagazineGridPost {...base} />)
      await user.click(await screen.findByRole('button', { name: 'Share' }))
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(share).toHaveBeenCalled()
      expect(unhandled).not.toHaveBeenCalled()
    } finally {
      process.off('unhandledRejection', unhandled)
    }
  })

  it('suggests three other posts, same topic first, never itself', () => {
    render(<MagazineGridPost {...base} />)
    const region = screen.getByRole('region', { name: 'Keep reading' })
    const articles = within(region).getAllByRole('article')
    expect(articles).toHaveLength(3)
    expect(within(region).queryByText(post.title)).not.toBeInTheDocument()
    const topicOf = (slug: string) => testPosts.find((p) => p.slug === slug)!.topic.id
    const hrefs = articles.map((a) => within(a).getByRole('link').getAttribute('href')!)
    const sameCount = testPosts.filter(
      (p) => p.topic.id === post.topic.id && p.slug !== post.slug,
    ).length
    hrefs.slice(0, Math.min(3, sameCount)).forEach((h) => {
      expect(topicOf(h.replace('/blog/', ''))).toBe(post.topic.id)
    })
    for (const a of articles) expect(within(a).getByRole('heading', { level: 3 })).toBeVisible()
  })

  it('shows comments between the tags row and Keep reading, and none without the prop', () => {
    const { unmount } = render(<MagazineGridPost {...base} comments={comments} />)
    const copy = screen.getByRole('button', { name: 'Copy link' })
    const heading = screen.getByRole('heading', { name: 'Comments (2)' })
    const keep = screen.getByRole('heading', { name: 'Keep reading' })
    expect(copy.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(heading.compareDocumentPosition(keep) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    unmount()
    render(<MagazineGridPost {...base} />)
    expect(screen.queryByRole('heading', { name: /Comments/ })).not.toBeInTheDocument()
  })

  it('omits Keep reading and tags when there is nothing to show', () => {
    render(<MagazineGridPost {...base} post={{ ...post, tags: undefined }} posts={[post]} />)
    expect(screen.queryByRole('region', { name: 'Keep reading' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Tags' })).not.toBeInTheDocument()
  })
})
