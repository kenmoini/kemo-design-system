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

  it('fills the grid past the values with hidden, empty cells', () => {
    const { container } = render(<CalendarHeatmap values={values.slice(0, 3)} weeks={4} />)
    expect(screen.getAllByRole('img')).toHaveLength(3)
    expect(container.querySelectorAll('[aria-hidden="true"]')).toHaveLength(25)
    expect(screen.queryByRole('img', { name: /No date/ })).not.toBeInTheDocument()
  })

  it('falls back to the five-step ramp for an unsupported step count', () => {
    const { container } = render(
      <CalendarHeatmap values={values} weeks={4} steps={3 as unknown as 5} />,
    )
    expect(screen.getAllByRole('img')).toHaveLength(28)
    expect(screen.getByText('Less').parentElement!.children).toHaveLength(7)
    expect(container.innerHTML).not.toContain('NaN')
  })
})
