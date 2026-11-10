'use client'
import type { ReactElement } from 'react'
import { ResponsiveContainer } from 'recharts'
import { Flex } from '../../styled-system/jsx'
import { token } from '../../styled-system/tokens'
import { Text } from '../components/ui'

const DEFAULT_HEIGHT = 240

/** Shared Recharts styling: recessive grid and axes in ink tokens, one y-axis, room for end labels. */
export const chartMargin = { top: 8, right: 24, bottom: 0, left: 0 }
export const gridStroke = token.var('colors.border')
export const axisTick = { fill: token.var('colors.fg.subtle'), fontSize: 11 }
export const axisLine = { stroke: token.var('colors.gray.7') }
// Series order (keys are positional, s0…s4), not Recharts' default alphabetical sort. Legend text wears an
// ink token, never the series colour (Recharts' default); the line key beside it carries identity.
export const legendProps = {
  iconType: 'plainline',
  align: 'left',
  itemSorter: 'dataKey',
  wrapperStyle: { fontSize: 12, paddingTop: 8 },
  labelStyle: { color: token.var('colors.fg.muted') },
} as const

const compact = new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 })
/**
 * Default y-axis ticks when no `valueFormatter` is given: compact (8K, 1.2M) so they fit the 36px axis.
 * A fixed locale keeps the server and client renders identical; pass `valueFormatter` to localise.
 */
export const compactTick = (n: number) => compact.format(n)

interface ChartFrameProps {
  empty: boolean
  width?: number
  height?: number
  /** Renders the Recharts root; `size` is set when the chart has a fixed size, else the container sizes it. */
  children: (size: { width?: number; height?: number }) => ReactElement
}

/**
 * Sizes a Recharts chart: at a fixed `width` × `height` when both are given (tests, fixed layouts), else
 * in a `ResponsiveContainer` with an initial dimension for the server render. Shows "No data" when empty.
 */
export function ChartFrame({ empty, width, height, children }: ChartFrameProps) {
  const h = height ?? DEFAULT_HEIGHT
  if (empty) {
    return (
      <Flex align="center" justify="center" style={{ width, height: h }}>
        <Text color="fg.subtle" textStyle="sm">
          No data
        </Text>
      </Flex>
    )
  }
  if (width != null && height != null) return children({ width, height })
  return (
    <ResponsiveContainer
      width={width ?? '100%'}
      height={h}
      initialDimension={{ width: width ?? 600, height: h }}
    >
      {children({})}
    </ResponsiveContainer>
  )
}
