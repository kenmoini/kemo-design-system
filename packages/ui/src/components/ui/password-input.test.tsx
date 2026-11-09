import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PasswordInput } from './password-input'

describe('PasswordInput', () => {
  it('renders a masked input', () => {
    render(<PasswordInput placeholder="Password" />)
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
  })

  it('toggles visibility and the trigger name when the trigger is clicked', async () => {
    const user = userEvent.setup()
    render(<PasswordInput placeholder="Password" />)
    await user.click(screen.getByRole('button', { name: /show password/i }))
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument()
  })

  it('forwards autoComplete to the input', () => {
    render(<PasswordInput placeholder="Password" autoComplete="new-password" />)
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('autocomplete', 'new-password')
  })
})
