import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FollowButton } from './follow-button'

const labels = { off: 'Follow', on: 'Following' }

describe('FollowButton', () => {
  it('switches label and pressed state', () => {
    const { rerender } = render(<FollowButton onFollow={vi.fn()} labels={labels} />)
    expect(screen.getByRole('button', { name: 'Follow' })).toHaveAttribute('aria-pressed', 'false')
    rerender(<FollowButton following onFollow={vi.fn()} labels={labels} />)
    expect(screen.getByRole('button', { name: 'Following' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('asks for the opposite state', async () => {
    const user = userEvent.setup()
    const onFollow = vi.fn().mockResolvedValue(undefined)
    render(<FollowButton following onFollow={onFollow} labels={labels} />)
    await user.click(screen.getByRole('button'))
    expect(onFollow).toHaveBeenCalledWith(false)
  })

  it('renders nothing without onFollow', () => {
    const { container } = render(<FollowButton labels={labels} />)
    expect(container).toBeEmptyDOMElement()
  })
})
