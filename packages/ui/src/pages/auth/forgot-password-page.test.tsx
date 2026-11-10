import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ForgotPasswordPage } from './forgot-password-page'

const links = { signIn: '/sign-in' }

describe('ForgotPasswordPage', () => {
  it('shows the form copy and a back link', () => {
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible()
    expect(
      screen.getByText("Enter your email and we'll send you a link to choose a new one."),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    )
  })

  it("marks the email field for the drawer's initial focus", () => {
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    expect(screen.getByLabelText('Email')).toHaveAttribute('data-autofocus')
  })

  it('shows an error for an invalid email', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits and then shows the sent state', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email'), 'ken@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    const heading = await screen.findByRole('heading', { level: 1, name: 'Check your email' })
    expect(heading).toBeVisible()
    expect(heading).toHaveFocus()
    expect(onSubmit).toHaveBeenCalledWith({ email: 'ken@example.com' })
    expect(
      screen.getByText('If an account exists for ken@example.com, a reset link is on its way.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    )
  })

  it('a rejected onSubmit keeps the form', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('nope'))
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={onSubmit} error="Try again." />)
    await user.type(screen.getByLabelText('Email'), 'ken@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Send reset link' })).toBeEnabled(),
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible()
    expect(screen.getByRole('alert')).toHaveTextContent('Try again.')
  })

  it('passes a rejected onSubmit to onSubmitError and keeps the form usable', async () => {
    const user = userEvent.setup()
    const failure = new Error('nope')
    const onSubmit = vi.fn().mockRejectedValue(failure)
    const onSubmitError = vi.fn()
    render(
      <ForgotPasswordPage
        brand="Acme"
        links={links}
        onSubmit={onSubmit}
        onSubmitError={onSubmitError}
      />,
    )
    await user.type(screen.getByLabelText('Email'), 'ken@example.com')
    const button = screen.getByRole('button', { name: 'Send reset link' })
    await user.click(button)
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledWith(failure))
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible()
    await user.click(button)
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledTimes(2))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('renders the sent state when forced', () => {
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={vi.fn()} sent />)
    expect(screen.getByRole('heading', { level: 1, name: 'Check your email' })).toBeVisible()
    expect(
      screen.getByText('If an account exists for that address, a reset link is on its way.'),
    ).toBeVisible()
    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    )
  })

  it('sent={false} keeps the form after a submission', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<ForgotPasswordPage brand="Acme" links={links} onSubmit={onSubmit} sent={false} />)
    await user.type(screen.getByLabelText('Email'), 'ken@example.com')
    await user.click(screen.getByRole('button', { name: 'Send reset link' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(screen.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible()
  })
})
