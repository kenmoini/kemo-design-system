import { Box, Flex, HStack, Stack } from '../../styled-system/jsx'
import { colorForSeries } from './chart-colors'

export interface SegmentedBarSegment {
  label: string
  value: number
  /** A CSS colour, normally `token.var('colors.chart.N')`; defaults to the series palette by position. */
  color?: string
}

export interface SegmentedBarProps {
  /** The parts, in bar order. A part at zero draws nothing but stays in the legend. */
  segments: SegmentedBarSegment[]
  /** The whole the parts are a share of; what the parts leave unused shows as the track. */
  total: number
  /** Accessible name for the bar (e.g. "Storage 2.4 of 4 TB"). */
  label?: string
}

/** Percent of `whole`, to two decimals. */
const share = (value: number, whole: number) => Math.round((value / whole) * 10000) / 100

/** Parts of a whole as one thin bar with 2px surface gaps, and a legend of swatch, name and value. */
export function SegmentedBar({ segments, total, label }: SegmentedBarProps) {
  const colored = segments.map((s, i) => ({ ...s, color: s.color ?? colorForSeries(i) }))
  const used = colored.reduce((sum, s) => sum + Math.max(0, s.value), 0)
  // Parts larger than the stated total scale to their own sum rather than overflowing the bar.
  const whole = Math.max(total, used)
  const parts = total > 0 ? colored.filter((s) => s.value > 0) : []
  const rest = total > 0 ? share(total - used, whole) : 100

  return (
    <Stack gap="2">
      <Flex gap="0.5" h="2" {...(label ? { role: 'img', 'aria-label': label } : {})}>
        {parts.map((s, i) => (
          <Box
            key={i}
            data-part="segment"
            _first={{ borderStartRadius: 'l1' }}
            _last={{ borderEndRadius: 'l1' }}
            style={{ flexBasis: `${share(s.value, whole)}%`, background: s.color }}
          />
        ))}
        {rest > 0 ? (
          <Box
            data-part="track"
            bg="gray.4"
            _first={{ borderStartRadius: 'l1' }}
            _last={{ borderEndRadius: 'l1' }}
            style={{ flexBasis: `${rest}%` }}
          />
        ) : null}
      </Flex>
      <HStack gap="3" flexWrap="wrap" textStyle="xs" color="fg.muted">
        {colored.map((s, i) => (
          <HStack key={i} gap="1.5">
            <Box w="2" h="2" borderRadius="l1" flexShrink="0" style={{ background: s.color }} />
            <span>{s.label}</span>
            <Box as="span" fontVariantNumeric="tabular-nums">
              {s.value}
            </Box>
          </HStack>
        ))}
      </HStack>
    </Stack>
  )
}
