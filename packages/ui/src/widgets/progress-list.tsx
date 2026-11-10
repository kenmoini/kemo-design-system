'use client'
import { Flex, Stack } from '../../styled-system/jsx'
import { css } from '../../styled-system/css'
import { Progress, Text } from '../components/ui'
import type { StatusTone } from './types'

export interface ProgressListProps {
  items: { label: string; value: number; tone?: StatusTone; note?: string }[]
}

/** The fill: the first series hue, or the reserved status palette for a tone (`off` stays neutral). */
function rangeClass(tone?: StatusTone) {
  switch (tone) {
    case 'good':
      return css({ bg: 'green.9' })
    case 'warning':
      return css({ bg: 'amber.9' })
    case 'critical':
      return css({ bg: 'red.9' })
    case 'off':
      return css({ bg: 'gray.6' })
    default:
      return css({ bg: 'chart.1' })
  }
}

const clampPercent = (n: number) => Math.min(100, Math.max(0, n))

/** Labelled progress bars with right-aligned percent; the fill takes the item's status tone. */
export function ProgressList({ items }: ProgressListProps) {
  return (
    <Stack gap="4">
      {items.map((item) => (
        <Stack key={item.label} gap="1">
          <Progress.Root value={clampPercent(item.value)} min={0} max={100} size="sm">
            <Stack gap="1.5" w="full">
              <Flex justify="space-between" align="baseline" gap="2">
                <Progress.Label>{item.label}</Progress.Label>
                <Progress.ValueText
                  className={css({ textAlign: 'end', fontVariantNumeric: 'tabular-nums' })}
                >
                  {`${clampPercent(item.value)}%`}
                </Progress.ValueText>
              </Flex>
              <Progress.Track>
                <Progress.Range className={rangeClass(item.tone)} />
              </Progress.Track>
            </Stack>
          </Progress.Root>
          {item.tone === 'critical' && item.note ? (
            <Text textStyle="xs" color="red.11">
              {item.note}
            </Text>
          ) : null}
        </Stack>
      ))}
    </Stack>
  )
}
