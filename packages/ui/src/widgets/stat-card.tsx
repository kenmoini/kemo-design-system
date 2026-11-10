import { Box, Flex } from '../../styled-system/jsx'
import { Card, Text } from '../components/ui'
import { Sparkline } from './sparkline'
import type { Delta } from './types'

export interface StatCardProps {
  value: string
  label: string
  delta?: Delta
  sparkline?: number[]
}

export function StatCard({ value, label, delta, sparkline }: StatCardProps) {
  return (
    <Card.Root variant="outline">
      <Card.Body gap="2">
        <Text color="fg.muted" textStyle="sm">
          {label}
        </Text>
        <Text textStyle="3xl" fontWeight="semibold" fontVariantNumeric="tabular-nums">
          {value}
        </Text>
        <Flex align="center" justify="space-between" gap="3">
          {delta ? (
            <Text as="p" textStyle="sm" data-testid="stat-delta">
              <Box
                as="span"
                color={
                  delta.tone === 'good' ? 'green.11' : delta.tone === 'bad' ? 'red.11' : 'fg.muted'
                }
              >
                {delta.direction === 'up' ? '▲' : '▼'} {delta.value}
              </Box>
              {delta.suffix ? <Box as="span" color="fg.muted">{` ${delta.suffix}`}</Box> : null}
            </Text>
          ) : (
            <span />
          )}
          {sparkline ? <Sparkline data={sparkline} label={`${label} trend`} /> : null}
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}
