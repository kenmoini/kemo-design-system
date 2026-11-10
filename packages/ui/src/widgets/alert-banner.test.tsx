import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AlertBanner } from './alert-banner'

describe('AlertBanner', () => {
  it('renders title and description and calls the action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <AlertBanner
        title="Deploy failed"
        description="Build 42 broke."
        action={{ label: 'View logs', onSelect }}
      />,
    )
    expect(screen.getByText('Deploy failed')).toBeInTheDocument()
    expect(screen.getByText('Build 42 broke.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'View logs' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders no button without an action', () => {
    render(<AlertBanner title="T" description="D" />)
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
