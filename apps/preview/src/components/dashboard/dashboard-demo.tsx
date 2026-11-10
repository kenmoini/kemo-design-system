'use client'
import {
  ActivityFeed,
  AlertBanner,
  AppShell,
  Avatar,
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
  type NavGroup,
  PageFooter,
  PageHeader,
  ProgressList,
  RankedBars,
  SegmentedBar,
  SideNav,
  SmallMultiples,
  Sparkline,
  StatCard,
  StatusGrid,
  Text,
  TopBar,
} from '@kemo/ui'
import { ChevronDownIcon, PlusIcon, RefreshCwIcon, Share2Icon } from 'lucide-react'
import NextLink from 'next/link'
import { type ReactNode, useState } from 'react'
import { Box, Grid, HStack, Stack, styled } from '../../../styled-system/jsx'
import { BrandMark } from '@/components/brand-mark'
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
  environments,
  events,
  footer,
  footerLinks,
  heatmap,
  incident,
  navGroups as mockNavGroups,
  nodeCells,
  nodeTable,
  pageContext,
  regions,
  requestSeries,
  requestTable,
  rollouts,
  stats,
  topBar,
  topEndpoints,
  topEndpointsTable,
  workspace,
} from '@/lib/mock-dashboard'
import { useLiveEvents } from '@/lib/use-live-events'

// Every control on this page is inert: buttons call no-ops, and only the environment select, the
// table tabs and the pager hold local state so they respond.
const noop = () => {}

const navGroups: NavGroup[] = mockNavGroups.map((group) => ({
  ...group,
  items: group.items.map(({ icon: Icon, ...item }) => ({ ...item, icon: <Icon /> })),
}))

const thousands = (n: number) => `${(n / 1000).toFixed(1)}k`

/** A grid cell of the 12-column layout: one column below `md`, then the span for the slot. */
const Slot = styled('div', {
  base: { display: 'grid', minW: '0' },
  variants: {
    span: {
      full: { gridColumn: { md: 'span 12' } },
      // StatCard renders only Card.Body, which has no top padding; restore the card's inset here
      // until the library pads it.
      stat: { gridColumn: { md: 'span 6', lg: 'span 3' }, '& .card__body': { pt: '6' } },
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
}: {
  title: string
  caption?: string
  children: ReactNode
}) {
  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
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

function LiveEventStream() {
  const live = useLiveEvents(events)
  return (
    // The stream keeps the newest 20; the list scrolls inside the card rather than growing the row.
    <Box
      role="group"
      aria-label="Events, newest first"
      tabIndex={0}
      maxH="72"
      overflowY="auto"
      outline="none"
      focusVisibleRing="outside"
    >
      <EventStream events={live} live />
    </Box>
  )
}

function UserBlock() {
  return (
    <HStack gap="2.5" px="2.5" py="2">
      {/* The name follows in text, so the initials are decorative. */}
      <Avatar.Root size="xs" aria-hidden="true">
        <Avatar.Fallback>{topBar.account.initials}</Avatar.Fallback>
      </Avatar.Root>
      <Stack gap="0" minW="0">
        <Text textStyle="sm" fontWeight="medium" truncate>
          {topBar.account.name}
        </Text>
        <Text textStyle="xs" color="fg.muted" truncate>
          {workspace}
        </Text>
      </Stack>
    </HStack>
  )
}

export function DashboardDemo() {
  const [environment, setEnvironment] = useState('prod-us-east')

  return (
    <AppShell
      topBar={
        <TopBar
          {...topBar}
          brand={{ ...topBar.brand, logo: <BrandMark letter="K" /> }}
          environment={{ options: environments, value: environment, onChange: setEnvironment }}
          actions={
            // The page header repeats it as the primary action, so this one stays quiet and
            // gives the search field its room below `lg`.
            <Button variant="outline" size="sm" hideBelow="lg" onClick={noop}>
              <PlusIcon />
              New deployment
            </Button>
          }
        />
      }
      sideNav={<SideNav groups={navGroups} linkComponent={NextLink} footer={<UserBlock />} />}
      footer={<PageFooter {...footer} links={footerLinks} />}
    >
      <Stack gap="6">
        <PageHeader
          title="Overview"
          context={pageContext.map((part) => (
            <span key={part}>{part}</span>
          ))}
          actions={
            <>
              <Button variant="outline" size="sm" onClick={noop}>
                Last 24 h
                <ChevronDownIcon />
              </Button>
              <Button variant="outline" size="sm" onClick={noop}>
                <RefreshCwIcon />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={noop}>
                <Share2Icon />
                Share
              </Button>
              <Button size="sm" onClick={noop}>
                <PlusIcon />
                New deployment
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
              <BarChart categories={deploymentDays} series={deploymentsByDay} stacked />
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
            <Panel title="Event stream" caption="Live">
              <LiveEventStream />
            </Panel>
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
    </AppShell>
  )
}
