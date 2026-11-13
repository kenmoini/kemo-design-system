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

  it.each([
    ['error', 'lucide-circle-alert'],
    ['warning', 'lucide-circle-alert'],
    ['info', 'lucide-info'],
    ['success', 'lucide-circle-check'],
  ] as const)('shows the %s icon, hidden from assistive tech', (status, icon) => {
    const { container } = render(<AlertBanner status={status} title="T" description="D" />)
    const svg = container.querySelector(`svg.${icon}`)
    expect(svg).not.toBeNull()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelectorAll('svg')).toHaveLength(1)
  })

  it('defaults to error and names the status for a screen reader', () => {
    const { container } = render(<AlertBanner title="Deploy failed" description="D" />)
    expect(container.querySelector('svg.lucide-circle-alert')).not.toBeNull()
    expect(screen.getByText('Error:')).toBeInTheDocument()
  })
})
