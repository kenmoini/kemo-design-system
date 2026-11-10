import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CalendarHeatmap } from './calendar-heatmap'

const values = Array.from({ length: 28 }, (_, i) => ({
  date: `2026-10-${String(i + 1).padStart(2, '0')}`,
  count: i % 6,
}))

describe('CalendarHeatmap', () => {
  it('renders weeks x 7 named cells and a legend', () => {
    render(<CalendarHeatmap values={values} weeks={4} />)
    expect(screen.getAllByRole('img', { name: /^2026-10-\d\d: \d$/ })).toHaveLength(28)
    expect(screen.getByRole('img', { name: '2026-10-03: 2' })).toBeInTheDocument()
    expect(screen.getByText('Less')).toBeInTheDocument()
    expect(screen.getByText('More')).toBeInTheDocument()
  })

  it('fills missing days with zero', () => {
    render(<CalendarHeatmap values={[]} weeks={2} />)
    expect(screen.getAllByRole('img', { name: 'No date: 0' })).toHaveLength(14)
  })
})
