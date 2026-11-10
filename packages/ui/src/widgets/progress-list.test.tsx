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
})
