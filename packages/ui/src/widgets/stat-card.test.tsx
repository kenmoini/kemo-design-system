import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('renders label, value, delta text and a labelled sparkline', () => {
    render(
      <StatCard
        label="Revenue"
        value="$12,400"
        delta={{ value: '8.2%', direction: 'up', tone: 'good', suffix: 'vs yesterday' }}
        sparkline={[1, 2, 3]}
      />,
    )
    expect(screen.getByText('Revenue')).toBeInTheDocument()
    expect(screen.getByText('$12,400')).toBeInTheDocument()
    expect(screen.getByTestId('stat-delta')).toHaveTextContent('▲ increase 8.2% vs yesterday')
    expect(screen.getByRole('img', { name: 'Revenue trend' })).toBeInTheDocument()
  })

  it('hides the direction glyph from assistive tech and names the direction in words', () => {
    const { rerender } = render(
      <StatCard
        label="Revenue"
        value="$12,400"
        delta={{ value: '8.2%', direction: 'up', tone: 'good' }}
      />,
    )
    expect(screen.getByText('▲')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('increase')).toHaveClass('sr_true')
    rerender(
      <StatCard label="Errors" value="3" delta={{ value: '1%', direction: 'down', tone: 'bad' }} />,
    )
    expect(screen.getByText('▼')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('decrease')).toHaveClass('sr_true')
  })

  it('uses the down glyph and omits delta and sparkline when absent', () => {
    const { rerender } = render(
      <StatCard label="Errors" value="3" delta={{ value: '1%', direction: 'down', tone: 'bad' }} />,
    )
    expect(screen.getByTestId('stat-delta')).toHaveTextContent('▼ decrease 1%')
    expect(screen.queryByRole('img')).not.toBeInTheDocument()
    rerender(<StatCard label="Errors" value="3" />)
    expect(screen.queryByTestId('stat-delta')).not.toBeInTheDocument()
  })
})
