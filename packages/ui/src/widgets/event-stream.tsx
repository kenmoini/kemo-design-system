'use client'
import type { ReactNode } from 'react'
import { Box, Flex, styled } from '../../styled-system/jsx'
import { Text } from '../components/ui'

export interface EventStreamEvent {
  id: string
  time: string
  tone: 'info' | 'warning' | 'critical' | 'good'
  /** A sentence, or richer content (two lines, say) inside the item's `span`: use phrasing
   * elements only (`span`, `strong`, `code`…). */
  text: ReactNode
}

export interface EventStreamProps {
  /** Rendered in the given order (newest first, typically). */
  events: EventStreamEvent[]
  /** Announce additions politely to assistive tech as events arrive. */
  live?: boolean
}

const TONE_LABEL: Record<EventStreamEvent['tone'], string> = {
  info: 'Info',
  warning: 'Warning',
  critical: 'Critical',
  good: 'Success',
}

function Dot({ tone }: { tone: EventStreamEvent['tone'] }) {
  const common = {
    'aria-hidden': true,
    position: 'absolute',
    insetInlineStart: '-4.5px',
    top: '1.5',
    w: '2',
    h: '2',
    borderRadius: 'full',
  } as const
  switch (tone) {
    case 'critical':
      return <Box {...common} bg="red.9" />
    case 'warning':
      return <Box {...common} bg="amber.9" />
    case 'good':
      return <Box {...common} bg="green.9" />
    default:
      return <Box {...common} bg="chart.1" />
  }
}

/** A time-ordered list of events on a vertical rule, each marked with a tone dot. */
export function EventStream({ events, live = false }: EventStreamProps) {
  return (
    <Box {...(live ? { role: 'status', 'aria-live': 'polite', 'aria-atomic': false } : {})}>
      {/* `listStyle: none` drops the implicit list role in Safari/VoiceOver; set it back. */}
      <styled.ol
        role="list"
        listStyle="none"
        ms="1"
        borderInlineStartWidth="1px"
        borderColor="border"
      >
        {events.map((event) => (
          <styled.li key={event.id} position="relative" ps="4" pb="3" _last={{ pb: '0' }}>
            <Dot tone={event.tone} />
            <Flex gap="3" align="baseline">
              <Text
                as="span"
                textStyle="xs"
                color="fg.subtle"
                fontVariantNumeric="tabular-nums"
                flexShrink="0"
              >
                {event.time}
              </Text>
              <Text as="span" textStyle="sm">
                <styled.span srOnly>{`${TONE_LABEL[event.tone]}: `}</styled.span>
                {event.text}
              </Text>
            </Flex>
          </styled.li>
        ))}
      </styled.ol>
    </Box>
  )
}
