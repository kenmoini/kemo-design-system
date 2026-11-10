import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EmptyState } from './empty-state'

describe('EmptyState', () => {
  it('renders the message and fires the action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<EmptyState message="Nothing here yet" action={{ label: 'Create one', onSelect }} />)
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Create one' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('has no button without an action', () => {
    render(<EmptyState message="Empty" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
