import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Sparkline } from './sparkline'

/** The y coordinates of the polyline's points. */
function ys(container: HTMLElement) {
  const points = container.querySelector('polyline')?.getAttribute('points') ?? ''
  return points
    .trim()
    .split(/\s+/)
    .map((p) => Number(p.split(',')[1]))
}

const spread = (values: number[]) => Math.max(...values) - Math.min(...values)

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

  it('does not stretch small relative changes to the full height', () => {
    const { container } = render(<Sparkline data={[149, 150, 151, 150]} height={28} />)
    expect(spread(ys(container))).toBeLessThan(28 * 0.5)
  })

  it('still uses the full height for a real change', () => {
    const { container } = render(<Sparkline data={[100, 150, 200, 150]} height={28} />)
    expect(spread(ys(container))).toBeGreaterThan(28 * 0.8)
  })

  it('scales to a given domain', () => {
    const { container } = render(<Sparkline data={[0, 50, 100]} height={28} domain={[0, 200]} />)
    const [low, mid, high] = ys(container) as [number, number, number]
    // y grows downwards: 0 sits on the bottom edge, 100 at the middle of the 200 span.
    expect(low).toBeGreaterThan(mid)
    expect(mid).toBeGreaterThan(high)
    expect(high).toBeCloseTo(14, 0)
  })
})
