import { render, screen, within } from '@testing-library/react'
import { forwardRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent } from '../auth/types'
import { ResourceDetailShell } from './resource-detail-shell'
import type { ResourceDetailShellProps } from './types'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'yaml', label: 'YAML' },
  { id: 'events', label: 'Events' },
]

const tabHref = (id: string) =>
  id === 'overview' ? '/gateways/edge/infra/public' : `/gateways/edge/infra/public/${id}`

function renderShell(props: Partial<ResourceDetailShellProps> = {}) {
  return render(
    <ResourceDetailShell
      breadcrumb={[{ label: 'Gateways', href: '/gateways' }, { label: 'public' }]}
      name="public"
      status={{ tone: 'warning', label: 'Programming' }}
      context="edge · infra · gateway.networking.k8s.io/v1"
      actions={<button type="button">Delete</button>}
      tabs={tabs}
      activeTab="yaml"
      tabHref={tabHref}
      {...props}
    >
      <p>YAML content</p>
    </ResourceDetailShell>,
  )
}

describe('ResourceDetailShell', () => {
  it('renders the breadcrumb: links up the tree, the resource as the current page', () => {
    renderShell()
    const nav = screen.getByRole('navigation', { name: 'breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Gateways' })).toHaveAttribute('href', '/gateways')
    expect(within(nav).getAllByRole('link')).toHaveLength(1)
    expect(within(nav).getByText('public')).toHaveAttribute('aria-current', 'page')
  })

  it('names the resource in the h1 with its status badge, then the context and actions', () => {
    renderShell()
    const heading = screen.getByRole('heading', { level: 1, name: 'public Programming' })
    expect(within(heading).getByText('Programming')).toBeInTheDocument()
    expect(screen.getByText('edge · infra · gateway.networking.k8s.io/v1')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('leaves the badge out without a status', () => {
    renderShell({ status: undefined })
    expect(screen.getByRole('heading', { level: 1, name: 'public' })).toBeInTheDocument()
  })

  it('renders a link per tab with its href and marks the active one selected', () => {
    renderShell()
    const links = screen.getAllByRole('tab')
    expect(links.map((tab) => tab.textContent)).toEqual(['Overview', 'YAML', 'Events'])
    links.forEach((tab, index) => {
      expect(tab.tagName).toBe('A')
      expect(tab).toHaveAttribute('href', tabHref(tabs[index]!.id))
    })
    expect(screen.getByRole('tab', { name: 'YAML' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('tab', { name: 'Events' })).toHaveAttribute('aria-selected', 'false')
  })

  it('renders the children in the active panel only', () => {
    renderShell()
    const panels = screen.getAllByRole('tabpanel')
    expect(panels).toHaveLength(1)
    expect(within(panels[0]!).getByText('YAML content')).toBeInTheDocument()
  })

  it('renders the breadcrumb and tab links through the host link component', () => {
    const HostLink: LinkComponent = forwardRef<HTMLAnchorElement, { href: string }>(
      function HostLink(props, ref) {
        return <a data-host-link="" ref={ref} {...props} />
      },
    )
    renderShell({ linkComponent: HostLink })
    expect(screen.getByRole('link', { name: 'Gateways' })).toHaveAttribute('data-host-link')
    const events = screen.getByRole('tab', { name: 'Events' })
    expect(events).toHaveAttribute('data-host-link')
    expect(events).toHaveAttribute('href', '/gateways/edge/infra/public/events')
  })

  it('scrolls the active tab into view', () => {
    // jsdom has no scrollIntoView; the shell calls it only where it exists.
    const scrollIntoView = vi.fn()
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })
    try {
      renderShell({ activeTab: 'events' })
      expect(scrollIntoView).toHaveBeenCalledTimes(1)
      expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole('tab', { name: 'Events' }))
    } finally {
      delete (HTMLElement.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })
})
