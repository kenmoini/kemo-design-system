import { styled } from '../../styled-system/jsx'

export interface SparklineProps {
  data: number[]
  width?: number
  height?: number
  label?: string
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

export function Sparkline({ data, width = 96, height = 28, label }: SparklineProps) {
  const min = Math.min(...data)
  const max = Math.max(...data)
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
