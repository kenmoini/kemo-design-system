import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { CompleteProfilePage } from './complete-profile-page'

const identity = { provider: 'Keycloak', email: 'ken@acme.com' }

describe('CompleteProfilePage', () => {
  it('shows the identity chip', () => {
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    const chip = screen.getByText('Signed in with Keycloak as ken@acme.com')
    expect(chip).toBeVisible()
    // The status dot is decorative.
    expect(chip.firstElementChild).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders the email as a read-only field', () => {
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    const email = screen.getByRole('textbox', { name: 'Email' })
    expect(email).toHaveValue('ken@acme.com')
    expect(email).toHaveAttribute('readonly')
  })

  it('shows messages on empty submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={onSubmit}
        onSignOut={vi.fn()}
      />,
    )
    expect(screen.getByText('Letters, numbers and dashes only.')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Finish and continue' }))
    expect(await screen.findByText('Use 3 to 32 characters.')).toBeVisible()
    expect(screen.getByText('Enter your first name.')).toBeVisible()
    expect(screen.getByText('Enter your last name.')).toBeVisible()
    expect(screen.queryByText('Letters, numbers and dashes only.')).not.toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits only username and names', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={onSubmit}
        onSignOut={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Username'), 'ken-m')
    await user.type(screen.getByLabelText('First name'), 'Ken')
    await user.type(screen.getByLabelText('Last name'), 'Moini')
    await user.click(screen.getByRole('button', { name: 'Finish and continue' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      username: 'ken-m',
      firstName: 'Ken',
      lastName: 'Moini',
    })
  })

  it('passes a rejected onSubmit to onSubmitError and keeps the form usable', async () => {
    const user = userEvent.setup()
    const failure = new Error('Username taken.')
    const onSubmit = vi.fn().mockRejectedValue(failure)
    const onSubmitError = vi.fn()
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={onSubmit}
        onSubmitError={onSubmitError}
        onSignOut={vi.fn()}
      />,
    )
    await user.type(screen.getByLabelText('Username'), 'ken-m')
    await user.type(screen.getByLabelText('First name'), 'Ken')
    await user.type(screen.getByLabelText('Last name'), 'Moini')
    const button = screen.getByRole('button', { name: 'Finish and continue' })
    await user.click(button)
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledWith(failure))
    await waitFor(() => expect(button).toBeEnabled())
    await user.click(button)
    await waitFor(() => expect(onSubmitError).toHaveBeenCalledTimes(2))
    expect(onSubmit).toHaveBeenCalledTimes(2)
  })

  it('calls onSignOut from the Sign out button', async () => {
    const user = userEvent.setup()
    const onSignOut = vi.fn()
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={vi.fn()}
        onSignOut={onSignOut}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(onSignOut).toHaveBeenCalledTimes(1)
  })

  it("marks the username field for the drawer's initial focus", () => {
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        onSubmit={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Username')).toHaveAttribute('data-autofocus')
  })

  it('prefills from defaultValues', () => {
    render(
      <CompleteProfilePage
        brand="Acme"
        identity={identity}
        defaultValues={{ lastName: 'Moini' }}
        onSubmit={vi.fn()}
        onSignOut={vi.fn()}
      />,
    )
    expect(screen.getByLabelText('Last name')).toHaveValue('Moini')
  })
})
