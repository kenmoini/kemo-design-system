import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DeploymentStatusBadge, deploymentStatusOptions, LabelChips } from './cells'

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

describe('DeploymentStatusBadge', () => {
  it('says the status in words', () => {
    render(<DeploymentStatusBadge status="degraded" />)
    expect(screen.getByText('Degraded')).toBeInTheDocument()
  })

  it('reads a Deployment scaled to zero as neutral, and the filter lists it', () => {
    render(<DeploymentStatusBadge status="scaled-to-zero" />)
    expect(screen.getByText('Scaled to zero')).toHaveClass('color-palette_gray')
    expect(deploymentStatusOptions).toContainEqual({
      value: 'scaled-to-zero',
      label: 'Scaled to zero',
    })
  })
})
