'use client'
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart as RechartsLineChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { token } from '../../styled-system/tokens'
import { plotSeries } from './chart-colors'
import {
  ChartFrame,
  axisTick,
  chartMargin,
  compactTick,
  gridStroke,
  legendProps,
  xAxisProps,
} from './chart-frame'
import { ChartTooltip } from './chart-tooltip'
import type { Series } from './types'

export interface LineChartProps {
  /** Up to five series; a sixth and beyond fold into "Other". */
  series: Series[]
  /** Draw each series as a line over a light wash. */
  area?: boolean
  /** Fixed height in px (default 240). */
  height?: number
  /** Fixed width in px; with `height`, skips the responsive container. */
  width?: number
  /** Formats y-axis ticks and tooltip values (default: compact ticks, raw tooltip values). */
  valueFormatter?: (n: number) => string
}

interface EndLabelProps {
  x?: number | string
  y?: number | string
  index?: number
  lastIndex: number
  text: string
}

/** A direct label at a series' last point, set above it and right-aligned so it stays inside the plot. */
function EndLabel({ x, y, index, lastIndex, text }: EndLabelProps) {
  if (index !== lastIndex || x == null || y == null) return null
  const top = Number(y)
  return (
    <text
      x={x}
      y={top < 16 ? top + 14 : top - 8}
      textAnchor="end"
      fill={token.var('colors.fg.muted')}
      fontSize={11}
    >
      {text}
    </text>
  )
}

function lastDefinedIndex(rows: Record<string, unknown>[], key: string) {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i]?.[key] != null) return i
  return -1
}

const surface = token.var('colors.gray.surface.bg')
const activeDot = { r: 4, stroke: surface, strokeWidth: 2 }

/**
 * A line (or area) chart of up to five series over a shared x. Legend for two or more series, direct
 * end labels for up to four, crosshair tooltip with every series at the hovered x, one y-axis.
 */
export function LineChart({ series, area = false, height, width, valueFormatter }: LineChartProps) {
  const { plotted, rows } = plotSeries(series)
  const directLabels = plotted.length <= 4
  const Root = area ? RechartsAreaChart : RechartsLineChart

  return (
    <ChartFrame empty={series.every((s) => s.data.length === 0)} width={width} height={height}>
      {(size) => (
        <Root data={rows} {...size} margin={chartMargin} accessibilityLayer={false}>
          <CartesianGrid vertical={false} stroke={gridStroke} />
          <XAxis {...xAxisProps} />
          <YAxis
            width={36}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={valueFormatter ?? compactTick}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={valueFormatter} />}
            cursor={{ stroke: token.var('colors.gray.7') }}
            isAnimationActive={false}
          />
          {plotted.length > 1 ? <Legend {...legendProps} /> : null}
          {plotted.map((s) => {
            const label = directLabels ? (
              <LabelList
                dataKey={s.key}
                content={<EndLabel lastIndex={lastDefinedIndex(rows, s.key)} text={s.label} />}
              />
            ) : null
            return area ? (
              <Area
                key={s.key}
                dataKey={s.key}
                name={s.label}
                type="monotone"
                stroke={s.color}
                strokeWidth={2}
                fill={s.color}
                fillOpacity={0.1}
                dot={false}
                activeDot={activeDot}
                isAnimationActive={false}
              >
                {label}
              </Area>
            ) : (
              <Line
                key={s.key}
                dataKey={s.key}
                name={s.label}
                type="monotone"
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                activeDot={activeDot}
                isAnimationActive={false}
              >
                {label}
              </Line>
            )
          })}
        </Root>
      )}
    </ChartFrame>
  )
}
