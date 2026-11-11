import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent } from '../auth/types'
import { BlankPage } from './blank-page'

const defaultMessage = 'Nothing here yet. Replace this area with your content.'

describe('BlankPage', () => {
  it('renders the title, context and action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <BlankPage
        title="Page title"
        context="One line of context about this page"
        action={{ label: 'Primary action', onSelect }}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Page title' })).toBeInTheDocument()
    expect(screen.getByText('One line of context about this page')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Primary action' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders an href action through the link component', () => {
    const HostLink: LinkComponent = ({ href, children, ...rest }) => (
      <a href={`/host${href}`} {...rest}>
        {children}
      </a>
    )
    render(
      <BlankPage
        title="Page title"
        action={{ label: 'Primary action', href: '/new' }}
        linkComponent={HostLink}
      />,
    )
    expect(screen.getByRole('link', { name: 'Primary action' })).toHaveAttribute(
      'href',
      '/host/new',
    )
  })

  it('renders the default empty message and the empty action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(<BlankPage title="Page title" emptyAction={{ label: 'Secondary action', onSelect }} />)
    expect(screen.getByText(defaultMessage)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Secondary action' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders children instead of the empty state', () => {
    render(
      <BlankPage title="Page title">
        <p>Real content</p>
      </BlankPage>,
    )
    expect(screen.getByText('Real content')).toBeInTheDocument()
    expect(screen.queryByText(defaultMessage)).toBeNull()
  })
})
