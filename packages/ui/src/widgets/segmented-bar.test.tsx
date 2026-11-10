import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SegmentedBar } from './segmented-bar'

const segments = [
  { label: 'Objects', value: 2 },
  { label: 'Databases', value: 1 },
  { label: 'Logs', value: 0.5 },
]

describe('SegmentedBar', () => {
  it('renders one segment per part, sized in proportion to the total, with a legend', () => {
    const { container } = render(<SegmentedBar segments={segments} total={4} label="Storage" />)
    const bar = screen.getByRole('img', { name: 'Storage' })
    const parts = bar.querySelectorAll<HTMLElement>('[data-part="segment"]')
    expect(Array.from(parts, (p) => p.style.flexBasis)).toEqual(['50%', '25%', '12.5%'])
    expect(bar.querySelector<HTMLElement>('[data-part="track"]')?.style.flexBasis).toBe('12.5%')
    for (const label of ['Objects', 'Databases', 'Logs']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('renders only the track when total is not positive', () => {
    render(<SegmentedBar segments={segments} total={0} label="Storage" />)
    const bar = screen.getByRole('img', { name: 'Storage' })
    expect(bar.querySelectorAll('[data-part="segment"]')).toHaveLength(0)
    expect(bar.querySelector('[data-part="track"]')).not.toBeNull()
  })
})
