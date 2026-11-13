import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { vocabulary } from './content'
import { ReplyComposer } from './reply-composer'

const author = { id: 'u1', name: 'Ada Lovelace' }

describe('ReplyComposer', () => {
  it('shows the placeholder and submit label of the variant', () => {
    render(<ReplyComposer variant="qa" idPrefix="r" onSubmit={vi.fn()} />)
    expect(screen.getByPlaceholderText(vocabulary.qa.replyPlaceholder)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: vocabulary.qa.replySubmit })).toBeInTheDocument()
    expect(screen.getByText('Plain text. Be kind.')).toBeInTheDocument()
  })

  it('rejects a too short and a too long reply', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ReplyComposer variant="boards" idPrefix="r" onSubmit={onSubmit} />)
    const field = screen.getByLabelText('Reply')
    await user.type(field, 'a')
    await user.click(screen.getByRole('button', { name: vocabulary.boards.replySubmit }))
    expect(await screen.findByText('Write at least 2 characters.')).toBeInTheDocument()
    await user.clear(field)
    await user.click(field)
    await user.paste('a'.repeat(5001))
    await user.click(screen.getByRole('button', { name: vocabulary.boards.replySubmit }))
    expect(await screen.findByText('Keep it under 5,000 characters.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('disables the button while pending, then clears and announces', async () => {
    const user = userEvent.setup()
    let resolve!: () => void
    const onSubmit = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    const onRemoveQuote = vi.fn()
    render(
      <ReplyComposer
        variant="boards"
        idPrefix="r"
        onSubmit={onSubmit}
        quote={{ author, excerpt: 'Hi' }}
        onRemoveQuote={onRemoveQuote}
      />,
    )
    await user.type(screen.getByLabelText('Reply'), 'Hello there')
    const button = screen.getByRole('button', { name: vocabulary.boards.replySubmit })
    await user.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    expect(onSubmit).toHaveBeenCalledWith('Hello there')
    resolve()
    expect(await screen.findByRole('status')).toHaveTextContent(vocabulary.boards.replyPosted)
    expect(screen.getByLabelText('Reply')).toHaveValue('')
    expect(onRemoveQuote).toHaveBeenCalled()
  })

  it('keeps the text and shows the message when the post is rejected', async () => {
    const user = userEvent.setup()
    render(
      <ReplyComposer
        variant="discussions"
        idPrefix="r"
        onSubmit={vi.fn().mockRejectedValue(new Error('Topic is locked.'))}
      />,
    )
    await user.type(screen.getByLabelText('Reply'), 'Hello there')
    await user.click(screen.getByRole('button', { name: vocabulary.discussions.replySubmit }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Topic is locked.')
    expect(screen.getByLabelText('Reply')).toHaveValue('Hello there')
  })

  it('falls back to a generic rejection message', async () => {
    const user = userEvent.setup()
    render(<ReplyComposer variant="qa" idPrefix="r" onSubmit={vi.fn().mockRejectedValue('nope')} />)
    await user.type(screen.getByLabelText('Reply'), 'Hello there')
    await user.click(screen.getByRole('button', { name: vocabulary.qa.replySubmit }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Your reply could not be posted. Try again.',
    )
  })

  it('renders the comment kind with Post and Cancel and a 600 limit', async () => {
    const user = userEvent.setup()
    const onCancel = vi.fn()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <ReplyComposer
        variant="qa"
        kind="comment"
        idPrefix="c"
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )
    const field = screen.getByLabelText('Comment')
    expect(field.tagName).toBe('INPUT')
    await user.click(field)
    await user.paste('a'.repeat(601))
    await user.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByText('Keep it under 600 characters.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onCancel).toHaveBeenCalled()
    await user.clear(field)
    await user.type(field, 'ok')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByRole('status')).toHaveTextContent('Comment posted.')
  })

  it("shows a rejected comment's message, else the comment fallback", async () => {
    const user = userEvent.setup()
    const onSubmit = vi
      .fn()
      .mockRejectedValueOnce(new Error('Comments are closed.'))
      .mockRejectedValueOnce(new Error(''))
    render(<ReplyComposer variant="qa" kind="comment" idPrefix="c" onSubmit={onSubmit} />)
    const field = screen.getByLabelText('Comment')
    await user.type(field, 'Which cluster?')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Comments are closed.')
    expect(field).toHaveValue('Which cluster?')
    await user.click(screen.getByRole('button', { name: 'Post' }))
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Your comment could not be posted. Try again.',
      ),
    )
  })

  it('renders the quote and removes it on request', async () => {
    const user = userEvent.setup()
    const onRemoveQuote = vi.fn()
    render(
      <ReplyComposer
        variant="boards"
        idPrefix="r"
        onSubmit={vi.fn()}
        quote={{ author, excerpt: 'First line' }}
        onRemoveQuote={onRemoveQuote}
      />,
    )
    expect(screen.getByText('Ada Lovelace wrote')).toBeInTheDocument()
    expect(screen.getByText('First line')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Remove quote' }))
    expect(onRemoveQuote).toHaveBeenCalled()
  })

  it('passes markup through as text', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const { container } = render(<ReplyComposer variant="qa" idPrefix="r" onSubmit={onSubmit} />)
    await user.click(screen.getByLabelText('Reply'))
    await user.paste('<img src=x onerror=alert(1)>')
    await user.click(screen.getByRole('button', { name: vocabulary.qa.replySubmit }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('<img src=x onerror=alert(1)>'))
    expect(container.querySelector('img')).toBeNull()
  })

  it('keeps one status element, filled after each post and emptied while typing', async () => {
    const user = userEvent.setup()
    render(
      <ReplyComposer
        variant="boards"
        idPrefix="r"
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />,
    )
    const status = screen.getByRole('status')
    expect(status).toBeEmptyDOMElement()
    const field = screen.getByLabelText('Reply')
    const post = () =>
      user.click(screen.getByRole('button', { name: vocabulary.boards.replySubmit }))
    await user.type(field, 'First reply')
    await post()
    await waitFor(() => expect(status).toHaveTextContent(vocabulary.boards.replyPosted))
    await user.type(field, 'S')
    expect(status).toBeEmptyDOMElement()
    await user.type(field, 'econd reply')
    await post()
    await waitFor(() => expect(status).toHaveTextContent(vocabulary.boards.replyPosted))
    expect(screen.getByRole('status')).toBe(status)
  })
})
