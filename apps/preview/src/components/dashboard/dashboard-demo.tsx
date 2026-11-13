'use client'
import {
  ActivityFeed,
  AlertBanner,
  Badge,
  BarChart,
  Button,
  CalendarHeatmap,
  Card,
  ChartCard,
  type Column,
  DataTableCard,
  DonutGauge,
  EmptyState,
  EventStream,
  Heading,
  LineChart,
  PageHeader,
  ProgressList,
  RankedBars,
  SegmentedBar,
  SmallMultiples,
  Sparkline,
  StatCard,
  StatusGrid,
  Text,
} from '@kemo/ui'
import { PlusIcon } from 'lucide-react'
import { type ComponentProps, type FocusEvent, type ReactNode, useState } from 'react'
import { Box, Grid, HStack, Stack, styled } from '../../../styled-system/jsx'
import { ConsoleFrame, DemoSelect } from '@/components/console/console-frame'
import {
  activity,
  capacity,
  capacityTable,
  deploymentDays,
  type Deployment,
  deployments,
  deploymentsByDay,
  deploymentsTable,
  deploymentsTotal,
  deploymentTabs,
  events,
  heatmap,
  incident,
  liveEventRotation,
  nodeCells,
  nodeTable,
  pageContext,
  regions,
  requestSeries,
  requestTable,
  rollouts,
  services,
  stats,
  timeRanges,
  topEndpoints,
  topEndpointsTable,
} from '@/lib/mock-dashboard'
import { useLiveEvents } from '@/lib/use-live-events'

// Every control on this page is inert: buttons call no-ops, and the selects (time range, service;
// `ConsoleFrame` holds environment and workspace), the table tabs and the pager hold local state so
// they respond.
const noop = () => {}

const thousands = (n: number) => `${(n / 1000).toFixed(1)}k`

/** A grid cell of the 12-column layout: one column below `md`, then the span for the slot. */
const Slot = styled('div', {
  base: { display: 'grid', minW: '0' },
  variants: {
    span: {
      full: { gridColumn: { md: 'span 12' } },
      stat: { gridColumn: { md: 'span 6', lg: 'span 3' } },
      third: { gridColumn: { md: 'span 6', lg: 'span 4' } },
      wide: { gridColumn: { md: 'span 12', lg: 'span 8' } },
    },
  },
})

/** Card chrome for the slots that are not a ChartCard or DataTableCard, with the same header. */
function Panel({
  title,
  caption,
  children,
  ...rootProps
}: Omit<ComponentProps<typeof Card.Root>, 'title'> & {
  title: string
  caption?: string
  children: ReactNode
}) {
  return (
    <Card.Root variant="outline" {...rootProps}>
      <Card.Header>
        <Card.Title as="h2">{title}</Card.Title>
        {caption ? (
          <Text color="fg.muted" textStyle="sm">
            {caption}
          </Text>
        ) : null}
      </Card.Header>
      <Card.Body gap="6">{children}</Card.Body>
    </Card.Root>
  )
}

/** A titled block inside a Panel (Regions under Rollouts). */
function SubSection({
  title,
  caption,
  children,
}: {
  title: string
  caption: string
  children: ReactNode
}) {
  return (
    <Stack gap="3" pt="5" borderTopWidth="1px" borderColor="border">
      <Box>
        <Heading as="h4" textStyle="sm">
          {title}
        </Heading>
        <Text color="fg.muted" textStyle="xs">
          {caption}
        </Text>
      </Box>
      {children}
    </Stack>
  )
}

// Status palettes are reserved for state and always carry their text.
function DeploymentBadge({ status, label }: Pick<Deployment, 'status'> & { label: string }) {
  switch (status) {
    case 'live':
      return <Badge colorPalette="green">{label}</Badge>
    case 'canary':
      return <Badge colorPalette="amber">{label}</Badge>
    case 'rolled-back':
      return <Badge colorPalette="red">{label}</Badge>
    default:
      return <Badge>{label}</Badge>
  }
}

const deploymentColumns: Column<Deployment>[] = [
  {
    id: 'service',
    header: 'Service',
    cell: (row) => (
      <Text as="span" fontWeight="medium">
        {row.service}
      </Text>
    ),
  },
  { id: 'version', header: 'Version' },
  { id: 'env', header: 'Environment' },
  { id: 'by', header: 'By' },
  {
    id: 'status',
    header: 'Status',
    cell: (row) => <DeploymentBadge status={row.status} label={row.statusLabel} />,
  },
  {
    id: 'latency',
    header: 'Latency',
    cell: (row) => (
      <Sparkline data={row.latency} width={64} height={20} label={`${row.service} p95 latency`} />
    ),
  },
  { id: 'when', header: 'When' },
]

function RecentDeployments() {
  const [tab, setTab] = useState('all')
  const [page, setPage] = useState(1)
  const rows = deployments.filter((d) =>
    tab === 'all' ? true : tab === 'failed' ? d.status === 'rolled-back' : d.env === tab,
  )
  return (
    <DataTableCard
      title="Recent deployments"
      tabs={deploymentTabs}
      activeTab={tab}
      onTabChange={(id) => {
        setTab(id)
        setPage(1)
      }}
      columns={deploymentColumns}
      rows={rows}
      page={{ index: page, size: 5, total: tab === 'all' ? deploymentsTotal : rows.length }}
      onPageChange={setPage}
    />
  )
}

/**
 * The live Event stream. It stops ticking while the Pause toggle is on, the pointer is over the card
 * or focus is inside it, so the polite announcements and the moving list can be stopped (WCAG 2.2.2).
 * The stream shows the Live or Paused status itself.
 */
function EventStreamCard() {
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [toggled, setToggled] = useState(false)
  const live = useLiveEvents(events, {
    rotation: liveEventRotation,
    paused: toggled || hovered || focused,
  })

  return (
    <Panel
      title="Event stream"
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={(event: FocusEvent<HTMLDivElement>) => {
        // Focus within: only a move out of the card resumes the stream.
        const next = event.relatedTarget
        if (!(next instanceof Node && event.currentTarget.contains(next))) setFocused(false)
      }}
    >
      {/* The stream keeps the newest 20; the list scrolls inside the card rather than growing the row. */}
      <Box
        role="group"
        aria-label="Events, newest first"
        tabIndex={0}
        maxH="72"
        overflowY="auto"
        outline="none"
        focusVisibleRing="outside"
      >
        <EventStream events={live} live paused={toggled} onPausedChange={setToggled} />
      </Box>
    </Panel>
  )
}

export function DashboardDemo() {
  const [timeRange, setTimeRange] = useState('24h')
  const [service, setService] = useState('all')

  return (
    <ConsoleFrame active="overview">
      <Stack gap="6">
        <PageHeader
          title="Overview"
          context={pageContext.map((part) => (
            <span key={part}>{part}</span>
          ))}
          actions={
            <>
              <Box w="40">
                <DemoSelect
                  label="Time range"
                  options={timeRanges}
                  value={timeRange}
                  onChange={setTimeRange}
                />
              </Box>
              <Box w="40">
                <DemoSelect
                  label="Service"
                  options={services}
                  value={service}
                  onChange={setService}
                />
              </Box>
              <Button variant="outline" size="sm" onClick={noop}>
                Export
              </Button>
              <Button size="sm" onClick={noop}>
                <PlusIcon />
                Add widget
              </Button>
            </>
          }
        />

        <Grid gap="4" gridTemplateColumns={{ base: '1fr', md: 'repeat(12, minmax(0, 1fr))' }}>
          <Slot span="full">
            <AlertBanner
              title={incident.title}
              description={incident.description}
              action={{ label: incident.action, onSelect: noop }}
            />
          </Slot>

          {stats.map((stat) => (
            <Slot key={stat.label} span="stat">
              <StatCard {...stat} />
            </Slot>
          ))}

          <Slot span="wide">
            <ChartCard title="Requests per minute" caption="Last 24 hours" table={requestTable}>
              <LineChart series={requestSeries} />
            </ChartCard>
          </Slot>
          <Slot span="third">
            <ChartCard title="Capacity" caption="Cluster" table={capacityTable}>
              <Stack gap="6">
                <HStack gap="5">
                  <DonutGauge value={capacity.cpu.used} max={capacity.cpu.total} label="CPU" />
                  <Stack gap="1" textStyle="sm" color="fg.muted">
                    {capacity.lines.map((line) => (
                      <span key={line}>{line}</span>
                    ))}
                  </Stack>
                </HStack>
                <Stack gap="2">
                  <Text textStyle="sm" color="fg.muted">
                    {`Storage ${capacity.storage.used} of ${capacity.storage.total} TB`}
                  </Text>
                  <SegmentedBar
                    segments={capacity.storage.segments}
                    total={capacity.storage.total}
                    label={`Storage ${capacity.storage.used} of ${capacity.storage.total} TB`}
                  />
                </Stack>
              </Stack>
            </ChartCard>
          </Slot>

          <Slot span="third">
            <ChartCard title="Deployments per day" caption="Last 7 days" table={deploymentsTable}>
              <BarChart categories={deploymentDays} series={deploymentsByDay} />
            </ChartCard>
          </Slot>
          <Slot span="third">
            <ChartCard title="Node health" caption="44 of 48 ready" table={nodeTable}>
              <StatusGrid cells={nodeCells} />
            </ChartCard>
          </Slot>
          <Slot span="third">
            <ChartCard
              title="Top endpoints"
              caption="Requests, last hour"
              table={topEndpointsTable}
            >
              <RankedBars items={topEndpoints} valueFormatter={thousands} />
            </ChartCard>
          </Slot>

          <Slot span="wide">
            <RecentDeployments />
          </Slot>
          <Slot span="third">
            <Panel title="Rollouts" caption="In progress">
              <ProgressList items={rollouts} />
              <SubSection title="Regions" caption="p95 latency, last hour">
                <SmallMultiples items={regions} />
              </SubSection>
            </Panel>
          </Slot>

          <Slot span="third">
            <EventStreamCard />
          </Slot>
          <Slot span="third">
            <Panel title="Activity" caption="Team">
              <ActivityFeed items={activity} />
            </Panel>
          </Slot>
          <Slot span="third">
            <Panel title="Deploy frequency" caption="Last 16 weeks">
              <CalendarHeatmap values={heatmap} weeks={16} />
              <EmptyState
                message="No scheduled maintenance."
                action={{ label: 'Schedule a window', onSelect: noop }}
              />
            </Panel>
          </Slot>
        </Grid>
      </Stack>
    </ConsoleFrame>
  )
}
