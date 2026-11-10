import { Box, HStack, Stack } from '../../styled-system/jsx'
import { Text } from '../components/ui'

export interface RankedBarsProps {
  /** Already in rank order; the first (largest) item fills its track. */
  items: { label: string; value: number }[]
  valueFormatter?: (value: number) => string
}

/** Rows of label, proportional bar and value for a ranked list. */
export function RankedBars({ items, valueFormatter }: RankedBarsProps) {
  if (items.length === 0) {
    return (
      <Text color="fg.subtle" textStyle="sm">
        No data
      </Text>
    )
  }
  const max = Math.max(...items.map((i) => i.value))

  return (
    <Stack gap="3">
      {items.map((item) => {
        const pct = max > 0 ? (item.value / max) * 100 : 0
        return (
          <Stack key={item.label} gap="1">
            <HStack justify="space-between" gap="3">
              <Text
                textStyle="sm"
                minW="0"
                overflow="hidden"
                whiteSpace="nowrap"
                textOverflow="ellipsis"
              >
                {item.label}
              </Text>
              <Text
                textStyle="sm"
                color="fg.muted"
                textAlign="end"
                fontVariantNumeric="tabular-nums"
              >
                {valueFormatter?.(item.value) ?? String(item.value)}
              </Text>
            </HStack>
            <Box bg="gray.3" h="2" borderRadius="l1" overflow="hidden">
              <Box data-part="fill" bg="chart.1" h="full" style={{ width: `${pct}%` }} />
            </Box>
          </Stack>
        )
      })}
    </Stack>
  )
}
