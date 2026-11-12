import { render, screen, waitFor, within } from '@testing-library/react'
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

const search: DataTableProps<User>['search'] = { keys: [(u) => u.name, (u) => u.email] }
const entity = { singular: 'user', plural: 'users' }

function tableElement(props: Partial<DataTableProps<User>> = {}) {
  return (
    <DataTable
      entity={entity}
      columns={columns}
      rows={users}
      filters={filters}
      search={search}
      selectable
      bulkActions={bulkActions}
      rowActions={() => [{ id: 'edit', label: 'Edit', onSelect: () => {} }]}
      addAction={{ onSelect: () => {} }}
      {...props}
    />
  )
}

const renderTable = (props: Partial<DataTableProps<User>> = {}) => render(tableElement(props))

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
    expect(bulk).toHaveAttribute('aria-disabled', 'true')
    await user.click(bulk)
    expect(screen.queryByRole('menu')).toBeNull()

    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Marcus Lee' }))
    expect(bulk).not.toHaveAttribute('aria-disabled')
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
    expect(screen.getByRole('button', { name: 'Bulk actions' })).not.toHaveAttribute(
      'aria-disabled',
    )
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

  it('filters by a select facet', async () => {
    const user = userEvent.setup()
    renderTable()
    const role = screen.getByRole('combobox', { name: 'Role' })
    expect(role).toHaveTextContent('All roles')

    await user.click(role)
    await user.click(await screen.findByRole('option', { name: 'Deployer' }))
    const deployers = users.filter((u) => u.role === 'deployer')
    expect(role).toHaveTextContent('Deployer')
    expect(bodyRows()).toHaveLength(deployers.length)
    for (const row of bodyRows()) expect(row).toHaveTextContent('Deployer')
    expect(screen.getByText(`${deployers.length} users`)).toBeInTheDocument()
  })

  it('does not match a search across two keys', async () => {
    const user = userEvent.setup()
    renderTable()
    // "Priya Natarajan" + "priya.natarajan@…": the boundary must not read as "natarajan priya".
    await user.type(searchBox(), 'natarajan priya')
    expect(screen.getByRole('cell', { name: /No users match these filters/ })).toBeInTheDocument()
  })

  it('re-reads accessors when the columns change', () => {
    const roleColumns = (labels: Record<User['role'], string>): DataTableColumn<User>[] => [
      { id: 'name', header: 'Name', accessor: (u) => u.name },
      { id: 'role', header: 'Role', accessor: (u) => labels[u.role] },
    ]
    const props = { initialSort: { id: 'role' } }
    const { rerender } = renderTable({
      ...props,
      columns: roleColumns({ admin: 'Admin', deployer: 'Deployer', viewer: 'Viewer' }),
    })
    expect(bodyRows()[0]).toHaveTextContent('Admin')

    // New labels for the same `rows`: the sort follows them.
    rerender(
      tableElement({
        ...props,
        columns: roleColumns({ admin: 'Zulu', deployer: 'Alpha', viewer: 'Mike' }),
      }),
    )
    expect(bodyRows()[0]).toHaveTextContent('Alpha')
    expect(bodyRows().at(-1)).toHaveTextContent('Mike')
  })

  it('drops removed rows from its own selection', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    const { rerender } = renderTable({ onSelectionChange })
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select Marcus Lee' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith(['u1', 'u2'])

    rerender(tableElement({ onSelectionChange, rows: users.filter((u) => u.id !== 'u1') }))
    expect(screen.getByText('· 1 selected')).toBeInTheDocument()
    expect(onSelectionChange).toHaveBeenLastCalledWith(['u2'])

    // Rows merely hidden by the search stay selected.
    await user.type(searchBox(), 'sofia')
    expect(onSelectionChange).toHaveBeenLastCalledWith(['u2'])
    expect(screen.getByText('· 1 selected')).toBeInTheDocument()
  })

  it('keeps focus on Bulk actions after clearing the selection', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('checkbox', { name: 'Select Priya Natarajan' }))
    const bulk = screen.getByRole('button', { name: 'Bulk actions' })
    await user.click(bulk)
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Clear selection' }))
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    expect(screen.queryByText('· 1 selected')).toBeNull()
    expect(bulk).toHaveAttribute('aria-disabled', 'true')
    expect(document.activeElement).not.toBe(document.body)
    expect(bulk).toHaveFocus()
  })

  it('clamps the page when rows shrink under it', async () => {
    const user = userEvent.setup()
    const { rerender } = renderTable()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    const footer = screen.getByText('21–25 of 25')

    // Every text the footer shows on the way, so a transient "21–20 of 20" commit is caught.
    const shown: string[] = []
    const record = (records: MutationRecord[]) => {
      for (const r of records) {
        if (r.type === 'characterData' && r.oldValue) shown.push(r.oldValue)
        for (const node of r.removedNodes) shown.push(node.textContent ?? '')
      }
    }
    const observer = new MutationObserver(record)
    observer.observe(footer, {
      characterData: true,
      characterDataOldValue: true,
      childList: true,
      subtree: true,
    })
    rerender(tableElement({ rows: users.slice(0, 20) }))
    record(observer.takeRecords())
    observer.disconnect()

    expect(footer).toHaveTextContent('11–20 of 20')
    expect(shown).not.toContain('21–20 of 20')
    expect(bodyRows()).toHaveLength(10)
  })

  it('scrolls a table wider than its card inside the card, and only the table', () => {
    renderTable({
      columns: [
        ...columns,
        { id: 'notes', header: 'Notes', accessor: (u) => u.email, width: '2000px' },
      ],
    })
    const table = screen.getByRole('table')
    const scroller = table.parentElement
    // The card's body scrolls sideways, so the row actions at the end stay reachable; the table
    // fills the card when it is narrower.
    expect(scroller).toHaveClass('ov-x_auto')
    expect(table).toHaveClass('min-w_full')
    expect(within(table).getByRole('button', { name: 'Actions for Priya Natarajan' })).toBeVisible()
    // The toolbar, the pager and the filter rail stay outside the scrolling part.
    expect(scroller).not.toContainElement(screen.getByText('25 users'))
    expect(scroller).not.toContainElement(screen.getByText('1–10 of 25'))
    expect(scroller).not.toContainElement(screen.getByRole('complementary', { name: 'Filters' }))
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

  it('opens a select filter in the drawer above the drawer', async () => {
    setMediaMatches(MEDIA_LG, false)
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    await user.click(within(dialog).getByRole('combobox', { name: 'Role' }))
    // The select recipe stacks a list at `dropdown`, below the drawer (`modal`).
    expect(await screen.findByRole('listbox')).toHaveClass('z_popover')
  })

  it('shows the active filter count on the Filters button', async () => {
    setMediaMatches(MEDIA_LG, false)
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    await user.click(within(dialog).getByRole('checkbox', { name: /^Disabled/ }))
    await user.type(within(dialog).getByRole('searchbox', { name: 'Search users' }), 'a')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    const trigger = screen.getByRole('button', { name: 'Filters (2 active)' })
    expect(trigger).toHaveTextContent('Filters2')
  })
})

describe('DataTable tags filter', () => {
  interface Dep {
    id: string
    labels: string[]
  }
  const deps: Dep[] = [
    { id: 'a', labels: ['app=web', 'tier=front'] },
    { id: 'b', labels: ['app=web'] },
    { id: 'c', labels: ['app=api', 'tier=front'] },
  ]
  const depColumns: DataTableColumn<Dep>[] = [{ id: 'id', header: 'Id', accessor: (d) => d.id }]
  const depFilters: DataTableFilter<Dep>[] = [
    { id: 'labels', label: 'Labels', kind: 'tags', accessor: (d) => d.labels },
  ]

  it('filters by tags', async () => {
    setMediaMatches(MEDIA_LG, false)
    const user = userEvent.setup()
    render(
      <DataTable
        entity={{ singular: 'deployment', plural: 'deployments' }}
        columns={depColumns}
        rows={deps}
        filters={depFilters}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'Filters' }))
    const dialog = await screen.findByRole('dialog', { name: 'Filters' })
    const input = within(dialog).getByPlaceholderText('key=value…')
    await user.type(input, 'app=web{Enter}')
    // Zag empties the input after adding; user-event still tracks the typed text, so reset it.
    await user.clear(input)
    await user.type(input, 'tier=front{Enter}')
    await user.clear(input)
    await user.type(input, 'nope{Enter}')
    expect(within(dialog).getByText('Use key=value')).toBeInTheDocument()
    expect(within(dialog).queryByText('nope')).toBeNull()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('a')
    expect(screen.getByRole('button', { name: 'Filters (2 active)' })).toHaveTextContent('Filters2')
  })
})
