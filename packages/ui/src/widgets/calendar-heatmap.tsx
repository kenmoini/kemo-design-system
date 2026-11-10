import { Box, Grid, HStack, Stack } from '../../styled-system/jsx'
import { Text } from '../components/ui'

export interface CalendarHeatmapProps {
  /** One entry per day in order, first value in the first cell (week-major, 7 days per week). */
  values: { date: string; count: number }[]
  weeks?: number
  steps?: 4 | 5
}

const OPACITY: Record<4 | 5, number[]> = {
  4: [0.08, 0.4, 0.7, 1],
  5: [0.08, 0.3, 0.5, 0.75, 1],
}

/** A day: an image named `name`; without one it is a legend swatch, or (`hidden`) padding past the data. */
function Cell({
  step,
  opacity,
  name,
  hidden = false,
}: {
  step: number
  opacity: number
  name?: string
  hidden?: boolean
}) {
  const a11y = hidden
    ? ({ 'aria-hidden': true } as const)
    : name
      ? ({ role: 'img', 'aria-label': name } as const)
      : {}
  return step === 0 ? (
    <Box {...a11y} bg="gray.3" borderRadius="l1" aspectRatio="1" />
  ) : (
    <Box {...a11y} bg="chart.1" borderRadius="l1" aspectRatio="1" style={{ opacity }} />
  )
}

/**
 * A weeks x 7 activity grid with intensity from a fixed opacity ramp on the series colour. Cells past the
 * last value pad the grid and are hidden from assistive tech.
 */
export function CalendarHeatmap({ values, weeks = 12, steps = 5 }: CalendarHeatmapProps) {
  const total = weeks * 7
  // `steps` is typed 4 | 5; an untyped caller's other number falls back to the five-step ramp.
  const ramp = OPACITY[steps] ?? OPACITY[5]
  const levels = ramp.length
  const counts = Array.from({ length: total }, (_, i) => values[i]?.count ?? 0)
  const maxCount = Math.max(0, ...counts)

  return (
    <Stack gap="3">
      <Grid
        gap="1"
        style={{
          gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))`,
          gridTemplateRows: 'repeat(7, auto)',
          gridAutoFlow: 'column',
        }}
      >
        {counts.map((count, i) => {
          const step =
            count === 0 ? 0 : Math.min(levels - 1, Math.ceil((count / maxCount) * (levels - 1)))
          const day = values[i]
          return day ? (
            <Cell key={i} step={step} opacity={ramp[step] ?? 1} name={`${day.date}: ${count}`} />
          ) : (
            <Cell key={i} step={0} opacity={ramp[0] ?? 1} hidden />
          )
        })}
      </Grid>
      <HStack gap="1.5" justify="flex-end">
        <Text textStyle="xs" color="fg.muted">
          Less
        </Text>
        {ramp.map((o, step) => (
          <Box key={step} w="2.5" h="2.5">
            <Cell step={step} opacity={o} />
          </Box>
        ))}
        <Text textStyle="xs" color="fg.muted">
          More
        </Text>
      </HStack>
    </Stack>
  )
}
