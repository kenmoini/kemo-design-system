import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HouseIcon, RocketIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { setMediaMatches } from '../../test/media'
import { AppShell } from './app-shell'
import { PageFooter } from './page-footer'
import { SideNav } from './side-nav'
import { TopBar } from './top-bar'
import type { NavGroup } from './types'

const MD = '(min-width: 48em)'
const LG = '(min-width: 64em)'

const groups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { id: 'overview', label: 'Overview', icon: <HouseIcon />, href: '#overview', active: true },
      {
        id: 'deployments',
        label: 'Deployments',
        icon: <RocketIcon />,
        href: '#deployments',
        badge: 12,
      },
    ],
  },
]

function renderShell() {
  return render(
    <AppShell
      topBar={
        <TopBar
          brand={{ name: 'Acme Console' }}
          account={{ initials: 'KM', name: 'Ken Moini', menu: [{ label: 'Sign out' }] }}
        />
      }
      sideNav={<SideNav groups={groups} />}
      footer={
        <PageFooter
          product="Acme Console"
          version="v1.4.2"
          status={{ tone: 'good', text: 'All systems normal' }}
          links={[{ label: 'Docs', href: '#docs' }]}
        />
      }
    >
      <h1>Overview</h1>
    </AppShell>,
  )
}

describe('AppShell', () => {
  it('renders the four landmarks', () => {
    setMediaMatches(MD, true)
    setMediaMatches(LG, true)
    renderShell()
    expect(screen.getByRole('banner')).toHaveTextContent('Acme Console')
    expect(screen.getByRole('navigation', { name: 'Primary' })).toHaveAttribute(
      'data-rail',
      'false',
    )
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main')
    expect(screen.getByRole('main')).toHaveTextContent('Overview')
    expect(screen.getByRole('contentinfo')).toHaveTextContent('All systems normal')
  })

  it('skip link is the first tab stop', async () => {
    const user = userEvent.setup()
    renderShell()
    await user.tab()
    const skip = screen.getByRole('link', { name: 'Skip to content' })
    expect(skip).toHaveFocus()
    expect(skip).toHaveAttribute('href', '#main')
  })

  it('opens the navigation in a drawer below md', async () => {
    setMediaMatches(MD, false)
    const user = userEvent.setup()
    renderShell()
    expect(screen.queryByRole('dialog')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(within(dialog).getByRole('link', { name: /Deployments/ })).toBeInTheDocument()
  })

  it('closes the drawer on Escape', async () => {
    setMediaMatches(MD, false)
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('closes the drawer when a nav link is chosen', async () => {
    setMediaMatches(MD, false)
    const user = userEvent.setup()
    renderShell()
    await user.click(screen.getByRole('button', { name: 'Open navigation' }))
    const dialog = await screen.findByRole('dialog')
    await user.click(within(dialog).getByRole('link', { name: /Deployments/ }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  })

  it('renders the rail between md and lg, without the drawer button', () => {
    setMediaMatches(MD, true)
    setMediaMatches(LG, false)
    renderShell()
    expect(screen.getByRole('navigation', { name: 'Primary' })).toHaveAttribute('data-rail', 'true')
    expect(screen.queryByRole('button', { name: 'Open navigation' })).toBeNull()
  })
})
