import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RankedBars } from './ranked-bars'

const items = [
  { label: '/api/orders', value: 200 },
  { label: '/api/users', value: 50 },
]

describe('RankedBars', () => {
  it('sizes bars against the largest value', () => {
    const { container } = render(<RankedBars items={items} valueFormatter={(v) => `${v} rps`} />)
    const fills = container.querySelectorAll<HTMLElement>('[data-part="fill"]')
    expect(fills[0]?.style.width).toBe('100%')
    expect(fills[1]?.style.width).toBe('25%')
    expect(screen.getByText('/api/orders')).toBeInTheDocument()
    expect(screen.getByText('50 rps')).toBeInTheDocument()
  })

  it('guards a zero maximum', () => {
    const { container } = render(<RankedBars items={[{ label: 'a', value: 0 }]} />)
    expect(container.innerHTML).not.toContain('NaN')
  })

  it('shows an empty state', () => {
    render(<RankedBars items={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })
})
