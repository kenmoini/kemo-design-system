import type { ReactNode } from 'react'
import { css } from '../../styled-system/css'
import { Box, Stack } from '../../styled-system/jsx'
import type { StatusTone } from './types'

/** Gauge geometry in a 120 × 120 viewBox: a 10px ring on radius 50. */
export const gauge = { size: 120, center: 60, radius: 50, stroke: 10 } as const
export const circumference = 2 * Math.PI * gauge.radius

export const trackClass = css({ fill: 'none', stroke: 'gray.4' })

/** The value stroke: the reserved status palette for a tone, the first series hue without one. */
export function valueClass(tone?: StatusTone) {
  switch (tone) {
    case 'good':
      return css({ fill: 'none', stroke: 'green.9' })
    case 'warning':
      return css({ fill: 'none', stroke: 'amber.9' })
    case 'critical':
      return css({ fill: 'none', stroke: 'red.9' })
    case 'off':
      return css({ fill: 'none', stroke: 'gray.6' })
    default:
      return css({ fill: 'none', stroke: 'chart.1' })
  }
}

/** `value / max`, clamped to 0–1 (0 when `max` is not positive). */
export function ratio(value: number, max: number) {
  return max > 0 ? Math.min(1, Math.max(0, value / max)) : 0
}

/**
 * The whole percentage shown in the middle, 0–100. The value arc is drawn only when this is above 0: a
 * sliver under half a percent would draw as a round-cap dot.
 */
export const percent = (value: number, max: number) => Math.round(ratio(value, max) * 100)

/** Rounds an SVG length so attributes stay short and stable. */
export const len = (n: number) => +n.toFixed(2)

export interface GaugeProps {
  value: number
  max: number
  /** Names the measure: shown under the percentage and in the accessible name. */
  label: string
  /** Supporting lines below the gauge (e.g. "340 of 480 cores"). */
  caption?: ReactNode
  /** Status colour for the value; omitted, the gauge uses the first series hue. */
  tone?: StatusTone
}

/**
 * The shared gauge layout: an image named "{label}: {value} of {max}" holding the ring (`children`) with
 * the percentage and label centred over it, and the optional caption below.
 */
export function GaugeFrame({
  value,
  max,
  label,
  caption,
  children,
}: Omit<GaugeProps, 'tone'> & { children: ReactNode }) {
  return (
    <Stack align="center" gap="2">
      <Box position="relative" w="32" h="32" role="img" aria-label={`${label}: ${value} of ${max}`}>
        <svg width="100%" height="100%" viewBox={`0 0 ${gauge.size} ${gauge.size}`}>
          {children}
        </svg>
        <Stack position="absolute" inset="0" align="center" justify="center" gap="0">
          <Box textStyle="2xl" fontWeight="semibold" fontVariantNumeric="tabular-nums">
            {percent(value, max)}%
          </Box>
          <Box textStyle="xs" color="fg.muted" textAlign="center" maxW="20">
            {label}
          </Box>
        </Stack>
      </Box>
      {caption != null ? (
        <Box textStyle="sm" color="fg.muted" textAlign="center">
          {caption}
        </Box>
      ) : null}
    </Stack>
  )
}
