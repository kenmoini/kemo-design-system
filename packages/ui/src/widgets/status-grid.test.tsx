import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatusGrid } from './status-grid'
import type { StatusTone } from './types'

const tones: StatusTone[] = [
  ...Array<StatusTone>(45).fill('good'),
  'warning',
  'critical',
  'off',
  'off',
]
const cells = tones.map((status, i) => ({ id: `n${i}`, status, label: `node-${i}` }))

describe('StatusGrid', () => {
  it('renders a named cell per node and a legend with counts', () => {
    render(<StatusGrid cells={cells} />)
    expect(screen.getAllByRole('img')).toHaveLength(49)
    expect(screen.getByRole('img', { name: 'node-45: Pressure' })).toBeInTheDocument()
    for (const t of ['45 Ready', '1 Pressure', '1 NotReady', '2 Cordoned']) {
      expect(screen.getByText(t)).toBeInTheDocument()
    }
  })

  it('shows an empty state without cells', () => {
    render(<StatusGrid cells={[]} />)
    expect(screen.getByText('No data')).toBeInTheDocument()
  })
})
