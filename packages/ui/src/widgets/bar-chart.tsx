'use client'
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  Legend,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { token } from '../../styled-system/tokens'
import { plotSeries } from './chart-colors'
import {
  ChartFrame,
  axisLine,
  axisTick,
  chartMargin,
  compactTick,
  gridStroke,
  legendProps,
} from './chart-frame'
import { ChartTooltip } from './chart-tooltip'
import type { Series } from './types'

export interface BarChartProps {
  /** The x categories, in order; each series' points are matched to them by `x`. */
  categories: string[]
  /** Up to five series; a sixth and beyond fold into "Other". */
  series: Series[]
  /** Stack the series in one column per category instead of grouping them side by side. */
  stacked?: boolean
  /** Fixed height in px (default 240). */
  height?: number
  /** Fixed width in px; with `height`, skips the responsive container. */
  width?: number
  /** Formats y-axis ticks and tooltip values (default: compact ticks, raw tooltip values). */
  valueFormatter?: (n: number) => string
}

const rounded: [number, number, number, number] = [4, 4, 0, 0]
const surface = token.var('colors.gray.surface.bg')

/**
 * Grouped or stacked bars: 4px rounded data-ends (only the top segment of a stack), a 2px surface gap
 * between stacked segments, legend for two or more series, per-bar tooltip, one y-axis.
 */
export function BarChart({
  categories,
  series,
  stacked = false,
  height,
  width,
  valueFormatter,
}: BarChartProps) {
  const { plotted, rows } = plotSeries(series, categories)

  return (
    <ChartFrame
      empty={series.length === 0 || categories.length === 0}
      width={width}
      height={height}
    >
      {(size) => (
        <RechartsBarChart
          data={rows}
          {...size}
          margin={chartMargin}
          barGap={2}
          accessibilityLayer={false}
        >
          <CartesianGrid vertical={false} stroke={gridStroke} />
          <XAxis dataKey="x" tick={axisTick} axisLine={axisLine} tickLine={false} />
          <YAxis
            width={36}
            tick={axisTick}
            axisLine={false}
            tickLine={false}
            tickFormatter={valueFormatter ?? compactTick}
          />
          <Tooltip
            content={<ChartTooltip valueFormatter={valueFormatter} />}
            shared={false}
            cursor={false}
            isAnimationActive={false}
          />
          {plotted.length > 1 ? <Legend {...legendProps} /> : null}
          {plotted.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label}
              fill={s.color}
              maxBarSize={32}
              radius={!stacked || i === plotted.length - 1 ? rounded : undefined}
              isAnimationActive={false}
              {...(stacked ? { stackId: 'a', stroke: surface, strokeWidth: 2 } : {})}
            />
          ))}
        </RechartsBarChart>
      )}
    </ChartFrame>
  )
}
