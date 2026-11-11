import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent } from '../auth/types'
import { StatusLayout } from './status-layout'

describe('StatusLayout', () => {
  it('renders the label, heading, description and tone dot', () => {
    render(
      <StatusLayout
        code={500}
        label="Server error"
        title="Something went wrong on our side."
        description="Try again."
        tone="critical"
      />,
    )
    expect(
      screen.getByRole('heading', { level: 1, name: 'Something went wrong on our side.' }),
    ).toBeInTheDocument()
    expect(screen.getByText('500 · Server error')).toBeInTheDocument()
    expect(screen.getByText('Try again.')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByTestId('status-dot')).toHaveAttribute('aria-hidden', 'true')
  })

  it('omits the code from the label when there is none', () => {
    render(<StatusLayout label="Maintenance" title="T" />)
    expect(screen.getByText('Maintenance')).toBeInTheDocument()
  })

  it('omits the dot for the neutral tone', () => {
    render(<StatusLayout code={404} label="Not found" title="T" />)
    expect(screen.queryByTestId('status-dot')).toBeNull()
  })

  it('renders the watermark decoratively', () => {
    const { container } = render(<StatusLayout code={404} label="Not found" title="T" />)
    const mark = container.querySelector('[data-part="watermark"]') as HTMLElement
    expect(within(mark).getByText('404')).toBeInTheDocument()
    expect(mark).toHaveAttribute('aria-hidden', 'true')
    expect(container.firstElementChild).toHaveClass('ov_hidden')
  })

  it('omits the watermark when there is no text', () => {
    const { container } = render(<StatusLayout label="Maintenance" title="T" />)
    expect(container.querySelector('[data-part="watermark"]')).toBeNull()
  })

  it('renders actions: href through the link component, onSelect as a button, neither as an inert button', async () => {
    const user = userEvent.setup()
    const HostLink: LinkComponent = ({ href, children, ...rest }) => (
      <a href={`/host${href}`} {...rest}>
        {children}
      </a>
    )
    const onSelect = vi.fn()
    render(
      <StatusLayout
        label="Not found"
        title="T"
        linkComponent={HostLink}
        actions={[
          { label: 'Go to dashboard', href: '/dashboard' },
          { label: 'Retry', onSelect },
          { label: 'Nothing' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Go to dashboard' })).toHaveAttribute(
      'href',
      '/host/dashboard',
    )
    await user.click(screen.getByRole('button', { name: 'Retry' }))
    expect(onSelect).toHaveBeenCalledOnce()
    const inert = screen.getByRole('button', { name: 'Nothing' })
    expect(inert).toBeEnabled()
    await user.click(inert)
  })

  it('renders the footer with request id and version, and footerNote replaces the request id', () => {
    const { rerender } = render(
      <StatusLayout label="L" title="T" requestId="req_123" version="v1.2.3" />,
    )
    expect(screen.getByText('Request ID req_123')).toBeInTheDocument()
    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
    rerender(
      <StatusLayout
        label="L"
        title="T"
        requestId="req_123"
        version="v1.2.3"
        footerNote="This page refreshes."
      />,
    )
    expect(screen.queryByText('Request ID req_123')).toBeNull()
    expect(screen.getByText('This page refreshes.')).toBeInTheDocument()
  })

  it('renders the meta row', () => {
    render(<StatusLayout label="L" title="T" meta={[{ label: 'Started', value: '02:00 UTC' }]} />)
    expect(screen.getByText('Started')).toBeInTheDocument()
    expect(screen.getByText('02:00 UTC')).toBeInTheDocument()
  })

  it('calls onRefresh on the interval and clears it on unmount', () => {
    vi.useFakeTimers()
    try {
      const onRefresh = vi.fn()
      const { unmount } = render(
        <StatusLayout label="L" title="T" refreshIntervalMs={1000} onRefresh={onRefresh} />,
      )
      vi.advanceTimersByTime(2000)
      expect(onRefresh).toHaveBeenCalledTimes(2)
      unmount()
      vi.advanceTimersByTime(2000)
      expect(onRefresh).toHaveBeenCalledTimes(2)
    } finally {
      vi.useRealTimers()
    }
  })
})
