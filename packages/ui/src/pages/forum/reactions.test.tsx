import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReactionPills } from './reactions'

const reactions = [
  { emoji: '👍', count: 3, reacted: true },
  { emoji: '🎉', count: 0 },
  { emoji: '🚀', count: 1 },
] as const

describe('ReactionPills', () => {
  it('renders only non-zero pills with their pressed state', () => {
    render(<ReactionPills reactions={[...reactions]} onReact={vi.fn()} />)
    expect(screen.getByRole('button', { name: '👍 3, react' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.getByRole('button', { name: '🚀 1, react' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.queryByRole('button', { name: /🎉/ })).toBeNull()
  })

  it('opens the five emoji from the plus pill and reacts', async () => {
    const user = userEvent.setup()
    const onReact = vi.fn().mockResolvedValue(undefined)
    render(<ReactionPills reactions={[...reactions]} onReact={onReact} />)
    await user.click(screen.getByRole('button', { name: 'Add reaction' }))
    expect(await screen.findAllByRole('menuitem')).toHaveLength(5)
    await user.click(screen.getByRole('menuitem', { name: '🎉' }))
    expect(onReact).toHaveBeenCalledWith('🎉')
  })

  it('keeps a zero-count pill when showEmpty is set', () => {
    render(<ReactionPills reactions={[{ emoji: '🎉', count: 0 }]} onReact={vi.fn()} showEmpty />)
    expect(screen.getByRole('button', { name: '🎉 0, react' })).toBeInTheDocument()
  })

  it('calls onReact from a pill', async () => {
    const user = userEvent.setup()
    const onReact = vi.fn().mockResolvedValue(undefined)
    render(<ReactionPills reactions={[...reactions]} onReact={onReact} />)
    await user.click(screen.getByRole('button', { name: '🚀 1, react' }))
    expect(onReact).toHaveBeenCalledWith('🚀')
  })

  it('omits the plus pill when not addable', () => {
    render(<ReactionPills reactions={[...reactions]} onReact={vi.fn()} addable={false} />)
    expect(screen.queryByRole('button', { name: 'Add reaction' })).toBeNull()
    expect(screen.getByRole('button', { name: '👍 3, react' })).toBeInTheDocument()
  })

  it('renders spans without onReact', () => {
    render(<ReactionPills reactions={[...reactions]} />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(screen.getByText('👍 3').tagName).toBe('SPAN')
  })

  it('swallows a rejected reaction', async () => {
    const user = userEvent.setup()
    render(<ReactionPills reactions={[...reactions]} onReact={vi.fn().mockRejectedValue('x')} />)
    await user.click(screen.getByRole('button', { name: '🚀 1, react' }))
    expect(screen.getByRole('button', { name: '🚀 1, react' })).toBeInTheDocument()
  })
})
