import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Badge } from '../../components/ui'
import { MEDIA_LG } from '../../layouts/app-shell'
import { setMediaMatches } from '../../test/media'
import { DataTable } from './data-table'
import type { ActionItem, DataTableColumn, DataTableFilter, DataTableProps } from './types'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'deployer' | 'viewer'
  source: 'internal' | 'oidc'
  status: 'active' | 'disabled'
}

// Data order is not alphabetical: "Aaron Blake" sorts first and "Zoe Turner" last.
const NAMES = [
  'Priya Natarajan',
  'Marcus Lee',
  'Sofia Reyes',
  'Ken Moini',
  'Lena Fischer',
  'Aaron Blake',
  'Beatriz Costa',
  'Chen Wei',
  'Dmitri Volkov',
  'Elena Petrova',
  'Farah Haddad',
  'Gustavo Silva',
  'Hana Sato',
  'Ivan Horvat',
  'Jamal Wright',
  'Kofi Mensah',
  'Liam Murphy',
  'Mei Tanaka',
  'Nadia Rahman',
  'Oscar Lindqvist',
  'Paula Gomez',
  'Quentin Moreau',
  'Rosa Delgado',
  'Tomas Novak',
  'Zoe Turner',
]
const ROLES = ['admin', 'deployer', 'viewer'] as const
const ROLE_LABEL: Record<User['role'], string> = {
  admin: 'Admin',
  deployer: 'Deployer',
  viewer: 'Viewer',
}

const users: User[] = NAMES.map((name, i) => ({
  id: `u${i + 1}`,
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@example.com`,
  role: ROLES[i % ROLES.length]!,
  source: i % 2 === 0 ? 'internal' : 'oidc',
  status: i % 5 === 4 ? 'disabled' : 'active',
}))

const columns: DataTableColumn<User>[] = [
  { id: 'name', header: 'Name', accessor: (u) => u.name },
  { id: 'role', header: 'Role', accessor: (u) => ROLE_LABEL[u.role] },
  {
    id: 'status',
    header: 'Status',
    accessor: (u) => u.status,
    cell: (u) => <Badge>{u.status === 'active' ? 'Active' : 'Disabled'}</Badge>,
  },
]

const filters: DataTableFilter<User>[] = [
  {
    id: 'status',
    label: 'Status',
    kind: 'checkbox',
    accessor: (u) => u.status,
    options: [
      { value: 'active', label: 'Active' },
      { value: 'disabled', label: 'Disabled' },
    ],
  },
  {
    id: 'source',
    label: 'Source',
    kind: 'checkbox',
    accessor: (u) => u.source,
    options: [
      { value: 'internal', label: 'Internal' },
      { value: 'oidc', label: 'OIDC' },
    ],
  },
  {
    id: 'role',
    label: 'Role',
    kind: 'select',
    accessor: (u) => u.role,
    options: ROLES.map((role) => ({ value: role, label: ROLE_LABEL[role] })),
    allLabel: 'All roles',
  },
]

const bulkActions = (): ActionItem[] => [
  { id: 'enable', label: 'Enable', onSelect: () => {} },
  { id: 'delete', label: 'Delete', tone: 'danger', onSelect: () => {} },
]

function renderTable(props: Partial<DataTableProps<User>> = {}) {
  return render(
    <DataTable
      entity={{ singular: 'user', plural: 'users' }}
      columns={columns}
      rows={users}
      filters={filters}
      search={{ keys: [(u) => u.name, (u) => u.email] }}
      selectable
      bulkActions={bulkActions}
      rowActions={() => [{ id: 'edit', label: 'Edit', onSelect: () => {} }]}
      addAction={{ onSelect: () => {} }}
      {...props}
    />,
  )
}

const bodyRows = () => within(screen.getByRole('table')).getAllByRole('row').slice(1)
const searchBox = () => screen.getByRole('searchbox', { name: 'Search users' })

describe('DataTable', () => {
  beforeEach(() => {
    setMediaMatches(MEDIA_LG, true)
  })

  it('sorts by a column both ways with aria-sort', async () => {
    const user = userEvent.setup()
    renderTable()
    const header = screen.getByRole('columnheader', { name: 'Name' })
    expect(header).not.toHaveAttribute('aria-sort')
    expect(bodyRows()[0]).toHaveTextContent('Priya Natarajan')

    await user.click(within(header).getByRole('button', { name: 'Name' }))
    expect(header).toHaveAttribute('aria-sort', 'ascending')
    expect(bodyRows()[0]).toHaveTextContent('Aaron Blake')

    await user.click(within(header).getByRole('button', { name: 'Name' }))
    expect(header).toHaveAttribute('aria-sort', 'descending')
    expect(bodyRows()[0]).toHaveTextContent('Zoe Turner')
  })

  it('searches rows', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(screen.getByText('25 users')).toBeInTheDocument()
    await user.type(searchBox(), 'priya')
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('Priya Natarajan')
    expect(screen.getByText('1 user')).toBeInTheDocument()
  })

  it('filters by status facet with counts', async () => {
    const user = userEvent.setup()
    renderTable()
    const disabledCount = users.filter((u) => u.status === 'disabled').length
    const rail = screen.getByRole('complementary', { name: 'Filters' })
    const disabled = within(rail).getByRole('checkbox', { name: `Disabled ${disabledCount}` })

    await user.click(disabled)
    expect(disabled).toBeChecked()
    expect(bodyRows()).toHaveLength(disabledCount)
    for (const row of bodyRows()) expect(row).toHaveTextContent('Disabled')
    expect(screen.getByText(`${disabledCount} users`)).toBeInTheDocument()
  })

  it('facet counts respect other filters', async () => {
    const user = userEvent.setup()
    renderTable()
    const active = users.filter((u) => u.status === 'active')
    const activeOidc = active.filter((u) => u.source === 'oidc').length
    expect(screen.getByRole('checkbox', { name: `Active ${active.length}` })).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: /^OIDC/ }))
    expect(screen.getByRole('checkbox', { name: `Active ${activeOidc}` })).toBeInTheDocument()
    expect(activeOidc).toBeLessThan(active.length)
  })

  it('selects rows and enables bulk actions', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    renderTable({ onSelectionChange })
    const bulk = screen.getByRole('button', { name: 'Bulk actions' })
    expect(bulk).toBeDisabled()

    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Marcus Lee' }))
    expect(bulk).toBeEnabled()
    expect(screen.getByText('· 2 selected')).toBeInTheDocument()
    expect(onSelectionChange).toHaveBeenLastCalledWith(['u1', 'u2'])

    await user.click(bulk)
    const menu = await screen.findByRole('menu')
    const group = within(menu).getByRole('group', { name: '2 users' })
    expect(
      within(group)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Enable', 'Delete'])
    expect(within(menu).getByRole('menuitem', { name: 'Clear selection' })).toBeInTheDocument()
  })

  it('header checkbox selects the page and shows indeterminate', async () => {
    const user = userEvent.setup()
    renderTable()
    const all = screen.getByRole('checkbox', { name: 'Select all on this page' })
    expect(all).not.toBeChecked()

    await user.click(all)
    expect(all).toBeChecked()
    for (const row of bodyRows()) expect(within(row).getByRole('checkbox')).toBeChecked()
    expect(screen.getByText('· 10 selected')).toBeInTheDocument()

    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    expect(all).toBePartiallyChecked()
    expect(screen.getByText('· 9 selected')).toBeInTheDocument()
  })

  it('keeps hidden rows in the selection count', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.type(searchBox(), 'marcus')
    expect(screen.queryByRole('checkbox', { name: 'Select Priya Natarajan' })).toBeNull()
    expect(screen.getByText('· 1 selected')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Bulk actions' })).toBeEnabled()
  })

  it('selection survives paging', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.queryByRole('checkbox', { name: 'Select Priya Natarajan' })).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Previous page' }))
    expect(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' })).toBeChecked()
    expect(screen.getByText('· 1 selected')).toBeInTheDocument()
  })

  it('row actions menu lists items and calls onSelect', async () => {
    const user = userEvent.setup()
    const onAction = vi.fn()
    renderTable({
      rowActions: (row) => [
        { id: 'edit', label: 'Edit', onSelect: () => onAction('edit', row) },
        { id: 'disable', label: 'Disable', onSelect: () => onAction('disable', row) },
        { id: 'delete', label: 'Delete', tone: 'danger', onSelect: () => onAction('delete', row) },
      ],
    })
    await user.click(screen.getByRole('button', { name: 'Actions for Priya Natarajan' }))
    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Edit', 'Disable', 'Delete'])
    await user.click(within(menu).getByRole('menuitem', { name: 'Disable' }))
    expect(onAction).toHaveBeenCalledTimes(1)
    expect(onAction).toHaveBeenCalledWith('disable', users[0])
  })

  it('paginates', async () => {
    const user = userEvent.setup()
    renderTable()
    expect(screen.getByText('1–10 of 25')).toBeInTheDocument()
    expect(bodyRows()).toHaveLength(10)
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(screen.getByText('11–20 of 25')).toBeInTheDocument()
    expect(bodyRows()[0]).toHaveTextContent(users[10]!.name)
  })

  it('shows the empty filtered state with Clear filters', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.type(searchBox(), 'zzz')
    const cell = screen.getByRole('cell', { name: /No users match these filters/ })
    expect(cell).toHaveAttribute('colspan', '5')

    await user.click(within(cell).getByRole('button', { name: 'Clear filters' }))
    expect(bodyRows()).toHaveLength(10)
    expect(searchBox()).toHaveValue('')
  })

  it('shows the empty data state', async () => {
    const user = userEvent.setup()
    const onAdd = vi.fn()
    renderTable({ rows: [], addAction: { onSelect: onAdd } })
    const cell = screen.getByRole('cell', { name: /No users yet/ })
    await user.click(within(cell).getByRole('button', { name: '+ Add user' }))
    expect(onAdd).toHaveBeenCalledTimes(1)
  })

  it('moves filters into a drawer below lg', async () => {
    setMediaMatches(MEDIA_LG, false)
    const user = userEvent.setup()
    renderTable()
    expect(screen.queryByRole('complementary')).toBeNull()

    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    expect(within(dialog).getByRole('group', { name: 'Status' })).toBeInTheDocument()
    expect(within(dialog).getByRole('searchbox', { name: 'Search users' })).toBeInTheDocument()
  })
})
