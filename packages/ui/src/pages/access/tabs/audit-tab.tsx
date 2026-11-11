'use client'
import { useId, useMemo, useState } from 'react'
import { Grid } from '../../../../styled-system/jsx'
import { Card, SegmentGroup, Text } from '../../../components/ui'
import { EventStream, type EventStreamEvent } from '../../../widgets'
import { TitleNote } from '../cells'
import { AuditForwardingForm } from '../forms/audit-forwarding-form'
import type { AuditEvent, AuditForwardingValues } from '../types'
import { useReaderPause } from '../use-reader-pause'

export interface AccessAuditProps {
  /** The saved forwarding settings. */
  forwarding: AuditForwardingValues
  /** "Save": resolve when saved; a rejection keeps the input and shows the error's message. */
  onSaveForwarding: (values: AuditForwardingValues) => void | Promise<void>
  /** "Send test event": a rejection shows the error's message. */
  onSendTest: () => void | Promise<void>
  /** When the last event reached the destination; none shows "Not yet delivered". */
  lastDeliveryAt?: string
  /** The API audit stream, newest first. */
  events: AuditEvent[]
  /** The stream updates as calls happen: it says so and announces additions politely. */
  live?: boolean
  /**
   * Called with `true` while the pointer is over the stream's card or focus is inside it, and
   * `false` once it leaves, so the host can pause the stream for a reader (WCAG 2.2.2).
   */
  onStreamPauseChange?: (paused: boolean) => void
}

type StreamFilter = 'all' | 'errors' | 'admin'

const streamFilters: { value: StreamFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'errors', label: '4xx–5xx' },
  { value: 'admin', label: 'Admin' },
]

function matches(event: AuditEvent, filter: StreamFilter): boolean {
  if (filter === 'errors') return event.status >= 400
  if (filter === 'admin') return event.kind === 'admin'
  return true
}

function toneOf(event: AuditEvent): EventStreamEvent['tone'] {
  if (event.status >= 500) return 'critical'
  if (event.status >= 400) return 'warning'
  if (event.kind === 'admin') return 'good'
  return 'info'
}

/** "182 ms" below a second; "2.4 s" from a second up. */
function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} s` : `${ms} ms`
}

/** An audit event as a stream item: method and path, then who, the status, the time taken and the IP. */
function toStreamEvent(event: AuditEvent): EventStreamEvent {
  return {
    id: event.id,
    time: event.time,
    tone: toneOf(event),
    text: (
      <>
        <Text as="span" fontWeight="medium">
          {`${event.method} ${event.path}`}
        </Text>
        <Text as="span" display="block" textStyle="xs" color="fg.subtle">
          {`${event.actor} · ${event.status} · ${formatDuration(event.durationMs)}${event.ip ? ` · ${event.ip}` : ''}`}
        </Text>
      </>
    ),
  }
}

/**
 * The Audit tab: on `lg`, the forwarding form across two thirds and the API audit stream beside it
 * (stacked below `lg`). The stream filters to all calls, failed ones (4xx–5xx) or admin changes.
 */
export function AccessAudit({
  forwarding,
  onSaveForwarding,
  onSendTest,
  lastDeliveryAt,
  events,
  live = false,
  onStreamPauseChange,
}: AccessAuditProps) {
  const titleId = useId()
  const pause = useReaderPause(onStreamPauseChange)
  const [filter, setFilter] = useState<StreamFilter>('all')
  const streamEvents = useMemo(
    () => events.filter((event) => matches(event, filter)).map(toStreamEvent),
    [events, filter],
  )

  return (
    <Grid columns={{ base: 1, lg: 3 }} gap="6" alignItems="start">
      <Card.Root variant="outline" gridColumn={{ lg: 'span 2' }}>
        <Card.Header>
          <Card.Title as="h2" id={titleId}>
            Forward the audit log
          </Card.Title>
          <Card.Description>
            Every call to an authenticated route is recorded here and can be streamed to your SIEM.
          </Card.Description>
        </Card.Header>
        <Card.Body>
          <AuditForwardingForm
            aria-labelledby={titleId}
            values={forwarding}
            onSubmit={onSaveForwarding}
            onSendTest={onSendTest}
            lastDeliveryAt={lastDeliveryAt}
          />
        </Card.Body>
      </Card.Root>
      <Card.Root variant="outline" {...pause}>
        <Card.Header>
          <Card.Title as="h2">
            API audit stream
            {live ? <TitleNote>live</TitleNote> : null}
          </Card.Title>
        </Card.Header>
        {/* Focusable, so a keyboard can reach the stream and pause it (focus inside the card pauses
            the stream). The ring is drawn inside the body: the card clips what overflows. */}
        <Card.Body
          gap="4"
          role="region"
          aria-label="API audit stream"
          tabIndex={0}
          outline="none"
          focusVisibleRing="outside"
          focusRingOffset="-0.5"
          borderBottomRadius="l3"
        >
          <SegmentGroup.Root
            value={filter}
            onValueChange={(details) => setFilter((details.value as StreamFilter | null) ?? 'all')}
            size="sm"
            alignSelf="flex-start"
          >
            <SegmentGroup.Label srOnly>Show</SegmentGroup.Label>
            <SegmentGroup.Indicator />
            <SegmentGroup.Items items={streamFilters} />
          </SegmentGroup.Root>
          {/* Mounted even when empty, so a live stream announces the next matching event. */}
          <EventStream events={streamEvents} live={live} />
          {streamEvents.length === 0 ? (
            <Text textStyle="sm" color="fg.muted">
              No events match this filter yet.
            </Text>
          ) : null}
        </Card.Body>
      </Card.Root>
    </Grid>
  )
}
