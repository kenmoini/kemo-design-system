import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BarChart } from './bar-chart'
import type { Series } from './types'

const days = ['Wed', 'Thu', 'Fri', 'Sat']
const make = (id: string, label: string, ys: number[]): Series => ({
  id,
  label,
  data: days.map((x, i) => ({ x, y: ys[i] ?? 0 })),
})

const succeeded = make('ok', 'Succeeded', [18, 24, 14, 30])
const rolledBack = make('rb', 'Rolled back', [6, 9, 3, 7])

function bars(container: HTMLElement) {
  return Array.from(container.querySelectorAll('.recharts-bar'))
}

describe('BarChart', () => {
  it('renders one rectangle per category and series', () => {
    const { container } = render(
      <BarChart categories={days} series={[succeeded, rolledBack]} width={400} height={200} />,
    )
    expect(bars(container)).toHaveLength(2)
    expect(container.querySelectorAll('.recharts-bar-rectangle')).toHaveLength(days.length * 2)
    expect(container.querySelector('[tabindex="0"]')).toBeNull()
    expect(screen.queryByRole('application')).not.toBeInTheDocument()
  })

  it('renders the stacked variant, rounding only the top series, with a surface gap', () => {
    const { container } = render(
      <BarChart
        categories={days}
        series={[succeeded, rolledBack]}
        stacked
        width={400}
        height={200}
      />,
    )
    expect(bars(container)).toHaveLength(2)
    const [bottom, top] = bars(container) as [Element, Element]
    const bottomPaths = bottom.querySelectorAll('.recharts-rectangle')
    const topPaths = top.querySelectorAll('.recharts-rectangle')
    expect(bottomPaths).toHaveLength(days.length)
    expect(topPaths).toHaveLength(days.length)
    // A rounded data-end draws arc commands; square ends do not.
    bottomPaths.forEach((p) => expect(p.getAttribute('d')).not.toMatch(/A/))
    topPaths.forEach((p) => expect(p.getAttribute('d')).toMatch(/A/))
    for (const p of [...bottomPaths, ...topPaths]) {
      expect(p).toHaveAttribute('stroke', 'var(--colors-gray-surface-bg)')
      expect(p).toHaveAttribute('stroke-width', '2')
    }
  })

  it('renders a legend only for two or more series', () => {
    const { container, unmount } = render(
      <BarChart categories={days} series={[succeeded]} width={400} height={200} />,
    )
    expect(container.querySelector('.recharts-legend-wrapper')).toBeNull()
    unmount()

    const two = render(
      <BarChart categories={days} series={[succeeded, rolledBack]} width={400} height={200} />,
    )
    const box = two.container.querySelector<HTMLElement>('.recharts-legend-wrapper')!
    expect(two.container.querySelectorAll('.recharts-legend-item')).toHaveLength(2)
    expect(within(box).getByText('Succeeded')).toBeInTheDocument()
    expect(within(box).getByText('Rolled back')).toBeInTheDocument()
  })

  it('shows No data when empty', () => {
    const { container } = render(
      <BarChart categories={days} series={[]} width={400} height={200} />,
    )
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).toBeNull()
  })

  it('shows No data when every series is empty', () => {
    const { container } = render(
      <BarChart
        categories={days}
        series={[{ id: 'ok', label: 'Succeeded', data: [] }]}
        width={400}
        height={200}
      />,
    )
    expect(screen.getByText('No data')).toBeInTheDocument()
    expect(container.querySelector('.recharts-wrapper')).toBeNull()
  })
})
