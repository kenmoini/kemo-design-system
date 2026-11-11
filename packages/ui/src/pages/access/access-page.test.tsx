import { render, screen, within } from '@testing-library/react'
import { forwardRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent } from '../auth/types'
import { AccessPage } from './access-page'
import { accessTabs } from './access-tabs'
import type { AccessTabId } from './types'

const tabHref = (tab: AccessTabId) => (tab === 'overview' ? '/access' : `/access/${tab}`)

const LABELS = [
  'Overview',
  'Users',
  'Groups',
  'Roles',
  'Permissions',
  'Audit',
  'OIDC',
  'Service accounts',
  'OAuth apps',
  'Settings',
]

describe('AccessPage', () => {
  it('lists the ten tabs in order', () => {
    expect(accessTabs.map((tab) => tab.label)).toEqual(LABELS)
    expect(accessTabs.map((tab) => tab.id)).toEqual([
      'overview',
      'users',
      'groups',
      'roles',
      'permissions',
      'audit',
      'oidc',
      'service-accounts',
      'oauth-apps',
      'settings',
    ])
  })

  it('renders ten tab links with hrefs from tabHref', () => {
    render(
      <AccessPage activeTab="users" tabHref={tabHref}>
        <p>Users content</p>
      </AccessPage>,
    )
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(LABELS)
    tabs.forEach((tab, index) => {
      expect(tab.tagName).toBe('A')
      expect(tab).toHaveAttribute('href', tabHref(accessTabs[index]!.id))
    })
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('href', '/access/users')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('href', '/access')
  })

  it('marks the active tab selected', () => {
    render(
      <AccessPage activeTab="users" tabHref={tabHref}>
        <p>Users content</p>
      </AccessPage>,
    )
    expect(screen.getByRole('tab', { name: 'Users' })).toHaveAttribute('aria-selected', 'true')
    for (const tab of screen.getAllByRole('tab').filter((t) => t.textContent !== 'Users')) {
      expect(tab).toHaveAttribute('aria-selected', 'false')
    }
  })

  it('renders the header and the children in the active panel only', () => {
    render(
      <AccessPage activeTab="users" tabHref={tabHref}>
        <p>Users content</p>
      </AccessPage>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Access' })).toBeInTheDocument()
    expect(screen.getByText('Users, groups, roles and how people sign in')).toBeInTheDocument()
    const panels = screen.getAllByRole('tabpanel')
    expect(panels).toHaveLength(1)
    expect(within(panels[0]!).getByText('Users content')).toBeInTheDocument()
  })

  it('renders the tabs through the host link component', () => {
    const HostLink: LinkComponent = forwardRef<HTMLAnchorElement, { href: string }>(
      function HostLink(props, ref) {
        return <a data-host-link="" ref={ref} {...props} />
      },
    )
    render(
      <AccessPage activeTab="audit" tabHref={tabHref} linkComponent={HostLink} title="Identity">
        <p>Audit content</p>
      </AccessPage>,
    )
    const audit = screen.getByRole('tab', { name: 'Audit' })
    expect(audit).toHaveAttribute('data-host-link')
    expect(audit).toHaveAttribute('href', '/access/audit')
    expect(audit).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('heading', { level: 1, name: 'Identity' })).toBeInTheDocument()
  })

  it('scrolls the active tab into view', () => {
    // jsdom has no scrollIntoView; the page calls it only where it exists.
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })
    try {
      render(
        <AccessPage activeTab="settings" tabHref={tabHref}>
          <p>Settings content</p>
        </AccessPage>,
      )
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView).toHaveBeenCalledWith({ inline: 'nearest', block: 'nearest' })
      expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('tab', { name: 'Settings' }))
    } finally {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })
})
