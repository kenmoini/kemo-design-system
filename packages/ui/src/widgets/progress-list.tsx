'use client'
import { Flex, Stack } from '../../styled-system/jsx'
import { css } from '../../styled-system/css'
import { Progress, Text } from '../components/ui'
import type { StatusTone } from './types'

export interface ProgressListProps {
  items: { label: string; value: number; tone?: StatusTone; note?: string }[]
}

const critical = css({ bg: 'red.9' })
const warning = css({ bg: 'amber.9' })

const rangeClass = (tone?: StatusTone) =>
  tone === 'critical' ? critical : tone === 'warning' ? warning : undefined

/** Labelled progress bars with right-aligned percent; critical and warning tint the fill. */
export function ProgressList({ items }: ProgressListProps) {
  return (
    <Stack gap="4">
      {items.map((item) => (
        <Stack key={item.label} gap="1">
          <Progress.Root value={item.value} min={0} max={100} size="sm">
            <Stack gap="1.5" w="full">
              <Flex justify="space-between" gap="2">
                <Progress.Label>{item.label}</Progress.Label>
                <Progress.ValueText
                  className={css({ textAlign: 'end', fontVariantNumeric: 'tabular-nums' })}
                >
                  {`${item.value}%`}
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
