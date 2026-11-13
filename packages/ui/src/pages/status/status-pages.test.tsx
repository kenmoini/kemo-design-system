import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import {
  ForbiddenPage,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
  UnauthorizedPage,
  UnavailablePage,
  mergeActions,
} from './index'

describe('named status pages', () => {
  it.each([
    [NotFoundPage, '404 · Not found', "There's nothing at this address."],
    [UnauthorizedPage, '401 · Sign in required', 'You need to sign in to see this.'],
    [ForbiddenPage, '403 · No access', "You don't have access to this page."],
    [ServerErrorPage, '500 · Server error', 'Something went wrong on our side.'],
    [UnavailablePage, '503 · Unavailable', "We're temporarily unavailable."],
  ])('renders the default label and heading', (Page, label, heading) => {
    render(<Page />)
    expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('lets the host override the copy', () => {
    render(<NotFoundPage title="Custom" />)
    expect(screen.getByRole('heading', { level: 1, name: 'Custom' })).toBeInTheDocument()
  })

  it.each([
    [NotFoundPage, "There's nothing at this address."],
    [UnauthorizedPage, 'You need to sign in to see this.'],
    [ForbiddenPage, "You don't have access to this page."],
    [ServerErrorPage, 'Something went wrong on our side.'],
    [UnavailablePage, "We're temporarily unavailable."],
    [MaintenancePage, "We're making improvements."],
  ])('keeps the default heading when the title is explicitly undefined', (Page, heading) => {
    render(<Page title={undefined} />)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
  })

  it('keeps the default description when it is explicitly undefined', () => {
    render(<NotFoundPage description={undefined} />)
    expect(screen.getByText(/It may have been moved or removed\./)).toBeInTheDocument()
  })

  it('still applies a defined override over the pinned tone', () => {
    render(<ServerErrorPage tone="neutral" />)
    expect(screen.queryByTestId('status-dot')).toBeNull()
  })

  it('ServerErrorPage shows the dot and three actions in order', () => {
    render(<ServerErrorPage />)
    expect(screen.getByTestId('status-dot')).toBeInTheDocument()
    const names = [...screen.getAllByRole('button'), ...screen.queryAllByRole('link')].map(
      (el) => el.textContent,
    )
    expect(names).toEqual(['Try again', 'Go to dashboard', 'View status page'])
  })

  it('MaintenancePage has no code prefix', () => {
    render(<MaintenancePage />)
    expect(screen.getByText('Scheduled maintenance')).toBeInTheDocument()
    expect(screen.queryByText(/·/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: "We're making improvements." }),
    ).toBeInTheDocument()
  })

  it('MaintenancePage renders no meta row without a window', () => {
    render(<MaintenancePage />)
    expect(screen.queryByText('Started')).not.toBeInTheDocument()
    expect(screen.queryByText('Expected back')).not.toBeInTheDocument()
  })

  it('MaintenancePage renders meta and the refresh note', () => {
    render(
      <MaintenancePage
        startedAt="02:00 UTC"
        expectedBackAt="03:30 UTC"
        refreshIntervalMs={60000}
      />,
    )
    expect(screen.getByText('02:00 UTC')).toBeInTheDocument()
    expect(screen.getByText('03:30 UTC')).toBeInTheDocument()
    expect(screen.getByText('This page refreshes itself every minute')).toBeInTheDocument()
  })

  it('merges host actions by label', async () => {
    const onSelect = vi.fn()
    render(<ServerErrorPage actions={[{ label: 'Try again', onSelect }]} />)
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Go to dashboard')).toBeInTheDocument()
  })

  it('appends actions with unknown labels', () => {
    render(<NotFoundPage actions={[{ label: 'Contact us' }]} />)
    expect(screen.getByText('Contact us')).toBeInTheDocument()
    expect(screen.getByText('Go to dashboard')).toBeInTheDocument()
  })
})

describe('mergeActions', () => {
  const defaults = [
    { label: 'A', variant: 'solid' as const },
    { label: 'B', variant: 'outline' as const },
  ]
  it('returns defaults when no overrides', () => {
    expect(mergeActions(defaults)).toEqual(defaults)
  })
  it('keeps order and variant, appends unknown, does not mutate', () => {
    const copy = structuredClone(defaults)
    const out = mergeActions(defaults, [{ label: 'C' }, { label: 'B', href: '/b' }])
    expect(out).toEqual([
      { label: 'A', variant: 'solid' },
      { label: 'B', variant: 'outline', href: '/b' },
      { label: 'C' },
    ])
    expect(defaults).toEqual(copy)
  })
  it('returns fresh copies of the defaults, with or without overrides', () => {
    for (const overrides of [undefined, [{ label: 'C' }]]) {
      const first = mergeActions(defaults, overrides)
      expect(first).not.toBe(defaults)
      first[0]!.label = 'Changed'
      expect(mergeActions(defaults, overrides)[0]).toEqual({ label: 'A', variant: 'solid' })
      expect(defaults[0]).toEqual({ label: 'A', variant: 'solid' })
    }
  })
})
