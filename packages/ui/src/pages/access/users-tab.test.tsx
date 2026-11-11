import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MEDIA_LG } from '../../layouts/app-shell'
import { stubLayout } from '../../test/layout'
import { setMediaMatches } from '../../test/media'
import { AccessUsersTab, type AccessUsersTabProps } from './tabs/users-tab'
import type { AccessUser, Option } from './types'

const roles: Option[] = [
  { value: 'r-owner', label: 'Owner' },
  { value: 'r-admin', label: 'Admin' },
  { value: 'r-deployer', label: 'Deployer' },
  { value: 'r-viewer', label: 'Viewer' },
]

const groups: Option[] = [
  { value: 'g-platform', label: 'platform-eng' },
  { value: 'g-oncall', label: 'on-call' },
]

const users: AccessUser[] = [
  {
    id: 'u1',
    name: 'Priya Natarajan',
    email: 'priya@acme.dev',
    role: 'r-admin',
    source: 'oidc',
    provider: 'Okta',
    groups: ['g-platform'],
    status: 'active',
    lastSignInAt: '2026-11-11T09:56:00Z',
    createdAt: '2026-01-04T10:00:00Z',
  },
  {
    id: 'u2',
    name: 'Marcus Lee',
    email: 'marcus@acme.dev',
    role: 'r-deployer',
    source: 'internal',
    groups: [],
    status: 'active',
    lastSignInAt: '2026-11-11T09:38:00Z',
    createdAt: '2026-02-11T10:00:00Z',
  },
  {
    id: 'u3',
    name: 'Lena Fischer',
    email: 'lena@acme.dev',
    role: 'r-viewer',
    source: 'oidc',
    groups: ['g-oncall'],
    status: 'disabled',
    createdAt: '2026-03-02T10:00:00Z',
  },
  {
    id: 'u4',
    name: 'Ken Moini',
    email: 'ken@acme.dev',
    role: 'r-legacy',
    source: 'internal',
    groups: [],
    status: 'active',
    lastSignInAt: '2026-11-10T18:20:00Z',
    createdAt: '2025-12-01T10:00:00Z',
  },
]

function renderTab(props: Partial<AccessUsersTabProps> = {}) {
  const handlers = {
    onCreate: vi.fn(),
    onUpdate: vi.fn(),
    onSetStatus: vi.fn(),
    onDelete: vi.fn(),
    onAddToGroup: vi.fn(),
    onAssignRole: vi.fn(),
  }
  render(<AccessUsersTab rows={users} roles={roles} groups={groups} {...handlers} {...props} />)
  return { ...handlers, ...props }
}

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)

const rowFor = (name: string) => screen.getByRole('row', { name: new RegExp(name) })

async function openRowAction(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  await user.click(screen.getByRole('button', { name: `Actions for ${name}` }))
  const menu = await screen.findByRole('menu')
  await user.click(within(menu).getByRole('menuitem', { name: item }))
}

async function openBulkAction(user: ReturnType<typeof userEvent.setup>, item: string) {
  await user.click(screen.getByRole('button', { name: 'Bulk actions' }))
  const menu = await screen.findByRole('menu')
  await user.click(within(menu).getByRole('menuitem', { name: item }))
}

async function choose(
  user: ReturnType<typeof userEvent.setup>,
  scope: HTMLElement,
  label: string,
  option: string,
) {
  await user.click(within(scope).getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

describe('AccessUsersTab', () => {
  beforeEach(() => {
    setMediaMatches(MEDIA_LG, true)
    stubLayout()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders the columns and badges', () => {
    renderTab()
    for (const header of ['Name', 'Role', 'Source', 'Status', 'Last sign-in']) {
      expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument()
    }
    const priya = rowFor('Priya Natarajan')
    expect(within(priya).getByText('priya@acme.dev')).toBeInTheDocument()
    expect(within(priya).getByText('Admin')).toBeInTheDocument()
    expect(within(priya).getByText('OIDC')).toBeInTheDocument()
    expect(within(priya).getByText('Active')).toBeInTheDocument()
    expect(within(priya).getByText('Nov 11, 2026, 09:56 UTC')).toBeInTheDocument()

    const lena = rowFor('Lena Fischer')
    expect(within(lena).getByText('Disabled')).toBeInTheDocument()
    expect(within(lena).getByText('Never')).toBeInTheDocument()
    expect(within(rowFor('Marcus Lee')).getByText('Internal')).toBeInTheDocument()
    // A role without an option shows its id.
    expect(within(rowFor('Ken Moini')).getByText('r-legacy')).toBeInTheDocument()
  })

  it('sorts users who never signed in last in both directions', async () => {
    const user = userEvent.setup()
    renderTab()
    const header = screen.getByRole('columnheader', { name: /Last sign-in/ })
    const names = () =>
      screen
        .getAllByRole('row')
        .slice(1)
        .map((row) => within(row).getAllByRole('cell')[1]?.textContent ?? '')
    await user.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    const ascending = names()
    expect(ascending[0]).not.toContain('Lena')
    expect(ascending.at(-1)).toContain('Lena')
    await user.click(within(header).getByRole('button'))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(names().at(-1)).toContain('Lena')
  })

  it('filters by status, source and role', async () => {
    const user = userEvent.setup()
    renderTab()
    const rail = screen.getByRole('complementary', { name: 'Filters' })
    expect(within(rail).getByRole('group', { name: 'Status' })).toBeInTheDocument()
    expect(within(rail).getByRole('group', { name: 'Source' })).toBeInTheDocument()
    expect(within(rail).getByRole('checkbox', { name: 'OIDC 2' })).toBeInTheDocument()
    expect(within(rail).getByRole('combobox', { name: 'Role' })).toHaveTextContent('All roles')
    expect(within(rail).getByRole('searchbox', { name: 'Search users' })).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(4)

    await user.click(within(rail).getByRole('checkbox', { name: 'Disabled 1' }))
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('Lena Fischer')

    await user.click(within(rail).getByRole('checkbox', { name: 'Disabled 1' }))
    await choose(user, rail, 'Role', 'Deployer')
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('Marcus Lee')
  })

  it('opens the Add user dialog', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByRole('button', { name: '+ Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    expect(within(dialog).getByRole('textbox', { name: 'Full name' })).toHaveValue('')
    expect(within(dialog).getByRole('textbox', { name: 'Full name' })).toBeRequired()
    expect(within(dialog).getByRole('textbox', { name: 'Email' })).toBeRequired()
    expect(within(dialog).getByRole('combobox', { name: 'Role' })).toHaveAttribute(
      'aria-required',
      'true',
    )
    expect(within(dialog).getByRole('combobox', { name: 'Source' })).not.toHaveAttribute(
      'aria-required',
      'true',
    )
    expect(within(dialog).getByRole('combobox', { name: 'Source' })).toHaveTextContent('Internal')
    expect(within(dialog).getByRole('switch', { name: 'Send the invite email now' })).toBeChecked()
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Full name' })).toHaveFocus(),
    )
  })

  it('validates before calling onCreate', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderTab()
    await user.click(screen.getByRole('button', { name: '+ Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))

    expect(await within(dialog).findByText('Enter a name.')).toBeInTheDocument()
    expect(within(dialog).getByText('Enter a valid email.')).toBeInTheDocument()
    expect(within(dialog).getByText('Choose a role.')).toBeInTheDocument()
    expect(onCreate).not.toHaveBeenCalled()
  })

  it('creates a user with the parsed values and closes', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderTab()
    await user.click(screen.getByRole('button', { name: '+ Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Full name' }), 'Ada Lovelace')
    await user.type(within(dialog).getByRole('textbox', { name: 'Email' }), 'ada@acme.dev')
    await choose(user, dialog, 'Role', 'Viewer')
    await choose(user, dialog, 'Groups', 'on-call')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument()
    await user.click(within(dialog).getByRole('switch', { name: 'Send the invite email now' }))
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))

    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(onCreate).toHaveBeenCalledWith({
      name: 'Ada Lovelace',
      email: 'ada@acme.dev',
      role: 'r-viewer',
      source: 'internal',
      groups: ['g-oncall'],
      sendInvite: false,
    })
  })

  it('shows the chosen groups as separate chips', async () => {
    const user = userEvent.setup()
    renderTab()
    await user.click(screen.getByRole('button', { name: '+ Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    const groupsTrigger = within(dialog).getByRole('combobox', { name: 'Groups' })
    expect(groupsTrigger).toHaveTextContent('Add a group…')

    await user.click(groupsTrigger)
    await user.click(await screen.findByRole('option', { name: 'platform-eng' }))
    await user.click(screen.getByRole('option', { name: 'on-call' }))
    await user.keyboard('{Escape}')

    // Each label is its own element, not one comma-joined string.
    expect(within(groupsTrigger).getByText('platform-eng')).toBeInTheDocument()
    expect(within(groupsTrigger).getByText('on-call')).toBeInTheDocument()
    expect(groupsTrigger).not.toHaveTextContent(',')
    expect(groupsTrigger).not.toHaveTextContent('Add a group…')
  })

  it('pre-fills Edit and saves through onUpdate', async () => {
    const user = userEvent.setup()
    const { onUpdate } = renderTab()
    await openRowAction(user, 'Priya Natarajan', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Priya Natarajan' })
    const name = within(dialog).getByRole('textbox', { name: 'Full name' })
    expect(name).toHaveValue('Priya Natarajan')
    expect(within(dialog).getByRole('textbox', { name: 'Email' })).toHaveValue('priya@acme.dev')
    expect(within(dialog).getByRole('combobox', { name: 'Role' })).toHaveTextContent('Admin')
    expect(within(dialog).getByRole('combobox', { name: 'Source' })).toHaveTextContent('OIDC')
    expect(within(dialog).getByRole('combobox', { name: 'Groups' })).toHaveTextContent(
      'platform-eng',
    )

    await user.clear(name)
    await user.type(name, 'Priya N.')
    await user.click(within(dialog).getByRole('button', { name: 'Save changes' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onUpdate).toHaveBeenCalledWith('u1', {
      name: 'Priya N.',
      email: 'priya@acme.dev',
      role: 'r-admin',
      source: 'oidc',
      groups: ['g-platform'],
      sendInvite: false,
    })
  })

  it('keeps input and shows the error when submit rejects', async () => {
    const user = userEvent.setup()
    const onCreate = vi.fn().mockRejectedValue(new Error('Email already in use'))
    renderTab({ onCreate })
    await user.click(screen.getByRole('button', { name: '+ Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Full name' }), 'Ada Lovelace')
    await user.type(within(dialog).getByRole('textbox', { name: 'Email' }), 'priya@acme.dev')
    await choose(user, dialog, 'Role', 'Viewer')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))

    const alert = await within(dialog).findByRole('alert')
    expect(alert).toHaveTextContent('Email already in use')
    expect(onCreate).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('dialog', { name: 'Add user' })).toBeInTheDocument()
    expect(within(dialog).getByRole('textbox', { name: 'Full name' })).toHaveValue('Ada Lovelace')
    expect(within(dialog).getByRole('textbox', { name: 'Email' })).toHaveValue('priya@acme.dev')
    // The message sits above the footer.
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' })
    expect(alert.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('clones into a pre-filled Add dialog', async () => {
    const user = userEvent.setup()
    const { onCreate } = renderTab()
    await openRowAction(user, 'Marcus Lee', 'Clone')
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    expect(within(dialog).getByRole('textbox', { name: 'Full name' })).toHaveValue(
      'Marcus Lee (copy)',
    )
    // A clone is a new user, so the invite goes out as it would from Add (Edit starts it off).
    expect(within(dialog).getByRole('switch', { name: 'Send the invite email now' })).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Marcus Lee (copy)', role: 'r-deployer', sendInvite: true }),
    )
  })

  it('hands Clone to onClone when the host gives it', async () => {
    const user = userEvent.setup()
    const onClone = vi.fn()
    renderTab({ onClone })
    await openRowAction(user, 'Marcus Lee', 'Clone')
    expect(onClone).toHaveBeenCalledWith('u2')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('disables and enables from the row menu', async () => {
    const user = userEvent.setup()
    const { onSetStatus } = renderTab()
    await openRowAction(user, 'Priya Natarajan', 'Disable')
    expect(onSetStatus).toHaveBeenLastCalledWith(['u1'], 'disabled')
    await openRowAction(user, 'Lena Fischer', 'Enable')
    expect(onSetStatus).toHaveBeenLastCalledWith(['u3'], 'active')
  })

  it('confirms before deleting a user', async () => {
    const user = userEvent.setup()
    const { onDelete } = renderTab()
    await openRowAction(user, 'Priya Natarajan', 'Delete')
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Priya Natarajan?' })
    expect(dialog).toHaveAccessibleDescription("This can't be undone.")
    expect(onDelete).not.toHaveBeenCalled()

    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(['u1'])
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
  })

  it('assigns a role to the selection', async () => {
    const user = userEvent.setup()
    const { onAssignRole } = renderTab()
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Marcus Lee' }))
    await openBulkAction(user, 'Assign role…')

    const dialog = await screen.findByRole('dialog', { name: 'Assign a role to 2 users' })
    await user.click(within(dialog).getByRole('button', { name: 'Assign role' }))
    expect(await within(dialog).findByText('Choose a role.')).toBeInTheDocument()
    expect(onAssignRole).not.toHaveBeenCalled()

    await choose(user, dialog, 'Role', 'Viewer')
    await user.click(within(dialog).getByRole('button', { name: 'Assign role' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onAssignRole).toHaveBeenCalledWith(['u1', 'u2'], 'r-viewer')
  })

  it('adds the selection to a group', async () => {
    const user = userEvent.setup()
    const { onAddToGroup } = renderTab()
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Lena Fischer' }))
    await openBulkAction(user, 'Add to group…')

    const dialog = await screen.findByRole('dialog', { name: 'Add 2 users to a group' })
    await choose(user, dialog, 'Group', 'on-call')
    await user.click(within(dialog).getByRole('button', { name: 'Add to group' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onAddToGroup).toHaveBeenCalledWith(['u1', 'u3'], 'g-oncall')
  })

  it('enables, disables and deletes the selection', async () => {
    const user = userEvent.setup()
    const { onSetStatus, onDelete } = renderTab()
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Lena Fischer' }))
    expect(screen.getByText('· 2 selected')).toBeInTheDocument()

    await openBulkAction(user, 'Enable')
    expect(onSetStatus).toHaveBeenLastCalledWith(['u1', 'u3'], 'active')
    await openBulkAction(user, 'Disable')
    expect(onSetStatus).toHaveBeenLastCalledWith(['u1', 'u3'], 'disabled')

    await openBulkAction(user, 'Delete')
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete 2 users?' })
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(['u1', 'u3'])
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    // The deleted ids leave the selection.
    expect(screen.queryByText('· 2 selected')).toBeNull()
  })

  it('returns focus to the row menu when Edit closes', async () => {
    const user = userEvent.setup()
    renderTab()
    await openRowAction(user, 'Priya Natarajan', 'Edit')
    const dialog = await screen.findByRole('dialog', { name: 'Edit Priya Natarajan' })
    await waitFor(() =>
      expect(within(dialog).getByRole('textbox', { name: 'Full name' })).toHaveFocus(),
    )
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Actions for Priya Natarajan' })).toHaveFocus(),
    )
  })

  it('keeps focus in the tab after deleting the row that opened the dialog', async () => {
    const user = userEvent.setup()
    function Host() {
      const [rows, setRows] = useState(users)
      return (
        <AccessUsersTab
          rows={rows}
          roles={roles}
          groups={groups}
          onCreate={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={(ids) => setRows((current) => current.filter((u) => !ids.includes(u.id)))}
          onAddToGroup={vi.fn()}
          onAssignRole={vi.fn()}
        />
      )
    }
    render(<Host />)
    await openRowAction(user, 'Priya Natarajan', 'Delete')
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Priya Natarajan?' })
    await waitFor(() =>
      expect(within(dialog).getByRole('button', { name: 'Cancel' })).toHaveFocus(),
    )
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(screen.queryByRole('row', { name: /Priya Natarajan/ })).toBeNull()
    await waitFor(() => expect(screen.getByRole('region', { name: 'users table' })).toHaveFocus())
    expect(screen.getByRole('region', { name: 'users table' })).toContainElement(
      screen.getByRole('table'),
    )
  })

  it('does not let a late submit close the next dialog', async () => {
    const user = userEvent.setup()
    let finish = () => {}
    const onCreate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    renderTab({ onCreate })
    await user.click(screen.getByRole('button', { name: '+ Add user' }))
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    await user.type(within(dialog).getByRole('textbox', { name: 'Full name' }), 'Ada Lovelace')
    await user.type(within(dialog).getByRole('textbox', { name: 'Email' }), 'ada@acme.dev')
    await choose(user, dialog, 'Role', 'Viewer')
    await user.click(within(dialog).getByRole('button', { name: 'Add user' }))
    await waitFor(() => expect(onCreate).toHaveBeenCalledTimes(1))

    // Dismissed while saving, then another dialog opened before the save finished.
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await openRowAction(user, 'Marcus Lee', 'Edit')
    await screen.findByRole('dialog', { name: 'Edit Marcus Lee' })
    await act(async () => {
      finish()
      // Let the save's continuation, and any close it asks for, run.
      await new Promise((resolve) => setTimeout(resolve, 50))
    })
    expect(screen.getByRole('dialog', { name: 'Edit Marcus Lee' })).toHaveAttribute(
      'data-state',
      'open',
    )
  })
})
