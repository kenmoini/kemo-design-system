import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ArcGauge } from './arc-gauge'
import { DonutGauge } from './donut-gauge'

/** The drawn length of a dashed circle: the first number of its stroke-dasharray. */
function dash(circle: Element) {
  return Number(circle.getAttribute('stroke-dasharray')?.split(/\s+/)[0])
}

describe('DonutGauge', () => {
  it('is an image named by label, value and max, showing the percentage', () => {
    render(<DonutGauge value={70} max={100} label="CPU" caption="340 of 480 cores" />)
    expect(screen.getByRole('img', { name: 'CPU: 70 of 100' })).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    expect(screen.getByText('340 of 480 cores')).toBeInTheDocument()
  })
})

describe('ArcGauge', () => {
  it('is an image named by label, value and max, drawn as a 270° arc', () => {
    const { container } = render(<ArcGauge value={70} max={100} label="CPU" />)
    expect(screen.getByRole('img', { name: 'CPU: 70 of 100' })).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
    const circles = container.querySelectorAll('circle')
    expect(circles).toHaveLength(2)
    const [track, value] = Array.from(circles) as [SVGCircleElement, SVGCircleElement]
    const circumference = 2 * Math.PI * Number(track.getAttribute('r'))
    expect(value).toHaveAttribute('stroke-dasharray')
    expect(dash(track) / circumference).toBeCloseTo(0.75)
    expect(dash(value) / circumference).toBeCloseTo(0.75 * 0.7)
  })
})

describe.each([
  ['DonutGauge', DonutGauge],
  ['ArcGauge', ArcGauge],
] as const)('%s bounds', (_, Gauge) => {
  it('draws no value arc when the percentage rounds to 0', () => {
    for (const value of [0, 0.4]) {
      const { container, unmount } = render(<Gauge value={value} max={100} label="CPU" />)
      expect(container.querySelectorAll('circle')).toHaveLength(1)
      expect(screen.getByText('0%')).toBeInTheDocument()
      unmount()
    }
  })

  it('clamps the percentage to 0–100', () => {
    const { rerender } = render(<Gauge value={150} max={100} label="CPU" />)
    expect(screen.getByText('100%')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'CPU: 150 of 100' })).toBeInTheDocument()
    rerender(<Gauge value={-20} max={100} label="CPU" />)
    expect(screen.getByText('0%')).toBeInTheDocument()
  })
})
