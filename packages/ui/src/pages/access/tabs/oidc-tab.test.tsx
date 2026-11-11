import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../../test/layout'
import type { OidcProvider } from '../types'
import { AccessOidc, type AccessOidcProps } from './oidc-tab'

const providers: OidcProvider[] = [
  {
    id: 'okta',
    name: 'Okta (acme)',
    issuer: 'https://acme.okta.com',
    users: 318,
    groupsMapped: 12,
    sync: { state: 'synced' },
    lastSyncAt: '2026-11-11T09:49:00Z',
    enabled: true,
    clientId: '0oa1acme',
    scopes: ['openid', 'profile', 'email', 'groups'],
    groupClaim: 'groups',
    autoCreateUsers: true,
  },
  {
    id: 'google',
    name: 'Google Workspace',
    issuer: 'https://accounts.google.com',
    users: 94,
    groupsMapped: 4,
    sync: { state: 'syncing', progress: 61 },
    lastSyncAt: '2026-11-11T08:00:00Z',
    enabled: true,
  },
  {
    id: 'azure',
    name: 'Azure AD (contractors)',
    issuer: 'https://login.microsoftonline.com/acme/v2.0',
    users: 0,
    groupsMapped: 0,
    sync: { state: 'error', message: 'invalid client secret' },
    lastSyncAt: '2026-11-09T10:00:00Z',
    enabled: true,
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    issuer: 'https://gitlab.acme.dev',
    users: 0,
    groupsMapped: 0,
    sync: { state: 'disabled' },
    enabled: false,
  },
]

function renderOidc(props: Partial<AccessOidcProps> = {}) {
  const handlers = {
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onSyncNow: vi.fn(),
    onSyncAll: vi.fn(),
    onSetEnabled: vi.fn(),
    onRemove: vi.fn(),
  }
  render(<AccessOidc providers={providers} {...handlers} {...props} />)
  return { ...handlers, ...props }
}

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: `Actions for ${name}` }))
  return screen.findByRole('menu')
}

async function openRowAction(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  const menu = await openRowMenu(user, name)
  await user.click(within(menu).getByRole('menuitem', { name: item }))
}

beforeEach(() => {
  stubLayout()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AccessOidc', () => {
  it('lists one row per provider with its sync state in words', () => {
    renderOidc()
    for (const header of ['Provider', 'Issuer', 'Users', 'Groups mapped', 'Sync', 'Last sync']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(bodyRows()).toHaveLength(4)
    // The toolbar: "4 providers · 412 synced users".
    expect(screen.getByText('412 synced users').parentElement).toHaveTextContent(
      /^4 providers\s*·\s*412 synced users$/,
    )

    const okta = rowFor('Okta \\(acme\\)')
    expect(within(okta).getByText('https://acme.okta.com')).toBeInTheDocument()
    expect(within(okta).getByText('318')).toBeInTheDocument()
    expect(within(okta).getByText('Synced')).toBeInTheDocument()
    expect(within(okta).getByText('Nov 11, 2026, 09:49 UTC')).toBeInTheDocument()

    const google = rowFor('Google Workspace')
    expect(within(google).getByText('Syncing · 61%')).toBeInTheDocument()
    expect(within(google).getByText('running')).toBeInTheDocument()

    expect(
      within(rowFor('Azure AD')).getByText('Error · invalid client secret'),
    ).toBeInTheDocument()

    const gitlab = rowFor('GitLab')
    expect(within(gitlab).getByText('Disabled')).toBeInTheDocument()
    expect(within(gitlab).getByText('Never')).toBeInTheDocument()
  })

  it('has no filters, search or row checkboxes', () => {
    renderOidc()
    expect(screen.queryByRole('complementary', { name: 'Filters' })).not.toBeInTheDocument()
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Bulk actions' })).not.toBeInTheDocument()
  })

  it('syncs every provider, or one from its row menu', async () => {
    const user = userEvent.setup()
    const { onSyncAll, onSyncNow } = renderOidc()
    await user.click(screen.getByRole('button', { name: 'Sync all' }))
    expect(onSyncAll).toHaveBeenCalledTimes(1)

    await openRowAction(user, 'Okta (acme)', 'Sync now')
    expect(onSyncNow).toHaveBeenCalledWith('okta')
  })

  it('offers no second sync while one runs, nor on a disabled provider', async () => {
    const user = userEvent.setup()
    renderOidc()
    let menu = await openRowMenu(user, 'Google Workspace')
    expect(within(menu).getByRole('menuitem', { name: 'Sync now' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await user.keyboard('{Escape}')
    menu = await openRowMenu(user, 'GitLab')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Sync now', 'Edit', 'Enable', 'Remove'])
    expect(within(menu).getByRole('menuitem', { name: 'Sync now' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
  })

  it('adds a provider through the dialog, checking the issuer URL', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderOidc()
    await user.click(screen.getByRole('button', { name: '+ Add provider' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add provider' })
    for (const scope of ['openid', 'profile', 'email', 'groups']) {
      expect(within(dialog).getByText(scope)).toBeInTheDocument()
    }
    expect(within(dialog).getByRole('textbox', { name: 'Group claim' })).toHaveValue('groups')
    expect(
      within(dialog).getByRole('switch', { name: 'Create users on first sign-in' }),
    ).toBeChecked()

    await user.click(within(dialog).getByRole('button', { name: 'Add provider' }))
    expect(await within(dialog).findByText('Enter a name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter the issuer URL.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter the client id.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter the client secret.')).toBeInTheDocument()

    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Keycloak')
    await user.type(within(dialog).getByRole('textbox', { name: 'Issuer URL' }), 'keycloak')
    await user.type(within(dialog).getByRole('textbox', { name: 'Client id' }), 'console')
    await user.type(within(dialog).getByLabelText(/^Client secret/), 's3cret')
    await user.click(within(dialog).getByRole('button', { name: 'Add provider' }))
    expect(
      await within(dialog).findByText('Enter a valid URL, e.g. https://acme.okta.com.'),
    ).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()

    const issuer = within(dialog).getByRole('textbox', { name: 'Issuer URL' })
    await user.clear(issuer)
    await user.type(issuer, 'https://sso.acme.dev/realms/acme')
    await user.click(within(dialog).getByRole('button', { name: 'Add provider' }))
    await waitFor(() =>
      expect(onCreate).toHaveBeenCalledWith({
        name: 'Keycloak',
        issuer: 'https://sso.acme.dev/realms/acme',
        clientId: 'console',
        clientSecret: 's3cret',
        scopes: ['openid', 'profile', 'email', 'groups'],
        groupClaim: 'groups',
        autoCreateUsers: true,
      }),
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })

  it('keeps the dialog open with the message when adding fails', async () => {
    const user = userEvent.setup()
    renderOidc({ onCreate: vi.fn().mockRejectedValue(new Error('Issuer did not answer')) })
    await user.click(screen.getByRole('button', { name: '+ Add provider' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add provider' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Keycloak')
    await user.type(
      within(dialog).getByRole('textbox', { name: 'Issuer URL' }),
      'https://sso.acme.dev',
    )
    await user.type(within(dialog).getByRole('textbox', { name: 'Client id' }), 'console')
    await user.type(within(dialog).getByLabelText(/^Client secret/), 's3cret')
    await user.click(within(dialog).getByRole('button', { name: 'Add provider' }))
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('Issuer did not answer')
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Keycloak')
  })

  it('edits a provider and keeps its secret when left blank', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    renderOidc({ onUpdate })
    await openRowAction(user, 'Okta (acme)', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Okta (acme)' })
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toHaveValue('Okta (acme)')
    expect(within(dialog).getByRole('textbox', { name: 'Issuer URL' })).toHaveValue(
      'https://acme.okta.com',
    )
    expect(within(dialog).getByRole('textbox', { name: 'Client id' })).toHaveValue('0oa1acme')
    const secret = within(dialog).getByLabelText(/^Client secret/)
    expect(secret).toHaveValue('')
    expect(secret).toHaveAccessibleDescription('Leave blank to keep the current secret')

    const name = within(dialog).getByRole('textbox', { name: 'Name' })
    await user.clear(name)
    await user.type(name, 'Okta')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(onUpdate).toHaveBeenCalledTimes(1))
    const [id, update] = onUpdate.mock.calls[0]!
    expect(id).toBe('okta')
    // A blank secret is left out, not sent as '', so the host keeps the current one.
    expect(update).toEqual({
      name: 'Okta',
      issuer: 'https://acme.okta.com',
      clientId: '0oa1acme',
      scopes: ['openid', 'profile', 'email', 'groups'],
      groupClaim: 'groups',
      autoCreateUsers: true,
    })
    expect(update).not.toHaveProperty('clientSecret')
  })

  it('sends a new secret when one is typed on Edit', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderOidc()
    await openRowAction(user, 'Okta (acme)', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Okta (acme)' })
    await user.type(within(dialog).getByLabelText(/^Client secret/), '  n3w-secret  ')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() =>
      expect(onUpdate).toHaveBeenCalledWith(
        'okta',
        expect.objectContaining({ clientSecret: 'n3w-secret' }),
      ),
    )
  })

  it('disables and enables a provider', async () => {
    const user = userEvent.setup()
    const { onSetEnabled } = renderOidc()
    await openRowAction(user, 'Okta (acme)', 'Disable')
    expect(onSetEnabled).toHaveBeenCalledWith('okta', false)
    await openRowAction(user, 'GitLab', 'Enable')
    expect(onSetEnabled).toHaveBeenCalledWith('gitlab', true)
  })

  it('asks before removing a provider', async () => {
    const user = userEvent.setup()
    const { onRemove } = renderOidc()
    await openRowAction(user, 'Azure AD (contractors)', 'Remove')
    const dialog = await screen.findByRole('alertdialog', {
      name: 'Remove Azure AD (contractors)?',
    })
    expect(dialog).toHaveAccessibleDescription(
      'Users who signed in through it keep their accounts but can no longer use it.',
    )
    expect(onRemove).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(onRemove).toHaveBeenCalledWith('azure')
  })
})
