import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { RegisterPage } from './register-page'

const links = { signIn: '/sign-in', terms: '/terms', privacy: '/privacy' }

describe('RegisterPage', () => {
  it('shows required messages on empty submit', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegisterPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Enter your first name.')).toBeVisible()
    expect(screen.getByText('Enter your last name.')).toBeVisible()
    expect(screen.getByText('You need to agree to continue.')).toBeVisible()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('shows a mismatch message', async () => {
    const user = userEvent.setup()
    render(<RegisterPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    await user.type(screen.getByLabelText('First name'), 'Ken')
    await user.type(screen.getByLabelText('Last name'), 'Moini')
    await user.type(screen.getByLabelText('Username'), 'ken-m')
    await user.type(screen.getByLabelText('Email'), 'ken@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery')
    await user.type(screen.getByLabelText('Confirm password'), 'something-else-entirely')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText("Passwords don't match.")).toBeVisible()
  })

  it('validates the username', async () => {
    const user = userEvent.setup()
    render(<RegisterPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    await user.type(screen.getByLabelText('Username'), 'ab')
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    expect(await screen.findByText('Use 3 to 32 characters.')).toBeVisible()
    await user.clear(screen.getByLabelText('Username'))
    await user.type(screen.getByLabelText('Username'), 'user_name')
    expect(await screen.findByText('Letters, numbers and dashes only.')).toBeVisible()
  })

  it('submits all seven values', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(<RegisterPage brand="Acme" links={links} onSubmit={onSubmit} />)
    await user.type(screen.getByLabelText('First name'), 'Ken')
    await user.type(screen.getByLabelText('Last name'), 'Moini')
    await user.type(screen.getByLabelText('Username'), 'ken-m')
    await user.type(screen.getByLabelText('Email'), 'ken@example.com')
    await user.type(screen.getByLabelText('Password'), 'correct-horse-battery')
    await user.type(screen.getByLabelText('Confirm password'), 'correct-horse-battery')
    await user.click(screen.getByRole('checkbox'))
    await user.click(screen.getByRole('button', { name: 'Create account' }))
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith({
      firstName: 'Ken',
      lastName: 'Moini',
      username: 'ken-m',
      email: 'ken@example.com',
      password: 'correct-horse-battery',
      confirmPassword: 'correct-horse-battery',
      acceptTerms: true,
    })
  })

  it('toggles the checkbox by keyboard and by label text, not by links', async () => {
    const user = userEvent.setup()
    render(<RegisterPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    const box = screen.getByRole('checkbox')
    await user.click(screen.getByText(/I agree to the/))
    await waitFor(() => expect(box).toBeChecked())
    await act(async () => box.focus())
    await user.keyboard(' ')
    await waitFor(() => expect(box).not.toBeChecked())
  })

  it('renders links', () => {
    render(<RegisterPage brand="Acme" links={links} onSubmit={vi.fn()} />)
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/sign-in')
    expect(screen.getByRole('link', { name: 'Terms of Service' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
  })
})
