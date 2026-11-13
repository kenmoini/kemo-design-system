import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { participantsOf } from '../content'
import { chrome, dan, testCategories, testTopics, TEST_NOW } from '../test-data'
import type { ForumPost } from '../types'
import { DiscussionsTopic } from './topic-page'

const topic = testTopics.find((t) => t.slug === 'schema-browser-crd')!
const category = testCategories.find((c) => c.id === topic.categoryId)!
const props = { ...chrome, variant: 'discussions' as const, topic, category }
const article = (id: string) => document.getElementById(`post-${id}`)!
const repliesList = () => screen.getByRole('list', { name: 'Replies' })
const topLevelIds = () =>
  Array.from(repliesList().children)
    .map((li) => li.querySelector(':scope > article')?.id)
    .filter(Boolean)

describe('DiscussionsTopic', () => {
  it('renders the breadcrumb, one h1 and the meta line', () => {
    render(<DiscussionsTopic {...props} />)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Discussions' })).toHaveAttribute(
      'href',
      '/forum/boards',
    )
    expect(within(crumbs).getByRole('link', { name: 'Kemo Console' })).toHaveAttribute(
      'href',
      '/forum/boards/c/kemo-console',
    )
    expect(crumbs.querySelector('[aria-current]')).toBeNull()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(topic.title)
    const n = participantsOf(topic).length
    expect(screen.getByText(new RegExp(`12 replies · ${n} participants`))).toBeInTheDocument()
  })

  it('without onReply has no composer or Reply buttons and links to sign in', () => {
    render(<DiscussionsTopic {...props} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Reply/ })).not.toBeInTheDocument()
    expect(screen.getByText(/to reply\./)).toHaveTextContent('Sign in to reply.')
    expect(
      within(screen.getByText(/to reply\./)).getByRole('link', { name: 'Sign in' }),
    ).toHaveAttribute('href', '/login')
  })

  it('keeps the original post out of the replies list', () => {
    render(<DiscussionsTopic {...props} />)
    expect(article('p1')).toBeInTheDocument()
    expect(repliesList()).not.toContainElement(article('p1'))
    expect(screen.getByRole('heading', { level: 2, name: '12 replies' })).toBeInTheDocument()
  })

  it('lifts the accepted reply first, labelled, with its nested replies', () => {
    render(<DiscussionsTopic {...props} />)
    expect(topLevelIds()[0]).toBe('post-p4')
    const accepted = article('p4')
    expect(within(accepted).getByText('Answer · marked by Jonas Lindqvist')).toBeInTheDocument()
    const nested = within(accepted).getAllByRole('article')
    expect(nested.map((a) => a.id)).toEqual(['post-p5', 'post-p6'])
    expect(within(nested[0]!).getByText('Jonas Lindqvist')).toBeInTheDocument()
    expect(within(nested[1]!).getByText('Mei Tanaka')).toBeInTheDocument()
    expect(within(nested[0]!).getByText('Author')).toBeInTheDocument()
  })

  it("carries Jonas's reply nested under Dan's", () => {
    render(<DiscussionsTopic {...props} />)
    const nested = within(article('p2')).getAllByRole('article')
    expect(nested.map((a) => a.id)).toEqual(['post-p3'])
  })

  it('nests a post replying to the original inside the original, not in the replies list', () => {
    const child: ForumPost = {
      id: 'pc',
      parentId: 'p1',
      author: dan,
      postedAt: TEST_NOW,
      body: [{ type: 'paragraph', content: 'Following up on the original.' }],
    }
    render(<DiscussionsTopic {...props} topic={{ ...topic, posts: [...topic.posts!, child] }} />)
    expect(within(article('p1')).getByText('Following up on the original.')).toBeInTheDocument()
    expect(repliesList()).not.toContainElement(article('pc'))
    expect(topLevelIds()).not.toContain('post-pc')
  })

  it('renders an orphan parentId as a top-level reply', () => {
    const orphan: ForumPost = {
      id: 'px',
      parentId: 'nope',
      author: dan,
      postedAt: TEST_NOW,
      body: [{ type: 'paragraph', content: 'Orphaned.' }],
    }
    render(<DiscussionsTopic {...props} topic={{ ...topic, posts: [...topic.posts!, orphan] }} />)
    expect(article('px').parentElement?.parentElement).toBe(repliesList())
  })

  it('Top reorders by reactions but keeps the answer first', async () => {
    const user = userEvent.setup()
    const reacted: ForumPost[] = topic.posts!.map((p) =>
      p.id === 'p9' ? { ...p, reactions: [{ emoji: '👍', count: 5 }] } : p,
    )
    render(<DiscussionsTopic {...props} topic={{ ...topic, posts: reacted }} />)
    expect(screen.getByRole('button', { name: 'Oldest' })).toHaveAttribute('aria-pressed', 'true')
    const oldest = topLevelIds()
    expect(oldest.indexOf('post-p7')).toBeLessThan(oldest.indexOf('post-p9'))
    await user.click(screen.getByRole('button', { name: 'Top' }))
    expect(screen.getByRole('button', { name: 'Top' })).toHaveAttribute('aria-pressed', 'true')
    const top = topLevelIds()
    expect(top[0]).toBe('post-p4')
    expect(top.indexOf('post-p9')).toBeLessThan(top.indexOf('post-p7'))
  })

  it('names each Reply button after the author it answers', () => {
    render(<DiscussionsTopic {...props} onReply={vi.fn()} />)
    const dans = within(article('p2')).getByRole('button', { name: 'Reply to Dan Okafor' })
    expect(dans).toHaveTextContent('Reply')
    expect(
      within(article('p3')).getByRole('button', { name: 'Reply to Jonas Lindqvist' }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()
  })

  it('submits an inline reply under Dan with his id and Cancel closes it', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<DiscussionsTopic {...props} onReply={onReply} viewer={dan} />)
    const opener = within(article('p2')).getByRole('button', { name: 'Reply to Dan Okafor' })
    await user.click(opener)
    const box = within(article('p2').parentElement!).getByRole('textbox')
    expect(box).toHaveFocus()
    await user.type(box, 'Thanks for the detail')
    await user.click(within(article('p2').parentElement!).getByRole('button', { name: 'Comment' }))
    await waitFor(() =>
      expect(onReply).toHaveBeenCalledWith({ body: 'Thanks for the detail', parentId: 'p2' }),
    )
    await waitFor(() =>
      expect(within(article('p2').parentElement!).queryByRole('textbox')).not.toBeInTheDocument(),
    )
    await user.click(opener)
    await user.click(within(article('p2').parentElement!).getByRole('button', { name: 'Cancel' }))
    expect(within(article('p2').parentElement!).queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('announces an inline reply and gives focus back to its Reply button', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<DiscussionsTopic {...props} onReply={onReply} />)
    const status = screen.getByRole('status')
    expect(status).toHaveAttribute('aria-live', 'polite')
    expect(status).toHaveTextContent('')
    // Mei's nested reply opens the composer under Priya's answer; focus returns to Mei's button.
    const opener = within(article('p6')).getByRole('button', { name: 'Reply to Mei Tanaka' })
    await user.click(opener)
    await user.type(within(article('p4').parentElement!).getByRole('textbox'), 'Same here')
    await user.click(within(article('p4').parentElement!).getByRole('button', { name: 'Comment' }))
    await waitFor(() => expect(status).toHaveTextContent('Reply posted.'))
    expect(within(article('p4').parentElement!).queryByRole('textbox')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
    // Opening a composer again clears the announcement.
    await user.click(opener)
    expect(status).toHaveTextContent('')
  })

  it('gives focus back to the Reply button on Cancel', async () => {
    const user = userEvent.setup()
    render(<DiscussionsTopic {...props} onReply={vi.fn()} />)
    const opener = within(article('p7')).getByRole('button', { name: /^Reply to/ })
    await user.click(opener)
    expect(within(article('p7').parentElement!).getByRole('textbox')).toHaveFocus()
    await user.click(within(article('p7').parentElement!).getByRole('button', { name: 'Cancel' }))
    expect(within(article('p7').parentElement!).queryByRole('textbox')).not.toBeInTheDocument()
    expect(opener).toHaveFocus()
  })

  it('replying to a nested reply posts under the top-level parent', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<DiscussionsTopic {...props} onReply={onReply} />)
    await user.click(within(article('p5')).getByRole('button', { name: /^Reply to/ }))
    await user.type(within(article('p4').parentElement!).getByRole('textbox'), 'Glad it worked')
    await user.click(within(article('p4').parentElement!).getByRole('button', { name: 'Comment' }))
    await waitFor(() =>
      expect(onReply).toHaveBeenCalledWith({ body: 'Glad it worked', parentId: 'p4' }),
    )
  })

  it('opens only one inline composer at a time', async () => {
    const user = userEvent.setup()
    render(<DiscussionsTopic {...props} onReply={vi.fn()} />)
    await user.click(within(article('p2')).getAllByRole('button', { name: /^Reply to/ })[0]!)
    await user.click(within(article('p7')).getAllByRole('button', { name: /^Reply to/ })[0]!)
    expect(screen.getAllByRole('textbox')).toHaveLength(2)
    expect(within(article('p7').parentElement!).getByRole('textbox')).toBeInTheDocument()
  })

  it('posts from the end composer without a parentId', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<DiscussionsTopic {...props} onReply={onReply} />)
    const boxes = screen.getAllByRole('textbox')
    expect(boxes).toHaveLength(1)
    await user.type(boxes[0]!, 'Another thought')
    await user.click(screen.getByRole('button', { name: 'Comment' }))
    await waitFor(() => expect(onReply).toHaveBeenCalledWith({ body: 'Another thought' }))
  })

  it('reacts with a new emoji on the original post', async () => {
    const user = userEvent.setup()
    const onReact = vi.fn().mockResolvedValue(undefined)
    render(<DiscussionsTopic {...props} onReact={onReact} />)
    const original = article('p1')
    await user.click(within(original).getByRole('button', { name: 'Add reaction' }))
    await user.click(await screen.findByRole('menuitem', { name: /🎉/ }))
    await waitFor(() => expect(onReact).toHaveBeenCalledWith('p1', '🎉'))
  })

  it('shows the participants count and avatars in the rail', () => {
    render(<DiscussionsTopic {...props} />)
    const rail = screen.getByRole('complementary', { name: 'About this discussion' })
    const n = participantsOf(topic).length
    expect(
      within(rail).getByRole('heading', { level: 2, name: `Participants · ${n}` }),
    ).toBeInTheDocument()
    expect(within(rail).getByRole('link', { name: 'Kemo Console' })).toBeInTheDocument()
    expect(within(rail).getByText('yaml-editor')).toBeInTheDocument()
  })

  it('offers Subscribe only with onFollow', async () => {
    const user = userEvent.setup()
    const onFollow = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<DiscussionsTopic {...props} />)
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument()
    rerender(<DiscussionsTopic {...props} onFollow={onFollow} />)
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(onFollow).toHaveBeenCalledWith('schema-browser-crd', true)
  })

  it('lists up to three related topics and never the topic itself', () => {
    render(<DiscussionsTopic {...props} related={testTopics} />)
    const rail = screen.getByRole('complementary', { name: 'About this discussion' })
    const block = within(rail).getByRole('heading', { name: 'Related' }).closest('section')!
    const links = within(block).getAllByRole('link')
    expect(links).toHaveLength(3)
    for (const a of links) expect(a.getAttribute('href')).not.toContain('schema-browser-crd')
  })

  it('renders "No replies yet." when posts is empty', () => {
    render(<DiscussionsTopic {...props} topic={{ ...topic, posts: [] }} />)
    expect(screen.getByRole('heading', { level: 2, name: '0 replies' })).toBeInTheDocument()
    expect(screen.getByText('No replies yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
