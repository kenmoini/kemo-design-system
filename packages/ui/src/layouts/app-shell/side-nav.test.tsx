import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HouseIcon, RocketIcon } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import type { LinkComponent } from '../../pages/auth/types'
import { setMediaMatches } from '../../test/media'
import { AppShell } from './app-shell'
import { SideNav } from './side-nav'
import type { NavGroup } from './types'

const MD = '(min-width: 48em)'
const LG = '(min-width: 64em)'

const groups: NavGroup[] = [
  {
    label: 'Platform',
    items: [
      { id: 'overview', label: 'Overview', icon: <HouseIcon />, href: '/', active: true },
      {
        id: 'deployments',
        label: 'Deployments',
        icon: <RocketIcon />,
        href: '/deployments',
        badge: 12,
      },
    ],
  },
]

function renderInShell() {
  return render(
    <AppShell topBar={null} sideNav={<SideNav groups={groups} />}>
      content
    </AppShell>,
  )
}

describe('SideNav', () => {
  it('active item has aria-current', () => {
    render(<SideNav groups={groups} />)
    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /Deployments/ })).not.toHaveAttribute('aria-current')
    expect(screen.getByRole('list', { name: 'Platform' })).toBeInTheDocument()
  })

  it('renders the badge text', () => {
    render(<SideNav groups={groups} />)
    expect(screen.getByRole('link', { name: 'Deployments 12' })).toHaveTextContent('12')
  })

  it('renders items through the host link component, forwarding rest props and ref', () => {
    // A host link written to the LinkComponent contract: rest props and ref reach the anchor.
    const HostLink: LinkComponent = ({ href, ref, ...rest }) => (
      <a ref={ref} href={href} data-host="" {...rest} />
    )
    render(<SideNav groups={groups} linkComponent={HostLink} />)
    const active = screen.getByRole('link', { name: 'Overview' })
    expect(active).toHaveAttribute('data-host')
    expect(active).toHaveAttribute('aria-current', 'page')
    const other = screen.getByRole('link', { name: 'Deployments 12' })
    expect(other).toHaveAttribute('data-host')
    expect(other).toHaveAttribute('href', '/deployments')
    expect(other).not.toHaveAttribute('aria-current')
  })

  it('collapse sidebar toggles data-rail', async () => {
    setMediaMatches(MD, true)
    setMediaMatches(LG, true)
    const user = userEvent.setup()
    renderInShell()
    const nav = screen.getByRole('navigation', { name: 'Primary' })
    expect(nav).toHaveAttribute('data-rail', 'false')
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(nav).toHaveAttribute('data-rail', 'true')
    await user.click(screen.getByRole('button', { name: 'Expand sidebar' }))
    expect(nav).toHaveAttribute('data-rail', 'false')
  })

  it('offers the collapse control only from lg', () => {
    setMediaMatches(MD, true)
    setMediaMatches(LG, false)
    renderInShell()
    expect(screen.queryByRole('button', { name: /sidebar/ })).toBeNull()
  })
})
