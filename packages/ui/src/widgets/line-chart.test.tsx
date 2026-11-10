import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { foldSeries, plotSeries } from './chart-colors'
import { LineChart } from './line-chart'
import type { Series } from './types'

const hours = ['00:00', '06:00', '12:00', '18:00']
const make = (id: string, label: string, ys: number[]): Series => ({
  id,
  label,
  data: hours.map((x, i) => ({ x, y: ys[i] ?? 0 })),
})

const api = make('api', 'API', [120, 180, 150, 210])
const web = make('web', 'Web', [80, 90, 110, 95])
const jobs = make('jobs', 'Jobs', [20, 25, 22, 30])

function legend(container: HTMLElement) {
  return container.querySelector<HTMLElement>('.recharts-legend-wrapper')
}

describe('LineChart', () => {
  it('renders one path per series', () => {
    const { container } = render(<LineChart series={[api, web, jobs]} width={400} height={200} />)
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(3)
    // accessibilityLayer={false}: the table view is the keyboard channel, not a chart tab stop.
    expect(container.querySelector('[tabindex="0"]')).toBeNull()
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
  })

  it('renders no legend for one series', () => {
    const { container } = render(<LineChart series={[api]} width={400} height={200} />)
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(1)
    expect(legend(container)).toBeNull()
    expect(container.querySelectorAll('.recharts-legend-item')).toHaveLength(0)
  })

  it('renders a legend for two series', () => {
    const { container } = render(<LineChart series={[api, web]} width={400} height={200} />)
    const box = legend(container)
    expect(box).not.toBeNull()
    expect(container.querySelectorAll('.recharts-legend-item')).toHaveLength(2)
    expect(within(box!).getByText('API')).toBeInTheDocument()
    expect(within(box!).getByText('Web')).toBeInTheDocument()
  })

  it('folds extra series into Other', () => {
    const six = [
      api,
      web,
      jobs,
      make('cron', 'Cron', [5, 6, 7, 8]),
      make('hooks', 'Hooks', [3, 3, 3, 3]),
      make('misc', 'Misc', [1, 2, 1, 2]),
    ]
    const { container } = render(<LineChart series={six} width={400} height={200} />)
    expect(container.querySelectorAll('.recharts-line')).toHaveLength(5)
    const box = legend(container)!
    expect(within(box).getByText('Other')).toBeInTheDocument()
    // Series order, not Recharts' default alphabetical sort.
    expect(
      Array.from(box.querySelectorAll('.recharts-legend-item-text'), (t) => t.textContent),
    ).toEqual(['API', 'Web', 'Jobs', 'Cron', 'Other'])
    expect(within(box).queryByText('Hooks')).not.toBeInTheDocument()
    expect(within(box).queryByText('Misc')).not.toBeInTheDocument()
    // "Other" is drawn in neutral gray, never a sixth series hue.
    const curves = container.querySelectorAll('.recharts-line-curve')
    expect(curves[0]).toHaveAttribute('stroke', 'var(--colors-chart-1)')
    expect(curves[4]).toHaveAttribute('stroke', 'var(--colors-gray-8)')
  })

  it('shows No data when empty', () => {
    const { container } = render(<LineChart series={[]} width={400} height={200} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).toBeNull()
  })

  it('shows No data when every series is empty', () => {
    const { container } = render(
      <LineChart
        series={[
          { id: 'a', label: 'A', data: [] },
          { id: 'b', label: 'B', data: [] },
        ]}
        width={400}
        height={200}
      />,
    )
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).toBeNull()
  })
})

describe('foldSeries and plotSeries', () => {
  const pts = (xs: number[], y = 1) => xs.map((x) => ({ x, y }))

  it('orders x as the union of every series, so a series that starts later keeps the axis in order', () => {
    const late: Series = { id: 'late', label: 'Late', data: pts([3, 4, 5], 2) }
    const full: Series = { id: 'full', label: 'Full', data: pts([1, 2, 3, 4, 5]) }
    const { rows } = plotSeries([late, full])
    expect(rows.map((r) => r.x)).toEqual([1, 2, 3, 4, 5])
    expect(rows[0]).toEqual({ x: 1, s1: 1 })
    expect(rows[2]).toEqual({ x: 3, s0: 2, s1: 1 })
  })

  it('sums folded series over the union of their x, a missing x counting as 0', () => {
    const keep: Series = { id: 'keep', label: 'Keep', data: pts([1, 2, 3]) }
    const late: Series = { id: 'late', label: 'Late', data: pts([2, 3], 10) }
    const full: Series = { id: 'full', label: 'Full', data: pts([1, 2, 3], 100) }
    const folded = foldSeries([keep, late, full], 2)
    expect(folded.map((s) => s.id)).toEqual(['keep', 'other'])
    expect(folded[1]!.data).toEqual([
      { x: 1, y: 100 },
      { x: 2, y: 110 },
      { x: 3, y: 110 },
    ])
  })

  it('keeps at least one series when max is below 1', () => {
    const a: Series = { id: 'a', label: 'A', data: pts([1, 2]) }
    const b: Series = { id: 'b', label: 'B', data: pts([1, 2], 2) }
    for (const max of [0, -3]) {
      const folded = foldSeries([a, b], max)
      expect(folded).toHaveLength(1)
      expect(folded[0]).toEqual({
        id: 'other',
        label: 'Other',
        data: [
          { x: 1, y: 3 },
          { x: 2, y: 3 },
        ],
      })
    }
  })
})
