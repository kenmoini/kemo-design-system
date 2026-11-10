'use client'
import type { TooltipPayload } from 'recharts'
import { Box, HStack } from '../../styled-system/jsx'

export interface ChartTooltipProps {
  /** Injected by Recharts (`<Tooltip content={<ChartTooltip />} />`). */
  active?: boolean
  /** Injected by Recharts: one entry per series at the hovered x (or the hovered mark). */
  payload?: TooltipPayload
  /** Injected by Recharts: the hovered x value. */
  label?: string | number
  valueFormatter?: (n: number) => string
}

/** Recharts tooltip content: the x label, then a swatch, name and value per series. Tokens only. */
export function ChartTooltip({ active, payload, label, valueFormatter }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <Box
      bg="gray.surface.bg"
      borderWidth="1px"
      borderColor="border"
      borderRadius="l2"
      shadow="sm"
      px="2"
      py="1.5"
      textStyle="xs"
      minW="32"
    >
      {label != null && label !== '' ? <Box color="fg.muted">{label}</Box> : null}
      {payload.map((entry, i) => (
        <HStack key={`${String(entry.dataKey ?? entry.name)}-${i}`} gap="1.5">
          {/* The swatch colour comes from Recharts (the series' token CSS variable). */}
          <Box w="2" h="2" borderRadius="l1" flexShrink="0" style={{ background: entry.color }} />
          <Box color="fg.default">{entry.name}</Box>
          <Box ms="auto" ps="3" fontWeight="medium" fontVariantNumeric="tabular-nums">
            {typeof entry.value === 'number' && valueFormatter
              ? valueFormatter(entry.value)
              : String(entry.value ?? '')}
          </Box>
        </HStack>
      ))}
    </Box>
  )
}
