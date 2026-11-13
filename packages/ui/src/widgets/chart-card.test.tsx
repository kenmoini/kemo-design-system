import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { ChartCard } from './chart-card'

const table = {
  columns: ['Day', 'Visits'],
  rows: [
    ['Mon', 120],
    ['Tue', 180],
  ],
}

describe('ChartCard', () => {
  it('toggles between chart and table', async () => {
    const user = userEvent.setup()
    render(
      <ChartCard title="Traffic" caption="Last 7 days" table={table}>
        <div>the chart</div>
      </ChartCard>,
    )
    expect(screen.getByText('Traffic')).toBeInTheDocument()
    expect(screen.getByText('Last 7 days')).toBeInTheDocument()
    expect(screen.getByText('the chart')).toBeInTheDocument()
    const toggle = screen.getByRole('button', { name: 'View as table' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')

    await user.click(toggle)
    const pressed = screen.getByRole('button', { name: 'View as chart' })
    expect(pressed).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByText('the chart')).not.toBeInTheDocument()
    const grid = screen.getByRole('table')
    expect(within(grid).getByRole('columnheader', { name: 'Visits' })).toBeInTheDocument()
    expect(within(grid).getByRole('cell', { name: '180' })).toBeInTheDocument()

    await user.click(pressed)
    expect(screen.getByText('the chart')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'View as table' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('shows an empty-state message for a table with no rows', async () => {
    const user = userEvent.setup()
    render(
      <ChartCard title="Traffic" table={{ columns: ['Day', 'Visits'], rows: [] }}>
        <div>the chart</div>
      </ChartCard>,
    )
    await user.click(screen.getByRole('button', { name: 'View as table' }))
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
