import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ariaDisabledOutline, ariaDisabledSolid } from '../../../lib/aria-disabled'
import { stubLayout } from '../../../test/layout'
import type { AccessSettingsValues } from '../types'
import { AccessSettings, type AccessSettingsProps } from './settings-tab'

const values: AccessSettingsValues = {
  passwordSignIn: true,
  requireMfaForAdmins: false,
  accessTokenMinutes: 60,
  refreshTokenDays: 30,
  idleTimeoutHours: 8,
  serviceTokenMaxDays: 90,
  requireVerifiedEmail: true,
  smtp: {
    host: 'smtp.acme.dev',
    port: 587,
    username: 'console@acme.dev',
    password: 'hunter22',
    from: 'Kemo Console <no-reply@acme.dev>',
  },
}

function renderSettings(props: Partial<AccessSettingsProps> = {}) {
  const handlers = { onSave: vi.fn(), onSendTestEmail: vi.fn() }
  render(<AccessSettings values={values} {...handlers} {...props} />)
  return { ...handlers, ...props }
}

const save = () => screen.getByRole('button', { name: 'Save settings' })
const discard = () => screen.getByRole('button', { name: 'Discard changes' })

async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(screen.getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  stubLayout()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AccessSettings', () => {
  it('shows three sections filled from the values', () => {
    renderSettings()
    for (const name of ['Internal authentication', 'Tokens and sessions', 'Email verification']) {
      expect(screen.getByRole('heading', { level: 2, name })).toBeVisible()
    }
    expect(screen.getByRole('switch', { name: 'Allow password sign-in' })).toBeChecked()
    expect(screen.getByRole('switch', { name: 'Require MFA for admins' })).not.toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Access token lifetime' })).toHaveTextContent(
      '60 minutes',
    )
    expect(screen.getByRole('combobox', { name: 'Refresh token lifetime' })).toHaveTextContent(
      '30 days',
    )
    expect(screen.getByRole('combobox', { name: 'Idle timeout' })).toHaveTextContent('8 hours')
    expect(screen.getByRole('combobox', { name: 'Service account token max' })).toHaveTextContent(
      '90 days',
    )
    expect(
      screen.getByRole('switch', { name: 'Require verified email before first sign-in' }),
    ).toBeChecked()
    expect(screen.getByRole('textbox', { name: 'SMTP host' })).toHaveValue('smtp.acme.dev')
    expect(screen.getByRole('spinbutton', { name: 'Port' })).toHaveValue('587')
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveValue('console@acme.dev')
    expect(screen.getByLabelText('Password')).toHaveValue('hunter22')
    expect(screen.getByRole('textbox', { name: 'From address' })).toHaveValue(
      'Kemo Console <no-reply@acme.dev>',
    )
  })

  it('keeps Save settings off until a field changes, then saves the values', async () => {
    const user = userEvent.setup()
    let resolveSave: () => void = () => {}
    const onSave = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveSave = resolve
        }),
    )
    renderSettings({ onSave })
    // Off, but still focusable: aria-disabled, and Enter does nothing.
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    expect(discard()).toHaveAttribute('aria-disabled', 'true')
    expect(save()).not.toBeDisabled()
    // No hover tint while off.
    expect(save()).toHaveClass(ariaDisabledSolid)
    expect(discard()).toHaveClass(ariaDisabledOutline)
    save().focus()
    await user.keyboard('{Enter}')
    expect(onSave).not.toHaveBeenCalled()

    await user.click(screen.getByRole('switch', { name: 'Require MFA for admins' }))
    await choose(user, 'Access token lifetime', '30 minutes')
    expect(save()).not.toHaveAttribute('aria-disabled')
    expect(discard()).not.toHaveAttribute('aria-disabled')
    expect(save()).not.toHaveClass(ariaDisabledSolid)
    expect(discard()).not.toHaveClass(ariaDisabledOutline)
    // The select hands focus back to its trigger as it closes; move on from there.
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: 'Access token lifetime' })).toHaveFocus(),
    )

    save().focus()
    await user.keyboard('{Enter}')
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...values,
        requireMfaForAdmins: true,
        accessTokenMinutes: 30,
      }),
    )
    // Busy, not disabled, so the button keeps focus while the save runs.
    const busy = screen.getByRole('button', { name: 'Saving…' })
    expect(busy).toHaveAttribute('aria-busy', 'true')
    expect(busy).not.toBeDisabled()
    expect(busy).toHaveFocus()

    resolveSave()
    // Saved: the saved values are the form's new starting point, so it is clean again.
    expect(await screen.findByText('Settings saved')).toBeInTheDocument()
    expect(screen.getByText('Settings saved')).toHaveAttribute('role', 'status')
    expect(save()).toHaveAttribute('aria-disabled', 'true')
    expect(discard()).toHaveAttribute('aria-disabled', 'true')
    expect(save()).toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
    expect(screen.getByRole('switch', { name: 'Require MFA for admins' })).toBeChecked()
    expect(screen.getByRole('combobox', { name: 'Access token lifetime' })).toHaveTextContent(
      '30 minutes',
    )

    // A new change clears the message.
    await user.click(screen.getByRole('switch', { name: 'Require MFA for admins' }))
    expect(screen.queryByText('Settings saved')).not.toBeInTheDocument()
  })

  it('discards changes', async () => {
    // A pause between keys lets the number input restore its caret.
    const user = userEvent.setup({ delay: 20 })
    const { onSave } = renderSettings()
    const host = screen.getByRole('textbox', { name: 'SMTP host' })
    await user.clear(host)
    await user.type(host, 'mail.acme.dev')
    const port = screen.getByRole('spinbutton', { name: 'Port' })
    await user.clear(port)
    await user.type(port, '2525')
    await user.click(screen.getByRole('switch', { name: 'Allow password sign-in' }))
    expect(discard()).not.toHaveAttribute('aria-disabled')

    discard().focus()
    await user.keyboard('{Enter}')
    expect(screen.getByRole('textbox', { name: 'SMTP host' })).toHaveValue('smtp.acme.dev')
    expect(screen.getByRole('spinbutton', { name: 'Port' })).toHaveValue('587')
    expect(screen.getByRole('switch', { name: 'Allow password sign-in' })).toBeChecked()
    await waitFor(() => expect(save()).toHaveAttribute('aria-disabled', 'true'))
    expect(discard()).toHaveAttribute('aria-disabled', 'true')
    expect(screen.getByText('Changes discarded')).toHaveAttribute('role', 'status')
    expect(discard()).toHaveFocus()
    expect(document.activeElement).not.toBe(document.body)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('follows new values from the host and keeps the fields being edited', async () => {
    const user = userEvent.setup()
    const handlers = { onSave: vi.fn(), onSendTestEmail: vi.fn() }
    const { rerender } = render(<AccessSettings values={values} {...handlers} />)
    const username = screen.getByRole('textbox', { name: 'Username' })
    await user.clear(username)
    await user.type(username, 'mailer@acme.dev')

    rerender(
      <AccessSettings
        values={{
          ...values,
          idleTimeoutHours: 24,
          smtp: { ...values.smtp, host: 'mail.acme.dev' },
        }}
        {...handlers}
      />,
    )
    await waitFor(() =>
      expect(screen.getByRole('textbox', { name: 'SMTP host' })).toHaveValue('mail.acme.dev'),
    )
    expect(screen.getByRole('combobox', { name: 'Idle timeout' })).toHaveTextContent('24 hours')
    expect(screen.getByRole('textbox', { name: 'Username' })).toHaveValue('mailer@acme.dev')
    expect(save()).not.toHaveAttribute('aria-disabled')
  })

  it('needs a from address while verified email is required', async () => {
    const user = userEvent.setup()
    const { onSave } = renderSettings()
    await user.clear(screen.getByRole('textbox', { name: 'From address' }))
    await user.click(save())
    expect(await screen.findByText('Enter the address emails come from.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()

    // Without the requirement, an empty from address is fine: the message goes at once.
    await user.click(
      screen.getByRole('switch', { name: 'Require verified email before first sign-in' }),
    )
    await waitFor(() =>
      expect(screen.queryByText('Enter the address emails come from.')).not.toBeInTheDocument(),
    )
    await user.click(save())
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        ...values,
        requireVerifiedEmail: false,
        smtp: { ...values.smtp, from: '' },
      }),
    )
  })

  it('shows the from-address message even when the port is empty', async () => {
    const user = userEvent.setup({ delay: 20 })
    const { onSave } = renderSettings()
    await user.clear(screen.getByRole('spinbutton', { name: 'Port' }))
    await user.clear(screen.getByRole('textbox', { name: 'From address' }))
    await user.click(save())
    expect(
      await screen.findByText('Enter a port number.', undefined, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Enter the address emails come from.')).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('keeps the port between 1 and 65535', async () => {
    const user = userEvent.setup({ delay: 20 })
    const { onSave } = renderSettings()
    const port = screen.getByRole('spinbutton', { name: 'Port' })
    await user.clear(port)
    await user.type(port, '70000')
    await user.click(save())
    expect(
      await screen.findByText('Use a port from 1 to 65535.', undefined, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(onSave).not.toHaveBeenCalled()
  })

  it('sends a test email and shows why one failed', async () => {
    const user = userEvent.setup()
    const onSendTestEmail = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('SMTP login failed'))
    const { onSave } = renderSettings({ onSendTestEmail })
    const send = screen.getByRole('button', { name: 'Send test email' })
    await user.click(send)
    expect(onSendTestEmail).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    await user.click(send)
    expect(await screen.findByRole('alert')).toHaveTextContent('SMTP login failed')
    expect(onSendTestEmail).toHaveBeenCalledTimes(2)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('shows why a save failed and keeps the changes', async () => {
    const user = userEvent.setup()
    renderSettings({ onSave: vi.fn().mockRejectedValue(new Error('Settings are locked')) })
    await user.click(screen.getByRole('switch', { name: 'Require MFA for admins' }))
    await user.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent('Settings are locked')
    expect(screen.getByRole('switch', { name: 'Require MFA for admins' })).toBeChecked()
    expect(save()).not.toHaveAttribute('aria-disabled')
    expect(screen.queryByText('Settings saved')).not.toBeInTheDocument()
  })
})
