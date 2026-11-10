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

function Cell({ step, opacity, name }: { step: number; opacity: number; name?: string }) {
  const a11y = name ? ({ role: 'img', 'aria-label': name } as const) : {}
  return step === 0 ? (
    <Box {...a11y} bg="gray.3" borderRadius="l1" aspectRatio="1" />
  ) : (
    <Box {...a11y} bg="chart.1" borderRadius="l1" aspectRatio="1" style={{ opacity }} />
  )
}

/** A weeks x 7 activity grid with intensity from a fixed opacity ramp on the series colour. */
export function CalendarHeatmap({ values, weeks = 12, steps = 5 }: CalendarHeatmapProps) {
  const total = weeks * 7
  const ramp = OPACITY[steps]
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
            count === 0 ? 0 : Math.min(steps - 1, Math.ceil((count / maxCount) * (steps - 1)))
          return (
            <Cell
              key={i}
              step={step}
              opacity={ramp[step] ?? 1}
              name={`${values[i]?.date ?? 'No date'}: ${count}`}
            />
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
