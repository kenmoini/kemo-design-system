import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QuickActions } from './quick-actions'

describe('QuickActions', () => {
  it('renders a button per action and fires the matching callback', async () => {
    const user = userEvent.setup()
    const a = vi.fn()
    const b = vi.fn()
    render(
      <QuickActions
        actions={[
          { label: 'Invite', onSelect: a },
          { label: 'Export', onSelect: b },
          { label: 'Settings' },
        ]}
      />,
    )
    expect(screen.getAllByRole('button')).toHaveLength(3)
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(b).toHaveBeenCalledTimes(1)
    expect(a).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
  })
})
