import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AuthLink } from './auth-link'
import { FormAlert } from './form-alert'
import { PasswordField } from './password-field'
import { ProviderButtons } from './provider-buttons'
import { TextField } from './text-field'

describe('FormAlert', () => {
  it('renders nothing without a message', () => {
    const { container } = render(<FormAlert message={null} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders an alert with the message', () => {
    render(<FormAlert message="Wrong password." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Wrong password.')
  })
})

describe('TextField', () => {
  it('marks the input invalid and shows the error', () => {
    render(<TextField label="Email" error="Enter your email." />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Enter your email.')).toBeInTheDocument()
  })

  it('is not invalid without an error', () => {
    render(<TextField label="Email" helperText="We never share it." />)
    expect(screen.getByRole('textbox', { name: 'Email' })).not.toHaveAttribute('aria-invalid')
    expect(screen.getByText('We never share it.')).toBeInTheDocument()
  })

  it('supports readOnly', () => {
    render(<TextField label="Email" readOnly defaultValue="a@b.co" />)
    expect(screen.getByRole('textbox', { name: 'Email' })).toHaveAttribute('readonly')
  })

  it('forwards ref, name and change handlers like register()', async () => {
    const ref = vi.fn()
    const onChange = vi.fn()
    render(<TextField label="Email" ref={ref} name="email" onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Email' })
    expect(ref).toHaveBeenCalledWith(input)
    expect(input).toHaveAttribute('name', 'email')
    await userEvent.type(input, 'x')
    expect(onChange).toHaveBeenCalled()
  })
})

describe('PasswordField', () => {
  it('marks the input invalid and shows the error', () => {
    render(<PasswordField label="Password" error="Too short." />)
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Too short.')).toBeInTheDocument()
  })

  it('forwards ref and name to the input', () => {
    const ref = vi.fn()
    render(<PasswordField label="Password" ref={ref} name="password" />)
    const input = screen.getByLabelText('Password')
    expect(ref).toHaveBeenCalledWith(input)
    expect(input).toHaveAttribute('name', 'password')
  })

  it('delivers register()-style onChange and onBlur to the input', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onBlur = vi.fn()
    render(<PasswordField label="Password" name="password" onChange={onChange} onBlur={onBlur} />)
    const input = screen.getByLabelText('Password')
    await user.type(input, 'a')
    expect(onChange.mock.calls[0]?.[0].target).toBe(input)
    await user.tab()
    await user.tab()
    expect(onBlur).toHaveBeenCalledTimes(1)
    expect(onBlur.mock.calls[0]?.[0].target).toBe(input)
  })
})

describe('ProviderButtons', () => {
  it('renders a button per provider and calls onSelect', async () => {
    const onSelect = vi.fn()
    render(
      <ProviderButtons verb="Continue" providers={[{ id: 'gh', label: 'GitHub', onSelect }]} />,
    )
    await userEvent.click(screen.getByRole('button', { name: 'Continue with GitHub' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('uses the sign up verb', () => {
    render(
      <ProviderButtons
        verb="Sign up"
        providers={[{ id: 'g', label: 'Google', onSelect: vi.fn() }]}
      />,
    )
    expect(screen.getByRole('button', { name: 'Sign up with Google' })).toBeInTheDocument()
  })

  it('renders nothing for an empty list', () => {
    const { container } = render(<ProviderButtons verb="Continue" providers={[]} />)
    expect(container).toBeEmptyDOMElement()
  })
})

describe('AuthLink', () => {
  it('renders a plain link by default', () => {
    render(<AuthLink href="/signup">Sign up</AuthLink>)
    expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute('href', '/signup')
  })

  it('renders through a custom link component', () => {
    render(
      <AuthLink
        href="/signup"
        linkComponent={({ href, className, children }) => (
          <a data-testid="custom" href={href} className={className}>
            {children}
          </a>
        )}
      >
        Sign up
      </AuthLink>,
    )
    const link = screen.getByTestId('custom')
    expect(link).toHaveAttribute('href', '/signup')
    expect(link).toHaveTextContent('Sign up')
  })
})
