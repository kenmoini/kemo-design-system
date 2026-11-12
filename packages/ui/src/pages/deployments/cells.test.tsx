import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LabelChips } from './cells'

const labels = { app: 'checkout-api', tier: 'backend', team: 'payments' }

describe('LabelChips', () => {
  it('shows the first `max` labels and "+N" for the rest', () => {
    render(<LabelChips labels={labels} max={2} />)
    expect(screen.getByText('app=checkout-api')).toBeInTheDocument()
    expect(screen.getByText('tier=backend')).toBeInTheDocument()
    expect(screen.queryByText('team=payments')).toBeNull()
    expect(screen.getByText('+1')).toBeInTheDocument()
  })

  it('wraps by default and stays on one row with `wrap={false}`', () => {
    const { container, rerender } = render(<LabelChips labels={labels} />)
    expect(container.firstElementChild).toHaveClass('flex-wrap_wrap')
    rerender(<LabelChips labels={labels} wrap={false} />)
    expect(container.firstElementChild).toHaveClass('flex-wrap_nowrap')
  })
})
