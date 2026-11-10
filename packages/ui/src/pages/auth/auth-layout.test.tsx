import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthLayout } from './auth-layout'

describe('AuthLayout', () => {
  it('renders slots in order with the title as the h1', () => {
    render(
      <AuthLayout
        logo={<span data-testid="logo" />}
        brand="Acme Console"
        title="Sign in"
        description="Sign in to continue."
        extras={<a href="/x">extra</a>}
        footer={<span>© 2026 Acme</span>}
      >
        <input aria-label="form" />
      </AuthLayout>,
    )
    const order = [
      screen.getByTestId('logo'),
      screen.getByText('Acme Console'),
      screen.getByRole('heading', { level: 1, name: 'Sign in' }),
      screen.getByText('Sign in to continue.'),
      screen.getByLabelText('form'),
      screen.getByText('extra'),
      screen.getByText('© 2026 Acme'),
    ]
    for (let i = 1; i < order.length; i++)
      expect(
        order[i - 1]!.compareDocumentPosition(order[i]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy()
  })
  it('is a non-modal dialog with no close affordance', () => {
    render(
      <AuthLayout brand="Acme" title="Sign in">
        <input aria-label="form" />
      </AuthLayout>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Sign in' })
    expect(dialog).not.toHaveAttribute('aria-modal', 'true')
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })

  it('focuses the heading when the title changes, not on first render', () => {
    const { rerender } = render(
      <AuthLayout brand="Acme" title="Reset your password">
        <input aria-label="form" />
      </AuthLayout>,
    )
    expect(screen.getByRole('heading', { level: 1 })).not.toHaveFocus()
    rerender(
      <AuthLayout brand="Acme" title="Check your email">
        <p>Sent.</p>
      </AuthLayout>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Check your email' })).toHaveFocus()
  })
})
