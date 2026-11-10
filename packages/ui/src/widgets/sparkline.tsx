import { styled } from '../../styled-system/jsx'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  label?: string
  /**
   * The y range to scale to, `[min, max]`. Defaults to `sparklineDomain(data)`; pass one shared domain
   * to compare several sparklines like for like.
   */
  domain?: [number, number]
}

const Line = styled('polyline', {
  base: {
    fill: 'none',
    stroke: 'chart.1',
    strokeLinejoin: 'round',
    strokeLinecap: 'round',
  },
})

const PAD = 2
/** The smallest span a default domain covers, relative to the largest magnitude in the data. */
const MIN_SPAN = 0.1

/**
 * The data's min–max, widened around its middle to at least 10% of its largest magnitude, so noise of a
 * percent or two stays a gentle line instead of stretching to the full height.
 */
export function sparklineDomain(data: number[]): [number, number] {
  if (data.length === 0) return [0, 0]
  const min = Math.min(...data)
  const max = Math.max(...data)
  const floor = MIN_SPAN * Math.max(Math.abs(min), Math.abs(max))
  if (max - min >= floor) return [min, max]
  const mid = (min + max) / 2
  return [mid - floor / 2, mid + floor / 2]
}

export function Sparkline({ data, width = 96, height = 28, label, domain }: SparklineProps) {
  const [min, max] = domain ?? sparklineDomain(data)
  const range = max - min
  const stepX = data.length > 1 ? width / (data.length - 1) : 0
  const points = data
    .map((v, i) => {
      const y = range === 0 ? height / 2 : PAD + (1 - (v - min) / range) * (height - PAD * 2)
      return `${+(i * stepX).toFixed(2)},${+y.toFixed(2)}`
    })
    .join(' ')

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <Line points={points} vectorEffect="non-scaling-stroke" strokeWidth={1.5} />
    </svg>
  )
}
