'use client'
import { Grid, Stack } from '../../../../styled-system/jsx'
import { Card } from '../../../components/ui'
import {
  ActivityFeed,
  type ActivityItem,
  EventStream,
  type EventStreamEvent,
  StatCard,
  type StatCardProps,
} from '../../../widgets'
import { TitleNote } from '../cells'
import { useReaderPause } from '../use-reader-pause'

export interface AccessOverviewProps {
  /** Four stats, in order: internal users, groups, OIDC users, active sessions. */
  stats: StatCardProps[]
  /** Sign-ins over the last 24 hours, newest first. */
  signIns: ActivityItem[]
  /** Authenticated API calls, newest first. */
  apiCalls: EventStreamEvent[]
  /** The calls update as they happen: the card says so and announces additions politely. */
  live?: boolean
  /**
   * Called with `true` while the pointer is over the calls card or focus is inside it, and `false`
   * once it leaves, so the host can pause the stream for a reader (WCAG 2.2.2).
   */
  onStreamPauseChange?: (paused: boolean) => void
}

/**
 * The Access Overview tab: four stat cards (two per row on `md`, four on `lg`), then the last
 * day's sign-ins beside the authenticated API calls on `lg` (stacked below).
 */
export function AccessOverview({
  stats,
  signIns,
  apiCalls,
  live = false,
  onStreamPauseChange,
}: AccessOverviewProps) {
  const pause = useReaderPause(onStreamPauseChange)
  return (
    <Stack gap="6">
      <Grid columns={{ base: 1, md: 2, lg: 4 }} gap="4">
        {stats.map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </Grid>
      <Grid columns={{ base: 1, lg: 2 }} gap="4" alignItems="start">
        <Card.Root variant="outline">
          <Card.Header>
            <Card.Title as="h2">
              Sign-ins
              <TitleNote>last 24 h</TitleNote>
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <ActivityFeed items={signIns} />
          </Card.Body>
        </Card.Root>
        <Card.Root variant="outline" {...pause}>
          <Card.Header>
            <Card.Title as="h2">
              Authenticated API calls
              {live ? <TitleNote>live</TitleNote> : null}
            </Card.Title>
          </Card.Header>
          <Card.Body>
            <EventStream events={apiCalls} live={live} />
          </Card.Body>
        </Card.Root>
      </Grid>
    </Stack>
  )
}
