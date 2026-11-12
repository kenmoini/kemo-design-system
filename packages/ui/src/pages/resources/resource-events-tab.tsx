'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Badge, Code, SegmentGroup, Text } from '../../components/ui'
import { type K8sEvent, relativeAge } from '../../lib/kubernetes'
import { DataTable, type DataTableColumn } from '../../widgets'
import { useReaderPause } from '../access/use-reader-pause'
import type { ResourceEventsTabProps } from './types'

type TypeFilter = 'all' | 'warning'
type ScopeFilter = 'children' | 'only'

const DEFAULT_CHILD_KINDS = ['ReplicaSet', 'Pod']
const entity = { singular: 'event', plural: 'events' }

function eventColumns(now: string): DataTableColumn<K8sEvent>[] {
  return [
    {
      id: 'type',
      header: 'Type',
      accessor: (event) => event.type,
      cell: (event) => (
        <Badge variant="subtle" colorPalette={event.type === 'Warning' ? 'amber' : 'blue'}>
          {event.type}
        </Badge>
      ),
    },
    { id: 'reason', header: 'Reason', accessor: (event) => event.reason },
    {
      id: 'message',
      header: 'Message',
      sortable: false,
      cell: (event) => (
        <Text as="span" display="block" whiteSpace="normal" minW="48">
          {event.message}
        </Text>
      ),
    },
    {
      id: 'object',
      header: 'Object',
      accessor: (event) => `${event.involvedObject.kind}/${event.involvedObject.name}`,
      cell: (event) => (
        <Code size="sm" whiteSpace="nowrap">
          {`${event.involvedObject.kind.toLowerCase()}/${event.involvedObject.name}`}
        </Code>
      ),
    },
    { id: 'count', header: 'Count', accessor: (event) => event.count, align: 'end' },
    {
      id: 'lastSeen',
      header: 'Last seen',
      // ISO timestamps sort chronologically as text.
      accessor: (event) => event.lastSeen,
      cell: (event) => (
        <styled.time dateTime={event.lastSeen} whiteSpace="nowrap">
          {relativeAge(event.lastSeen, now)}
        </styled.time>
      ),
    },
  ]
}

/**
 * The events of a resource and its children (a Deployment's ReplicaSets and Pods, say), newest
 * first: by type (all or warnings) and by scope (with the children or the resource only). Live,
 * it says it is streaming and holds its rows still while the pointer or focus is on them.
 */
export function ResourceEventsTab({
  events,
  live = false,
  now,
  parentKind = 'Deployment',
  childKinds = DEFAULT_CHILD_KINDS,
  onPauseChange,
}: ResourceEventsTabProps) {
  const [type, setType] = useState<TypeFilter>('all')
  const [scope, setScope] = useState<ScopeFilter>('children')
  const [paused, setPaused] = useState(false)
  // The rows a reader is looking at, held while paused so the stream never moves under them.
  const [held, setHeld] = useState<K8sEvent[] | null>(null)
  const latest = useRef(events)
  useEffect(() => {
    latest.current = events
  })
  const pause = useReaderPause((next) => {
    setPaused(next)
    setHeld(next ? latest.current : null)
    onPauseChange?.(next)
  })

  const shown = live && held ? held : events
  const inScope = useMemo(
    () =>
      shown.filter((event) => {
        const kind = event.involvedObject.kind
        return scope === 'only'
          ? kind === parentKind
          : kind === parentKind || childKinds.includes(kind)
      }),
    [shown, scope, parentKind, childKinds],
  )
  const warnings = useMemo(() => inScope.filter((event) => event.type === 'Warning'), [inScope])
  const rows = type === 'warning' ? warnings : inScope
  const columns = useMemo(() => eventColumns(now), [now])

  return (
    <Stack gap="4">
      <HStack justify="space-between" gap="3" flexWrap="wrap">
        <HStack gap="3" flexWrap="wrap">
          <SegmentGroup.Root
            size="sm"
            value={type}
            onValueChange={(details) => setType((details.value as TypeFilter | null) ?? 'all')}
          >
            <SegmentGroup.Label srOnly>Type</SegmentGroup.Label>
            <SegmentGroup.Indicator />
            <SegmentGroup.Items
              items={[
                { value: 'all', label: `All ${inScope.length}` },
                { value: 'warning', label: `Warning ${warnings.length}` },
              ]}
            />
          </SegmentGroup.Root>
          <SegmentGroup.Root
            size="sm"
            value={scope}
            onValueChange={(details) =>
              setScope((details.value as ScopeFilter | null) ?? 'children')
            }
          >
            <SegmentGroup.Label srOnly>Scope</SegmentGroup.Label>
            <SegmentGroup.Indicator />
            <SegmentGroup.Items
              items={[
                { value: 'children', label: `${parentKind} + children` },
                { value: 'only', label: `${parentKind} only` },
              ]}
            />
          </SegmentGroup.Root>
        </HStack>
        {live ? (
          <Text role="status" textStyle="sm" color="fg.muted">
            {paused ? '● paused' : '● streaming · paused on hover'}
          </Text>
        ) : null}
      </HStack>
      {/* Focusable, so a keyboard can reach the events and hold them still (focus inside pauses). */}
      <Box
        role="region"
        aria-label="Events"
        tabIndex={0}
        outline="none"
        borderRadius="l3"
        focusVisibleRing="outside"
        {...pause}
      >
        <DataTable
          entity={entity}
          columns={columns}
          rows={rows}
          initialSort={{ id: 'lastSeen', desc: true }}
          pageSize={10}
          emptyMessage={shown.length === 0 ? 'No events yet' : 'No events match these filters'}
        />
      </Box>
    </Stack>
  )
}
