import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressList } from './progress-list'

const items = [
  { label: 'api', value: 100 },
  { label: 'web', value: 64 },
  { label: 'worker', value: 41, tone: 'critical' as const, note: 'Failed at 41%' },
  { label: 'cron', value: 20, tone: 'warning' as const },
]

describe('ProgressList', () => {
  it('renders a progressbar per item with its value and note', () => {
    render(<ProgressList items={items} />)
    const bars = screen.getAllByRole('progressbar')
    expect(bars).toHaveLength(4)
    expect(bars.map((b) => b.getAttribute('aria-valuenow'))).toEqual(['100', '64', '41', '20'])
    expect(screen.getByText('Failed at 41%')).toBeInTheDocument()
    expect(screen.getByText('64%')).toBeInTheDocument()
  })

  it('fills with the series hue by default and the status palette per tone', () => {
    const { container } = render(
      <ProgressList
        items={[
          { label: 'api', value: 30 },
          { label: 'certs', value: 100, tone: 'good' },
          { label: 'cron', value: 20, tone: 'warning' },
          { label: 'worker', value: 41, tone: 'critical' },
        ]}
      />,
    )
    const ranges = Array.from(container.querySelectorAll('[data-part="range"]'))
    expect(ranges).toHaveLength(4)
    expect(ranges.map((r) => Array.from(r.classList).find((c) => c.startsWith('bg_')))).toEqual([
      'bg_chart.1',
      'bg_green.9',
      'bg_amber.9',
      'bg_red.9',
    ])
  })

  it('clamps the value text to 0–100', () => {
    render(
      <ProgressList
        items={[
          { label: 'over', value: 120 },
          { label: 'under', value: -5 },
        ]}
      />,
    )
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.queryByText('120%')).not.toBeInTheDocument()
  })
})
