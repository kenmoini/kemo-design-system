'use client'
import { type ReactNode, useState } from 'react'
import { css } from '../../styled-system/css'
import { Box, Flex, styled } from '../../styled-system/jsx'
import { Button, Text } from '../components/ui'
import { useReaderPause } from '../pages/access/use-reader-pause'

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
  /**
   * The stream is live: announce additions politely to assistive tech as events arrive, and show a
   * Pause / Resume toggle. The list also holds still (shown as "Paused while you read", not
   * announced) while the pointer is over it or focus is inside.
   */
  live?: boolean
  /** The toggle's state, when the host owns it (it may also stop feeding events); else internal. */
  paused?: boolean
  onPausedChange?: (paused: boolean) => void
}

const srOnly = css({ srOnly: true })

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
export function EventStream({ events, live = false, paused, onPausedChange }: EventStreamProps) {
  const [ownPaused, setOwnPaused] = useState(false)
  // The pointer is over the list or focus is inside it (WCAG 2.2.2).
  const [reading, setReading] = useState(false)
  // The rows a reader is looking at, held while paused so the list never moves under them.
  const [held, setHeld] = useState<EventStreamEvent[] | null>(null)
  const readerHandlers = useReaderPause(setReading)

  const toggled = paused ?? ownPaused
  // The hold shows only when the toggle has not already paused the list.
  const readerHold = live && reading && !toggled
  const frozen = live && (toggled || reading)
  if (frozen && !held) setHeld(events)
  if (!frozen && held) setHeld(null)
  const shown = held ?? events

  const toggle = () => {
    setOwnPaused(!toggled)
    onPausedChange?.(!toggled)
  }

  return (
    <Box>
      {live ? (
        <Flex justify="space-between" align="center" gap="3" mb="3">
          <Text as="span" textStyle="xs" color="fg.muted">
            {/* A persistent region whose text changes, so each change is announced once. It speaks
                the toggle's state only: the reader's hold is shown in its place but hidden from
                assistive tech, so a pointer passing over the list is not announced. */}
            <span role="status" className={readerHold ? srOnly : undefined}>
              {toggled ? 'Paused' : 'Live'}
            </span>
            {readerHold ? <span aria-hidden="true">Paused while you read</span> : null}
          </Text>
          <Button size="xs" variant="outline" aria-pressed={toggled} onClick={toggle}>
            {toggled ? 'Resume' : 'Pause'}
          </Button>
        </Flex>
      ) : null}
      {/* The reader's pause covers the list, not the toggle: Resume must not be held by its own focus. */}
      <Box
        {...(live ? readerHandlers : {})}
        {...(live
          ? { role: 'status', 'aria-label': 'Events', 'aria-live': 'polite', 'aria-atomic': false }
          : {})}
      >
        {/* `listStyle: none` drops the implicit list role in Safari/VoiceOver; set it back. */}
        <styled.ol
          role="list"
          listStyle="none"
          ms="1"
          borderInlineStartWidth="1px"
          borderColor="border"
        >
          {shown.map((event) => (
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
    </Box>
  )
}
