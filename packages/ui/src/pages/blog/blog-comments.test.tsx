import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../test/layout'
import { BlogComments } from './blog-comments'
import type { BlogComment } from './types'

const c = (id: string, name: string, postedAt: string, extra: Partial<BlogComment> = {}) =>
  ({ id, author: { name }, postedAt, body: `Body of ${id}`, ...extra }) as BlogComment

const comments: BlogComment[] = [
  c('late', 'Thandi Nkosi', '2026-11-12T09:00:00Z'),
  c('early', 'Jonas Lindqvist', '2026-11-10T09:00:00Z', {
    replies: [
      c('r2', 'Priya Raman', '2026-11-11T12:00:00Z', {
        replies: [c('nested', 'Deep Reply', '2026-11-11T13:00:00Z')],
      }),
      c('r1', 'Ada Marsh', '2026-11-11T08:00:00Z'),
    ],
  }),
  c('mid', 'Rafael Bastos', '2026-11-11T09:00:00Z'),
]

describe('BlogComments', () => {
  afterEach(() => vi.restoreAllMocks())

  it('names the section with the total including replies', () => {
    const { container } = render(<BlogComments comments={comments} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Comments (5)' })).toBeInTheDocument()
    expect(container.querySelector('section#comments-section')).not.toBeNull()
    expect(screen.getByRole('region', { name: 'Comments (5)' })).toBeInTheDocument()
  })

  it('lists comments oldest first with their replies nested once', () => {
    render(<BlogComments comments={comments} />)
    const list = screen.getAllByRole('list')[0]!
    const items = Array.from(list.children) as HTMLElement[]
    const top = items.map((li) => within(li).getAllByRole('article')[0])
    expect(top).toHaveLength(3)
    expect(top[0]).toHaveTextContent('Jonas Lindqvist')
    expect(top[1]).toHaveTextContent('Rafael Bastos')
    expect(top[2]).toHaveTextContent('Thandi Nkosi')
    const replies = within(items[0]!).getAllByRole('article').slice(1)
    expect(replies).toHaveLength(2)
    expect(replies[0]).toHaveTextContent('Ada Marsh')
    expect(replies[1]).toHaveTextContent('Priya Raman')
    expect(screen.queryByText('Deep Reply')).not.toBeInTheDocument()
  })

  it('shows the empty message', () => {
    render(<BlogComments comments={[]} />)
    expect(screen.getByText('No comments yet.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: 'Comments (0)' })).toBeInTheDocument()
  })

  it('is read-only without onAddComment', () => {
    render(<BlogComments comments={comments} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()
  })

  it('renders markup in a body as text', () => {
    render(
      <BlogComments
        comments={[
          c('x', 'Ada', '2026-11-12T09:00:00Z', { body: '<img src=x onerror=alert(1)> <b>hi</b>' }),
        ]}
      />,
    )
    expect(screen.getByText('<img src=x onerror=alert(1)> <b>hi</b>')).toBeInTheDocument()
    expect(document.querySelector('#comments-section img, #comments-section b')).toBeNull()
  })

  it('tags the post author', () => {
    render(
      <BlogComments
        comments={[
          c('a', 'Priya Raman', '2026-11-12T09:00:00Z', {
            author: { name: 'Priya Raman', isAuthor: true },
          }),
          c('b', 'Ada', '2026-11-12T10:00:00Z'),
        ]}
      />,
    )
    const tags = screen.getAllByText('Author')
    expect(tags).toHaveLength(1)
    expect(tags[0]!.closest('article')).toHaveTextContent('Priya Raman')
  })

  it('validates name and comment', async () => {
    const user = userEvent.setup()
    const onAddComment = vi.fn()
    render(<BlogComments comments={[]} onAddComment={onAddComment} />)
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByText('Enter your name.')).toBeInTheDocument()
    expect(screen.getByText('Enter a comment.')).toBeInTheDocument()
    expect(onAddComment).not.toHaveBeenCalled()
    await user.click(screen.getByLabelText('Name'))
    await user.paste('n'.repeat(81))
    await user.click(screen.getByLabelText('Comment'))
    await user.paste('b'.repeat(2001))
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByText('Keep your name under 80 characters.')).toBeInTheDocument()
    expect(screen.getByText('Keep your comment under 2000 characters.')).toBeInTheDocument()
    expect(onAddComment).not.toHaveBeenCalled()
  })

  it('shows the hint on the top-level form only', async () => {
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn()} />)
    expect(screen.getAllByText('Plain text. Be kind.')).toHaveLength(1)
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    expect(screen.getAllByText('Plain text. Be kind.')).toHaveLength(1)
  })

  it('posts a trimmed comment, clears the text, keeps the name and confirms', async () => {
    const user = userEvent.setup()
    const onAddComment = vi.fn().mockResolvedValue(undefined)
    render(<BlogComments comments={[]} onAddComment={onAddComment} />)
    await user.type(screen.getByLabelText('Name'), '  Ada ')
    await user.type(screen.getByLabelText('Comment'), ' Nice write-up. ')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(onAddComment).toHaveBeenCalledWith({ name: 'Ada', body: 'Nice write-up.' })
    expect(await screen.findByRole('status')).toHaveTextContent('Comment posted.')
    expect(screen.getByLabelText('Comment')).toHaveValue('')
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
  })

  it('does not submit twice while pending', async () => {
    const user = userEvent.setup()
    let resolve!: () => void
    const onAddComment = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    render(<BlogComments comments={[]} onAddComment={onAddComment} />)
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.type(screen.getByLabelText('Comment'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await user.click(screen.getByRole('button', { name: /Post comment/ }))
    expect(onAddComment).toHaveBeenCalledOnce()
    resolve()
    expect(await screen.findByRole('status')).toHaveTextContent('Comment posted.')
  })

  it('keeps the text and shows the reason when the host rejects', async () => {
    const user = userEvent.setup()
    const onAddComment = vi
      .fn()
      .mockRejectedValueOnce(new Error('Comments are closed'))
      .mockRejectedValueOnce('nope')
    render(<BlogComments comments={[]} onAddComment={onAddComment} />)
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.type(screen.getByLabelText('Comment'), 'Hello')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Comments are closed')
    expect(screen.getByLabelText('Comment')).toHaveValue('Hello')
    expect(screen.getByLabelText('Name')).toHaveValue('Ada')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(
      await screen.findByText('Your comment could not be posted. Try again.'),
    ).toBeInTheDocument()
  })

  it('opens one reply form at a time and posts with the parent id', async () => {
    const user = userEvent.setup()
    const onAddComment = vi.fn().mockResolvedValue(undefined)
    render(<BlogComments comments={comments} onAddComment={onAddComment} />)
    const replyButtons = () => screen.getAllByRole('button', { name: 'Reply' })
    // oldest first: early, mid, late
    await user.click(replyButtons()[0]!)
    expect(replyButtons()[0]!).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByLabelText('Comment')).toHaveLength(2)
    await user.click(replyButtons()[1]!)
    expect(replyButtons()[0]!).toHaveAttribute('aria-expanded', 'false')
    expect(replyButtons()[1]!).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByLabelText('Comment')).toHaveLength(2)
    const reply = screen.getByPlaceholderText('Reply to Rafael Bastos')
    await user.type(reply.closest('form')!.querySelector('input')!, 'Ada')
    await user.type(reply, 'Agreed')
    await user.click(screen.getByRole('button', { name: 'Post reply' }))
    expect(onAddComment).toHaveBeenCalledWith({ name: 'Ada', body: 'Agreed', parentId: 'mid' })
    expect(await screen.findByRole('status')).toHaveTextContent('Comment posted.')
    expect(screen.getAllByLabelText('Comment')).toHaveLength(1)
    expect(replyButtons()[1]!).toHaveAttribute('aria-expanded', 'false')
  })

  it('names the parent in the reply placeholder', async () => {
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn()} />)
    expect(screen.getByPlaceholderText('Add to the discussion')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    expect(screen.getByPlaceholderText('Reply to Jonas Lindqvist')).toBeInTheDocument()
  })

  it('cancels a reply and returns focus to its button', async () => {
    stubLayout()
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[1]!)
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.getAllByLabelText('Comment')).toHaveLength(1)
    expect(screen.getAllByRole('button', { name: 'Reply' })[1]!).toHaveFocus()
    expect(screen.getAllByRole('button', { name: 'Reply' })[1]!).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })

  it('returns focus to the Reply button once a reply posts', async () => {
    stubLayout()
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn().mockResolvedValue(undefined)} />)
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[1]!)
    const reply = screen.getByPlaceholderText('Reply to Rafael Bastos')
    await user.type(reply.closest('form')!.querySelector('input')!, 'Ada')
    await user.type(reply, 'Agreed')
    await user.click(screen.getByRole('button', { name: 'Post reply' }))
    await waitFor(() => expect(screen.getAllByLabelText('Comment')).toHaveLength(1))
    expect(screen.getAllByRole('button', { name: 'Reply' })[1]!).toHaveFocus()
  })

  it('carries the name into a reply form', async () => {
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn()} />)
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    const names = screen.getAllByLabelText('Name')
    expect(names).toHaveLength(2)
    expect(names[1]!).toHaveValue('Ada')
  })

  it('shows one status at a time: a reply confirmation replaces the first', async () => {
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn().mockResolvedValue(undefined)} />)
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.type(screen.getByLabelText('Comment'), 'First')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Comment posted.')
    expect(screen.queryByText('Plain text. Be kind.')).not.toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    await user.type(screen.getByPlaceholderText('Reply to Jonas Lindqvist'), 'Second')
    await user.click(screen.getByRole('button', { name: 'Post reply' }))
    await waitFor(() => expect(screen.getAllByLabelText('Comment')).toHaveLength(1))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('Comment posted.')
  })

  it('keeps a rejected reply open with its text and the alert inside the reply form', async () => {
    const user = userEvent.setup()
    const onAddComment = vi.fn().mockRejectedValue(new Error('Replies are closed'))
    render(<BlogComments comments={comments} onAddComment={onAddComment} />)
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    const reply = screen.getByPlaceholderText('Reply to Jonas Lindqvist')
    const form = reply.closest('form')!
    await user.type(form.querySelector('input')!, 'Ada')
    await user.type(reply, 'Agreed')
    await user.click(screen.getByRole('button', { name: 'Post reply' }))
    expect(await within(form).findByRole('alert')).toHaveTextContent('Replies are closed')
    expect(reply).toHaveValue('Agreed')
    expect(screen.getByPlaceholderText('Reply to Jonas Lindqvist')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Reply' })[0]!).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('announces each post through one persistent status and clears it on typing', async () => {
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn().mockResolvedValue(undefined)} />)
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()
    await user.type(screen.getByLabelText('Name'), 'Ada')
    await user.type(screen.getByLabelText('Comment'), 'First')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await waitFor(() => expect(status).toHaveTextContent('Comment posted.'))
    await user.type(screen.getByLabelText('Comment'), 'x')
    expect(status).toBeEmptyDOMElement()
    await user.type(screen.getByLabelText('Comment'), 'Second')
    await user.click(screen.getByRole('button', { name: 'Post comment' }))
    await waitFor(() => expect(status).toHaveTextContent('Comment posted.'))
    expect(screen.getAllByRole('status')).toHaveLength(1)
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    expect(status).toBeEmptyDOMElement()
  })

  it('carries a name typed in a reply form back to the top-level form', async () => {
    const user = userEvent.setup()
    render(<BlogComments comments={comments} onAddComment={vi.fn()} />)
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    const [top, reply] = screen.getAllByLabelText('Name')
    await user.type(reply!, 'Grace')
    expect(top).toHaveValue('Grace')
  })
})
