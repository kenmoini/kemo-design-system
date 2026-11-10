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
})
