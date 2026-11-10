import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sparkline } from './sparkline'

describe('Sparkline', () => {
  it('renders a polyline with one point per value', () => {
    const { container } = render(<Sparkline data={[1, 3, 2, 5]} />)
    const points = container.querySelector('polyline')?.getAttribute('points')
    expect(points?.trim().split(/\s+/)).toHaveLength(4)
    expect(points).not.toContain('NaN')
  })

  it('is an image with a label when label is given, else hidden', () => {
    const { container, rerender } = render(<Sparkline data={[1, 2]} label="Sales trend" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('role', 'img')
    expect(svg).toHaveAttribute('aria-label', 'Sales trend')
    rerender(<Sparkline data={[1, 2]} />)
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('svg')).not.toHaveAttribute('role')
  })

  it('handles empty and flat data without NaN', () => {
    const empty = render(<Sparkline data={[]} />)
    expect(empty.container.innerHTML).not.toContain('NaN')
    const flat = render(<Sparkline data={[4, 4, 4]} />)
    expect(flat.container.querySelector('polyline')?.getAttribute('points')).not.toContain('NaN')
  })
})
