import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Badge } from '../components/ui'
import { DataTableCard } from './data-table-card'
import type { Column } from './types'

interface Deployment {
  id: string
  service: string
  version: string
  status: 'live' | 'canary' | 'rolled-back' | 'queued'
  when: string
}

const rows: Deployment[] = [
  { id: 'd1', service: 'checkout-api', version: 'v2.14.0', status: 'live', when: '4 min ago' },
  { id: 'd2', service: 'web-frontend', version: 'v9.3.1', status: 'canary', when: '22 min ago' },
  {
    id: 'd3',
    service: 'search-indexer',
    version: 'v1.8.2',
    status: 'rolled-back',
    when: '1 h ago',
  },
  { id: 'd4', service: 'auth-service', version: 'v4.0.0', status: 'queued', when: '3 h ago' },
  { id: 'd5', service: 'billing-worker', version: 'v0.9.4', status: 'live', when: 'Yesterday' },
]

const statusLabel = (s: Deployment['status']) =>
  s === 'rolled-back'
    ? 'Rolled back'
    : s === 'canary'
      ? 'Canary 10%'
      : s === 'queued'
        ? 'Queued'
        : 'Live'

const columns: Column<Deployment>[] = [
  { id: 'service', header: 'Service' },
  { id: 'version', header: 'Version' },
  { id: 'status', header: 'Status', cell: (row) => <Badge>{statusLabel(row.status)}</Badge> },
  { id: 'when', header: 'When', align: 'end' },
]

const tabs = [
  { id: 'all', label: 'All' },
  { id: 'production', label: 'Production' },
  { id: 'staging', label: 'Staging' },
  { id: 'failed', label: 'Failed' },
]

const page = { index: 1, size: 5, total: 128 }

describe('DataTableCard', () => {
  it('renders the column headers and one row per item', () => {
    render(
      <DataTableCard
        title="Recent deployments"
        caption="Last 24 hours"
        columns={columns}
        rows={rows}
        page={page}
      />,
    )
    expect(screen.getByText('Recent deployments')).toBeInTheDocument()
    expect(screen.getByText('Last 24 hours')).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map((h) => h.textContent),
    ).toEqual(['Service', 'Version', 'Status', 'When'])
    const [, ...bodyRows] = within(table).getAllByRole('row')
    expect(bodyRows).toHaveLength(5)
    expect(within(bodyRows[0]!).getByRole('cell', { name: 'checkout-api' })).toBeInTheDocument()
    expect(within(bodyRows[4]!).getByRole('cell', { name: 'Yesterday' })).toBeInTheDocument()
  })

  it('renders a column through its custom cell renderer', () => {
    render(<DataTableCard title="Recent deployments" columns={columns} rows={rows} page={page} />)
    const row = screen.getByRole('row', { name: /search-indexer/ })
    expect(within(row).getByText('Rolled back')).toBeInTheDocument()
    expect(screen.queryByText('rolled-back')).not.toBeInTheDocument()
  })

  it('calls onTabChange with the clicked tab id', async () => {
    const user = userEvent.setup()
    const onTabChange = vi.fn()
    render(
      <DataTableCard
        title="Recent deployments"
        tabs={tabs}
        activeTab="all"
        onTabChange={onTabChange}
        columns={columns}
        rows={rows}
        page={page}
      />,
    )
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    await user.click(screen.getByRole('tab', { name: 'Production' }))
    expect(onTabChange).toHaveBeenCalledWith('production')
  })

  it('shows the row count and pages forward with the pager', async () => {
    const user = userEvent.setup()
    const onPageChange = vi.fn()
    render(
      <DataTableCard
        title="Recent deployments"
        columns={columns}
        rows={rows}
        page={page}
        onPageChange={onPageChange}
      />,
    )
    expect(screen.getByText('Showing 5 of 128')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Next page' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })

  it('shows a single full-width cell without rows', () => {
    render(
      <DataTableCard
        title="Recent deployments"
        columns={columns}
        rows={[]}
        page={{ index: 1, size: 5, total: 0 }}
      />,
    )
    const cell = screen.getByRole('cell', { name: 'No rows' })
    expect(cell).toHaveAttribute('colspan', '4')
  })
})
