import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SignInPage } from './sign-in-page'

const links = { register: '/register', forgotPassword: '/forgot-password' }

describe('SignInPage', () => {
  it('shows field errors on empty submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SignInPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email or username.')).toBeVisible()
    expect(screen.getByText('Enter your password.')).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits typed values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<SignInPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email or username'), 'ken')
    await user.type(screen.getByLabelText('Password'), 'hunter2hunter2')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({ identifier: 'ken', password: 'hunter2hunter2' })
  })

  it('shows the host error and keeps it while editing', async () => {
    const user = userEvent.setup()
    render(
      <SignInPage
        brand="Acme"
        links={links}
        onSubmit={vi.fn()}
        error="Something went wrong. Try again."
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
    await user.type(screen.getByLabelText('Email or username'), 'k')
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  })

  it('disables the button while submitting', async () => {
    const user = userEvent.setup()
    let resolve!: () => void
    const onSubmit = vi.fn(
      () =>
        new Promise<void>((r) => {
          resolve = r
        }),
    )
    render(<SignInPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('Email or username'), 'ken')
    await user.type(screen.getByLabelText('Password'), 'hunter2hunter2')
    const button = screen.getByRole('button', { name: 'Sign in' })
    await user.click(button)
    await waitFor(() => expect(button).toBeDisabled())
    await user.click(button)
    expect(onSubmit).toHaveBeenCalledTimes(1)
    resolve()
    await waitFor(() => expect(button).toBeEnabled())
  })

  it('passes a rejected onSubmit to onSubmitError and keeps the form usable', async () => {
    const user = userEvent.setup()
    const failure = new Error('Wrong password.')
    const onSubmit = vi.fn().mockRejectedValue(failure)
    const onSubmitError = vi.fn()
    render(
      <SignInPage brand="Acme" links={links} onSubmit={onSubmit} onSubmitError={onSubmitError} />,
    )
    await user.type(screen.getByLabelText('Email or username'), 'ken')
    await user.type(screen.getByLabelText('Password'), 'hunter2hunter2')
    const button = screen.getByRole('button', { name: 'Sign in' })
    await user.click(button)
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledWith(failure))
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledTimes(2))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  // An escaped rejection would surface as an unhandled rejection, which fails the Vitest run.
  it('settles a rejected onSubmit without onSubmitError', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockRejectedValue(new Error('Wrong password.'))
    render(<SignInPage brand="Acme" links={links} onSubmit={onSubmit} error="Wrong password." />)
    await user.type(screen.getByLabelText('Email or username'), 'ken')
    await user.type(screen.getByLabelText('Password'), 'hunter2hunter2')
    const button = screen.getByRole('button', { name: 'Sign in' })
    await user.click(button)
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password.')
  })

  it('re-validates a field on change after first submit', async () => {
    const user = userEvent.setup()
    render(<SignInPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(await screen.findByText('Enter your email or username.')).toBeVisible()
    await user.type(screen.getByLabelText('Email or username'), 'k')
    await waitFor(() => expect(screen.queryByText('Enter your email or username.')).toBeNull())
    expect(screen.getByText('Enter your password.')).toBeVisible()
  })

  it('renders providers and links', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <SignInPage
        brand="Acme"
        links={links}
        onSubmit={vi.fn()}
        providers={[{ id: 'github', label: 'GitHub', onSelect }]}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Continue with GitHub' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('link', { name: 'Create an account' })).toHaveAttribute(
      'href',
      '/register',
    )
    expect(screen.getByRole('link', { name: 'Forgot your password?' })).toHaveAttribute(
      'href',
      '/forgot-password',
    )
  })

  it('tab order', async () => {
    const user = userEvent.setup()
    render(<SignInPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    await user.click(screen.getByLabelText('Email or username'))
    expect(screen.getByLabelText('Email or username')).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('Password')).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: /password/i })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'Sign in' })).toHaveFocus()
  })
})
