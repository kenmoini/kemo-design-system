'use client'
import { Box, Flex, Grid, HStack, Stack } from '../../styled-system/jsx'
import { Text, Tooltip } from '../components/ui'
import type { StatusTone } from './types'

export interface StatusGridProps {
  cells: { id: string; status: StatusTone; label: string }[]
  columns?: number
  /** The word for each status; also names every cell, so colour is never the only signal. */
  legend?: Record<StatusTone, string>
}

const DEFAULT_LEGEND: Record<StatusTone, string> = {
  good: 'Ready',
  warning: 'Pressure',
  critical: 'NotReady',
  off: 'Cordoned',
}

const ORDER: StatusTone[] = ['good', 'warning', 'critical', 'off']

function Swatch({ status }: { status: StatusTone }) {
  switch (status) {
    case 'good':
      return <Box w="2.5" h="2.5" borderRadius="l1" bg="green.9" />
    case 'warning':
      return <Box w="2.5" h="2.5" borderRadius="l1" bg="amber.9" />
    case 'critical':
      return <Box w="2.5" h="2.5" borderRadius="l1" bg="red.9" />
    default:
      return <Box w="2.5" h="2.5" borderRadius="l1" bg="gray.6" />
  }
}

// Tooltip's trigger merges its handlers and ref into this element, so props are forwarded.
function Cell({ status, name, ...rest }: { status: StatusTone; name: string }) {
  const common = {
    ...rest,
    role: 'img',
    'aria-label': name,
    aspectRatio: '1',
    borderRadius: 'l1',
  } as const
  switch (status) {
    case 'good':
      return <Box {...common} bg="green.9" />
    case 'warning':
      return <Box {...common} bg="amber.9" />
    case 'critical':
      return <Box {...common} bg="red.9" />
    default:
      return <Box {...common} bg="gray.6" />
  }
}

/** A grid of status squares (one per node/instance) with a counted legend. */
export function StatusGrid({ cells, columns = 12, legend = DEFAULT_LEGEND }: StatusGridProps) {
  if (cells.length === 0) {
    return (
      <Text color="fg.subtle" textStyle="sm">
        No data
      </Text>
    )
  }
  const counts = ORDER.map((tone) => ({ tone, n: cells.filter((c) => c.status === tone).length }))

  return (
    <Stack gap="3">
      <Grid gap="1" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {cells.map((c) => {
          const name = `${c.label}: ${legend[c.status]}`
          return (
            <Tooltip key={c.id} content={name}>
              <Cell status={c.status} name={name} />
            </Tooltip>
          )
        })}
      </Grid>
      <Flex gap="4" wrap="wrap">
        {counts
          .filter((c) => c.n > 0)
          .map((c) => (
            <HStack key={c.tone} gap="1.5">
              <Swatch status={c.tone} />
              <Text textStyle="xs" color="fg.muted">{`${c.n} ${legend[c.tone]}`}</Text>
            </HStack>
          ))}
      </Flex>
    </Stack>
  )
}
