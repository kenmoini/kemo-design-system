import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

  it('fires onChange from the input with its name', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<PasswordInput placeholder="Password" name="password" onChange={onChange} />)
    const input = screen.getByPlaceholderText('Password')
    await user.type(input, 'a')
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: expect.objectContaining({ name: 'password' }) }),
    )
    expect(onChange.mock.calls[0]?.[0].target).toBe(input)
  })

  it('fires onBlur once for the input and not for the visibility toggle', async () => {
    const user = userEvent.setup()
    const onBlur = vi.fn()
    render(<PasswordInput placeholder="Password" onBlur={onBlur} />)
    const input = screen.getByPlaceholderText('Password')
    await user.click(input)
    await user.tab()
    expect(screen.getByRole('button', { name: /show password/i })).toHaveFocus()
    expect(onBlur).toHaveBeenCalledTimes(1)
    expect(onBlur.mock.calls[0]?.[0].target).toBe(input)
    await user.tab()
    expect(onBlur).toHaveBeenCalledTimes(1)
  })

  it('supports a controlled value', () => {
    render(<PasswordInput placeholder="Password" value="secret" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('Password')).toHaveValue('secret')
  })
})
