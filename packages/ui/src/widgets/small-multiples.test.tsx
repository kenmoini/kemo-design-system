import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SmallMultiples } from './small-multiples'

const items = ['eu', 'us', 'ap', 'sa'].map((label) => ({ label, data: [1, 3, 2, 5] }))

describe('SmallMultiples', () => {
  it('renders a labelled sparkline per item', () => {
    render(<SmallMultiples items={items} />)
    expect(screen.getAllByRole('img')).toHaveLength(4)
    for (const l of ['eu', 'us', 'ap', 'sa']) {
      expect(screen.getByRole('img', { name: l })).toBeInTheDocument()
      expect(screen.getByText(l)).toBeInTheDocument()
    }
  })

  it('scales every sparkline to one shared y-domain', () => {
    render(
      <SmallMultiples
        items={[
          { label: 'low', data: [10, 20, 10, 20] },
          { label: 'high', data: [80, 90, 80, 90] },
        ]}
      />,
    )
    const meanY = (name: string) => {
      const points = screen.getByRole('img', { name }).querySelector('polyline')!
      const ys = points
        .getAttribute('points')!
        .trim()
        .split(/\s+/)
        .map((p) => Number(p.split(',')[1]))
      return ys.reduce((a, b) => a + b, 0) / ys.length
    }
    // y grows downwards, so the smaller values sit lower (a larger y).
    expect(meanY('low')).toBeGreaterThan(meanY('high') + 10)
  })
})
