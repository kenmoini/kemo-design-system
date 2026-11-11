import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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
