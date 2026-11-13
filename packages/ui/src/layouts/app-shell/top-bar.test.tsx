import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './top-bar'
import type { TopBarProps } from './types'

const base: TopBarProps = {
  brand: { name: 'Acme Console' },
  account: {
    initials: 'KM',
    name: 'Ken Moini',
    menu: [{ label: 'Profile' }, { label: 'Settings' }, { label: 'Sign out' }],
  },
}

describe('TopBar', () => {
  it('account menu opens on click and lists the items', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(
      <TopBar
        {...base}
        account={{
          ...base.account,
          menu: [
            { label: 'Profile' },
            { label: 'Settings' },
            { label: 'Sign out', onSelect: onSignOut },
          ],
        }}
      />,
    )
    expect(screen.queryByRole('menu')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Account: Ken Moini' }))
    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Profile', 'Settings', 'Sign out'])
    await user.click(within(menu).getByRole('menuitem', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it('environment select shows the value', () => {
    render(
      <TopBar
        {...base}
        environment={{
          options: [
            { value: 'prod', label: 'prod-us-east' },
            { value: 'staging', label: 'staging-eu' },
          ],
          value: 'prod',
        }}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Environment' })).toHaveTextContent('prod-us-east')
  })

  it('submits the search query', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <TopBar
        {...base}
        search={{ placeholder: 'Search services, deployments, users', onSubmit }}
      />,
    )
    const search = screen.getByRole('searchbox', { name: 'Search' })
    expect(search).toHaveAttribute('placeholder', 'Search services, deployments, users')
    await user.type(search, 'checkout{Enter}')
    expect(onSubmit).toHaveBeenCalledWith('checkout')
  })

  it('renders no help or notifications button without a callback', () => {
    render(<TopBar {...base} notificationCount={3} />)
    expect(screen.queryByRole('button', { name: 'Help' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Notifications/ })).toBeNull()
    expect(screen.queryByText('3')).toBeNull()
  })

  it('calls onHelp and onNotifications on click', async () => {
    const user = userEvent.setup()
    const onHelp = vi.fn()
    const onNotifications = vi.fn()
    render(<TopBar {...base} onHelp={onHelp} onNotifications={onNotifications} />)
    await user.click(screen.getByRole('button', { name: 'Help' }))
    await user.click(screen.getByRole('button', { name: 'Notifications' }))
    expect(onHelp).toHaveBeenCalledTimes(1)
    expect(onNotifications).toHaveBeenCalledTimes(1)
  })

  it('shows the notification count in the button name', () => {
    render(<TopBar {...base} onHelp={() => {}} onNotifications={() => {}} notificationCount={3} />)
    expect(screen.getByRole('button', { name: 'Notifications (3)' })).toHaveTextContent('3')
    expect(screen.getByRole('button', { name: 'Help' })).toBeInTheDocument()
  })

  it('has no navigation button outside a shell', () => {
    render(<TopBar {...base} />)
    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull()
  })
})
