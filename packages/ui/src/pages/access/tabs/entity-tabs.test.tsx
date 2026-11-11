import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MEDIA_LG } from '../../../layouts/app-shell'
import { stubLayout } from '../../../test/layout'
import { setMediaMatches } from '../../../test/media'
import type {
  AccessGroup,
  AccessPermission,
  AccessRole,
  OAuthApp,
  Option,
  ServiceAccount,
} from '../types'
import { AccessGroupsTab } from './groups-tab'
import { AccessOAuthAppsTab } from './oauth-apps-tab'
import { AccessPermissionsTab } from './permissions-tab'
import { AccessRolesTab } from './roles-tab'
import { AccessServiceAccountsTab } from './service-accounts-tab'

const roleOptions: Option[] = [
  { value: 'r-admin', label: 'Admin' },
  { value: 'r-viewer', label: 'Viewer' },
]

const permissions: AccessPermission[] = [
  {
    id: 'p1',
    name: 'deployments.read',
    resource: 'deployments',
    action: 'read',
    roles: 2,
    description: 'See deployments',
  },
  { id: 'p2', name: 'deployments.create', resource: 'deployments', action: 'create', roles: 1 },
  { id: 'p3', name: 'users.admin', resource: 'users', action: 'admin', roles: 1 },
]

const groups: AccessGroup[] = [
  {
    id: 'g1',
    name: 'platform-eng',
    description: 'Platform team',
    members: 12,
    roles: ['r-admin', 'r-viewer'],
    source: 'oidc',
    status: 'active',
  },
  {
    id: 'g2',
    name: 'contractors',
    members: 3,
    roles: ['r-viewer'],
    source: 'internal',
    status: 'disabled',
  },
]

const roles: AccessRole[] = [
  {
    id: 'r-admin',
    name: 'Admin',
    description: 'Everything',
    permissions: ['p1', 'p2', 'p3'],
    members: 4,
    builtIn: true,
    status: 'active',
  },
  {
    id: 'r-custom',
    name: 'Release manager',
    description: 'Ships releases',
    permissions: ['p1'],
    members: 2,
    builtIn: false,
    status: 'active',
  },
]

const accounts: ServiceAccount[] = [
  {
    id: 's1',
    name: 'ci-deployer',
    description: 'CI pipeline',
    role: 'r-admin',
    tokenExpiresAt: '2027-01-15T00:00:00Z',
    lastUsedAt: '2026-11-10T08:00:00Z',
    status: 'active',
  },
  {
    id: 's2',
    name: 'backup-bot',
    role: 'r-viewer',
    tokenExpiresAt: '2026-12-01T00:00:00Z',
    status: 'disabled',
  },
]

const apps: OAuthApp[] = [
  {
    id: 'a1',
    name: 'Console',
    clientId: 'cl_console_123',
    type: 'web',
    redirectUris: ['https://console.acme.dev/cb'],
    scopes: ['read', 'write'],
    owner: 'Priya',
    status: 'active',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'a2',
    name: 'Syncer',
    clientId: 'cl_sync_456',
    type: 'machine',
    redirectUris: [],
    scopes: ['read'],
    owner: 'Marcus',
    status: 'disabled',
    createdAt: '2026-03-01T10:00:00Z',
  },
]

const scopeOptions: Option[] = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write' },
]

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

async function openRowMenu(user: ReturnType<typeof userEvent.setup>, name: string) {
  await user.click(screen.getByRole('button', { name: `Actions for ${name}` }))
  return screen.findByRole('menu')
}

async function openRowAction(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  const menu = await openRowMenu(user, name)
  await user.click(within(menu).getByRole('menuitem', { name: item }))
}

async function openBulkAction(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(screen.getByRole('button', { name: 'Bulk actions' }))
  const menu = await screen.findByRole('menu')
  await user.click(within(menu).getByRole('menuitem', { name: item }))
}

const handlers = () => ({
  onCreate: vi.fn(),
  onUpdate: vi.fn(),
  onSetStatus: vi.fn(),
  onDelete: vi.fn(),
})

beforeEach(() => {
  setMediaMatches(MEDIA_LG, true)
  stubLayout()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AccessGroupsTab', () => {
  const props = () => ({ ...handlers(), rows: groups, roles: roleOptions, onAssignRole: vi.fn() })

  it('renders the columns and opens the Add dialog', async () => {
    const user = userEvent.setup()
    render(<AccessGroupsTab {...props()} />)
    for (const header of ['Name', 'Members', 'Roles', 'Source', 'Status']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    const row = rowFor('platform-eng')
    expect(within(row).getByText('Platform team')).toBeInTheDocument()
    expect(within(row).getByText('Admin, Viewer')).toBeInTheDocument()
    expect(within(row).getByText('OIDC')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add group' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add group' })
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeRequired()
    expect(within(dialog).getByRole('textbox', { name: 'Description' })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Roles' })).toBeInTheDocument()
  })

  it('assigns a role to the selection', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessGroupsTab {...p} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select platform-eng' }))
    await openBulkAction(user, 'Assign role…')
    const dialog = await screen.findByRole('dialog', { name: 'Assign a role to 1 group' })
    await user.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Viewer' }))
    await user.click(within(dialog).getByRole('button', { name: 'Assign role' }))
    await waitFor(() => expect(p.onAssignRole).toHaveBeenCalledWith(['g1'], 'r-viewer'))
  })
})

describe('AccessRolesTab', () => {
  const props = () => ({ ...handlers(), rows: roles, permissions })

  it('renders the columns and the Built-in badge, and opens the Add dialog', async () => {
    const user = userEvent.setup()
    render(<AccessRolesTab {...props()} />)
    for (const header of ['Name', 'Description', 'Permissions', 'Members', 'Status']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(rowFor('Admin')).getByText('Built-in')).toBeInTheDocument()
    expect(within(rowFor('Release manager')).queryByText('Built-in')).toBeNull()

    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add role' })
    const deployments = within(dialog).getByRole('group', { name: 'deployments' })
    expect(
      within(deployments).getByRole('checkbox', { name: 'deployments.read' }),
    ).toBeInTheDocument()
  })

  it('needs at least one permission', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessRolesTab {...p} />)
    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add role' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Auditor')
    await user.click(within(dialog).getByRole('button', { name: 'Add role' }))
    expect(await within(dialog).findByText('Choose at least one permission.')).toBeInTheDocument()
    expect(p.onCreate).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('checkbox', { name: 'users.admin' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add role' }))
    await waitFor(() =>
      expect(p.onCreate).toHaveBeenCalledWith({
        name: 'Auditor',
        description: '',
        permissions: ['p3'],
      }),
    )
  })

  it('announces and focuses the missing-permission error', async () => {
    const user = userEvent.setup()
    render(<AccessRolesTab {...props()} />)
    await user.click(screen.getByRole('button', { name: '+ Add role' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add role' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Auditor')
    await user.click(within(dialog).getByRole('button', { name: 'Add role' }))
    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Choose at least one permission.')
    const fieldset = within(dialog).getByRole('group', { name: /Permissions/ })
    await waitFor(() => expect(fieldset.contains(document.activeElement)).toBe(true))
    expect(fieldset.getAttribute('aria-describedby') ?? '').toContain(alert.id)
  })

  it('offers only Edit and Clone on a built-in role', async () => {
    const user = userEvent.setup()
    render(<AccessRolesTab {...props()} />)
    const menu = await openRowMenu(user, 'Admin')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Edit', 'Clone'])
  })

  it('offers the full menu on a custom role', async () => {
    const user = userEvent.setup()
    render(<AccessRolesTab {...props()} />)
    const menu = await openRowMenu(user, 'Release manager')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Edit', 'Clone', 'Disable', 'Delete'])
  })

  it('skips built-in roles in bulk delete', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessRolesTab {...p} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select Admin' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Release manager' }))
    await openBulkAction(user, 'Delete')
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete 2 roles?' })
    expect(dialog).toHaveAccessibleDescription(/2 roles selected; 1 built-in role will be skipped/)
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(p.onDelete).toHaveBeenCalledWith(['r-custom'])
  })

  it('confirms bulk disable with the built-in skip note', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessRolesTab {...p} />)
    await user.click(screen.getByRole('checkbox', { name: 'Select Admin' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Release manager' }))
    await openBulkAction(user, 'Disable')
    const dialog = await screen.findByRole('alertdialog', { name: 'Disable 2 roles?' })
    expect(dialog).toHaveAccessibleDescription(/2 roles selected; 1 built-in role will be skipped/)
    expect(p.onSetStatus).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: 'Disable' }))
    expect(p.onSetStatus).toHaveBeenCalledWith(['r-custom'], 'disabled')
  })
})

describe('AccessPermissionsTab', () => {
  const props = () => ({ ...handlers(), rows: permissions, resources: ['deployments', 'users'] })

  it('renders the columns and opens the Add dialog', async () => {
    const user = userEvent.setup()
    render(<AccessPermissionsTab {...props()} />)
    for (const header of ['Name', 'Resource', 'Action', 'Description', 'Roles']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(rowFor('users.admin')).getByText('admin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add permission' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add permission' })
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeRequired()
    expect(within(dialog).getByRole('combobox', { name: 'Resource' })).toBeInTheDocument()
    expect(within(dialog).getByRole('combobox', { name: 'Action' })).toHaveTextContent('read')
  })

  it('offers Edit and Delete only', async () => {
    const user = userEvent.setup()
    render(<AccessPermissionsTab {...props()} />)
    const menu = await openRowMenu(user, 'users.admin')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Edit', 'Delete'])
  })

  it('checks the name format', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessPermissionsTab {...p} />)
    await user.click(screen.getByRole('button', { name: '+ Add permission' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add permission' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Deployments')
    await user.click(within(dialog).getByRole('button', { name: 'Add permission' }))
    expect(
      await within(dialog).findByText('Use the form resource.action, e.g. deployments.create.'),
    ).toBeInTheDocument()
    expect(p.onCreate).not.toHaveBeenCalled()
  })
})

describe('AccessServiceAccountsTab', () => {
  const props = () => ({
    ...handlers(),
    rows: accounts,
    roles: roleOptions,
    onRotateToken: vi.fn(),
  })

  it('renders the columns and opens the Add dialog', async () => {
    const user = userEvent.setup()
    render(<AccessServiceAccountsTab {...props()} />)
    for (const header of ['Name', 'Role', 'Token expires', 'Last used', 'Status']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    expect(within(rowFor('backup-bot')).getByText('Never')).toBeInTheDocument()
    expect(within(rowFor('ci-deployer')).getByText('Admin')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add service account' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add service account' })
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeRequired()
    expect(within(dialog).getByRole('spinbutton', { name: /Token lifetime/ })).toHaveValue('90')
  })

  it('keeps the token lifetime between 1 and 365 days', async () => {
    // A pause between keys lets the number input restore its caret, or "500" can land as "005".
    const user = userEvent.setup({ delay: 20 })
    const p = props()
    render(<AccessServiceAccountsTab {...p} />)
    await user.click(screen.getByRole('button', { name: '+ Add service account' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add service account' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'deploy-bot')
    await user.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    await user.click(await screen.findByRole('option', { name: 'Viewer' }))
    const days = within(dialog).getByRole('spinbutton', { name: /Token lifetime/ })
    await user.clear(days)
    await user.type(days, '500')
    await user.click(within(dialog).getByRole('button', { name: 'Add service account' }))
    expect(
      await within(dialog).findByText('Use 1 to 365 days.', undefined, { timeout: 4000 }),
    ).toBeInTheDocument()
    expect(p.onCreate).not.toHaveBeenCalled()

    await user.clear(days)
    await user.type(days, '30')
    await user.click(within(dialog).getByRole('button', { name: 'Add service account' }))
    await waitFor(
      () =>
        expect(p.onCreate).toHaveBeenCalledWith({
          name: 'deploy-bot',
          description: '',
          role: 'r-viewer',
          tokenLifetimeDays: 30,
        }),
      { timeout: 4000 },
    )
  })

  it('rotates the token from the row menu', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessServiceAccountsTab {...p} />)
    await openRowAction(user, 'ci-deployer', 'Rotate token')
    expect(p.onRotateToken).toHaveBeenCalledWith('s1')
  })
})

describe('AccessOAuthAppsTab', () => {
  const props = () => ({ ...handlers(), rows: apps, scopes: scopeOptions, onRotateSecret: vi.fn() })

  it('renders the columns and opens the Add dialog', async () => {
    const user = userEvent.setup()
    render(<AccessOAuthAppsTab {...props()} />)
    for (const header of ['Name', 'Type', 'Owner', 'Scopes', 'Created', 'Status']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    const row = rowFor('Console')
    expect(within(row).getByText('cl_console_123')).toBeInTheDocument()
    expect(within(row).getByText('Web')).toBeInTheDocument()
    expect(within(rowFor('Syncer')).getByText('Machine')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add OAuth app' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add OAuth app' })
    expect(within(dialog).getByRole('textbox', { name: 'Name' })).toBeRequired()
    expect(within(dialog).getByRole('radio', { name: 'Web' })).toBeChecked()
    expect(within(dialog).getByRole('checkbox', { name: 'Read' })).toBeInTheDocument()
  })

  it('needs a redirect URI for a web app but not a machine app', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessOAuthAppsTab {...p} />)
    await user.click(screen.getByRole('button', { name: '+ Add OAuth app' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add OAuth app' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Name' }), 'Portal')
    await user.click(within(dialog).getByRole('button', { name: 'Add OAuth app' }))
    expect(await within(dialog).findByText('Add at least one redirect URI.')).toBeInTheDocument()
    expect(p.onCreate).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('radio', { name: 'Machine' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add OAuth app' }))
    await waitFor(() =>
      expect(p.onCreate).toHaveBeenCalledWith({
        name: 'Portal',
        type: 'machine',
        redirectUris: [],
        scopes: [],
        description: '',
      }),
    )
  })

  it('rotates the secret from the row menu', async () => {
    const user = userEvent.setup()
    const p = props()
    render(<AccessOAuthAppsTab {...p} />)
    await openRowAction(user, 'Console', 'Rotate secret')
    expect(p.onRotateSecret).toHaveBeenCalledWith('a1')
  })
})
