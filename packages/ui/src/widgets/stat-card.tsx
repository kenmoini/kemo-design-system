import { Box, Flex, styled } from '../../styled-system/jsx'
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
      {/* Only a body, so it takes the top inset a header would otherwise give. */}
      <Card.Body gap="2" pt="6">
        <Text color="fg.muted" textStyle="sm">
          {label}
        </Text>
        <Text
          textStyle="2xl"
          fontWeight="semibold"
          letterSpacing="tight"
          fontVariantNumeric="tabular-nums"
        >
          {value}
        </Text>
        {/* The delta keeps its natural width, so it never wraps beside the sparkline: the sparkline takes
            64–96px next to it, or moves below it when that does not fit. */}
        <Flex align="center" justify="space-between" wrap="wrap" columnGap="3" rowGap="2">
          {delta ? (
            <Text as="p" textStyle="xs" data-testid="stat-delta">
              <Box
                as="span"
                whiteSpace="nowrap"
                color={
                  delta.tone === 'good' ? 'green.11' : delta.tone === 'bad' ? 'red.11' : 'fg.muted'
                }
              >
                {/* Screen readers hear the word, not the glyph's name. */}
                <span aria-hidden="true">{delta.direction === 'up' ? '▲ ' : '▼ '}</span>
                <styled.span srOnly>
                  {delta.direction === 'up' ? 'increase ' : 'decrease '}
                </styled.span>
                {delta.value}
              </Box>
              {delta.suffix ? <Box as="span" color="fg.muted">{` ${delta.suffix}`}</Box> : null}
            </Text>
          ) : (
            <span />
          )}
          {sparkline ? (
            <Box
              flexGrow="1"
              flexBasis="16"
              minW="0"
              maxW="24"
              css={{ '& svg': { display: 'block', maxW: 'full' } }}
            >
              <Sparkline data={sparkline} label={`${label} trend`} />
            </Box>
          ) : null}
        </Flex>
      </Card.Body>
    </Card.Root>
  )
}
