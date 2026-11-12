import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { VoteColumn } from './vote-column'

describe('VoteColumn', () => {
  it('names the arrows and marks the viewer direction', () => {
    render(<VoteColumn score={12} viewer="up" onVote={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Upvote, score 12' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: 'Downvote' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('sends null when the active direction is pressed again', async () => {
    const user = userEvent.setup()
    const onVote = vi.fn().mockResolvedValue(undefined)
    render(<VoteColumn score={1} viewer="up" onVote={onVote} />)
    await user.click(screen.getByRole('button', { name: /Upvote/ }))
    expect(onVote).toHaveBeenLastCalledWith(null)
    await user.click(screen.getByRole('button', { name: 'Downvote' }))
    expect(onVote).toHaveBeenLastCalledWith('down')
  })

  it('shows only the score without onVote', () => {
    render(<VoteColumn score={7} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('7')).toBeInTheDocument()
  })

  it('shows a static accepted mark without onAccept', () => {
    render(<VoteColumn score={7} accepted />)
    expect(screen.getByRole('img', { name: 'Accepted answer' })).toBeInTheDocument()
  })

  it('renders an accept button and calls onAccept', async () => {
    const user = userEvent.setup()
    const onAccept = vi.fn().mockResolvedValue(undefined)
    const { rerender } = render(<VoteColumn score={7} onAccept={onAccept} />)
    await user.click(screen.getByRole('button', { name: 'Accept this answer' }))
    expect(onAccept).toHaveBeenCalled()
    rerender(<VoteColumn score={7} onAccept={onAccept} accepted />)
    expect(screen.getByRole('button', { name: 'Accepted answer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    rerender(<VoteColumn score={7} onAccept={onAccept} acceptName="Mark as solution" />)
    expect(screen.getByRole('button', { name: 'Mark as solution' })).toBeInTheDocument()
  })
})
