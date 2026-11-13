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

  it('puts aria-describedby on the input', () => {
    render(
      <>
        <PasswordInput placeholder="Password" aria-describedby="hint" />
        <p id="hint">Leave blank to keep it</p>
      </>,
    )
    expect(screen.getByPlaceholderText('Password')).toHaveAccessibleDescription(
      'Leave blank to keep it',
    )
  })

  it('routes input attributes to the input and not the root', () => {
    const { container } = render(
      <PasswordInput placeholder="Password" id="pw" aria-describedby="hint" data-foo="bar" />,
    )
    const input = screen.getByPlaceholderText('Password')
    expect(input).toHaveAttribute('id', 'pw')
    expect(input).toHaveAttribute('aria-describedby', 'hint')
    expect(input).toHaveAttribute('data-foo', 'bar')
    const root = container.firstElementChild!
    expect(root).not.toHaveAttribute('aria-describedby')
    expect(root).not.toHaveAttribute('data-foo')
    expect(root).not.toHaveAttribute('id', 'pw')
  })

  it('supports a controlled value', () => {
    render(<PasswordInput placeholder="Password" value="secret" onChange={() => {}} />)
    expect(screen.getByPlaceholderText('Password')).toHaveValue('secret')
  })

  it.each(['2xs', 'md'] as const)(
    'stretches the trigger to the input height at size %s instead of a fixed height',
    (size) => {
      render(<PasswordInput size={size} placeholder="Password" />)
      const trigger = screen.getByRole('button', { name: /show password/i })
      expect(trigger).toHaveClass('inset-y_0', 'h_auto')
    },
  )
})
