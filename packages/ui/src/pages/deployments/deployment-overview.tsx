'use client'
import { type ReactNode, useId, useMemo, useState } from 'react'
import { Box, Grid, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Badge, Button, Card, Code, Heading, SegmentGroup, Text } from '../../components/ui'
import {
  type ConfigRef,
  type DeploymentResource,
  type DeploymentSummary,
  type HpaRef,
  type IngressRef,
  type PodRef,
  type PvcRef,
  type RelatedObjects,
  relativeAge,
  type ReplicaSetRef,
  type ServiceAccountRef,
  type ServiceRef,
} from '../../lib/kubernetes'
import { DataTable, type DataTableColumn, type StatusTone } from '../../widgets'
import { AgeCell, LabelChips, readyTone, ToneBar } from './cells'
import { CREATED_BY_ANNOTATION } from './helpers'

export interface DeploymentOverviewProps {
  deployment: DeploymentResource
  summary: DeploymentSummary
  /** The objects around the Deployment, derived by the host. */
  related: RelatedObjects
  /** "Now" for the ages (host-supplied, so server and client agree). */
  now: string
}

// --- Tiles -------------------------------------------------------------------------------------

interface TileProps {
  label: string
  value: string
  sub?: string
  bar?: { value: number; max: number; tone: StatusTone }
}

/** A summary tile: its label (which names it), a large value, an optional bar and a note. */
function Tile({ label, value, sub, bar }: TileProps) {
  const labelId = useId()
  return (
    <Card.Root variant="outline" role="group" aria-labelledby={labelId}>
      {/* Only a body, so it takes the top inset a header would otherwise give. */}
      <Card.Body gap="2" pt="6">
        <Text id={labelId} color="fg.muted" textStyle="sm">
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
        {bar ? <ToneBar value={bar.value} max={bar.max} tone={bar.tone} size="sm" /> : null}
        {sub ? (
          <Text textStyle="xs" color="fg.muted">
            {sub}
          </Text>
        ) : null}
      </Card.Body>
    </Card.Root>
  )
}

function rolloutNote(deployment: DeploymentResource, summary: DeploymentSummary, now: string) {
  if (summary.status === 'paused') return 'rollout paused'
  if (summary.status === 'progressing') return 'rolling out…'
  if (summary.status === 'degraded') return 'rollout degraded'
  const done = deployment.status?.conditions?.find(
    (c) => c.type === 'Progressing' && c.reason === 'NewReplicaSetAvailable',
  )
  return done?.lastTransitionTime
    ? `rollout complete ${relativeAge(done.lastTransitionTime, now)} ago`
    : 'rollout complete'
}

/** An image's tag ("2.14.0"), its short digest, or "latest" when it names neither. */
export function imageTag(image: string): string {
  const at = image.indexOf('@')
  if (at >= 0) return image.slice(at + 1, at + 1 + 'sha256:'.length + 7)
  const name = image.slice(image.lastIndexOf('/') + 1)
  const colon = name.lastIndexOf(':')
  return colon >= 0 ? name.slice(colon + 1) : 'latest'
}

function imageNote(images: string[]): string | undefined {
  if (images.length === 0) return undefined
  return images.length === 1 ? `image ${imageTag(images[0]!)}` : `${images.length} images`
}

// --- Details -----------------------------------------------------------------------------------

function DetailItem({ term, children }: { term: string; children: ReactNode }) {
  return (
    <Stack gap="1" minW="0">
      <styled.dt textStyle="xs" color="fg.muted" fontWeight="medium">
        {term}
      </styled.dt>
      <styled.dd textStyle="sm" minW="0" overflowWrap="anywhere">
        {children}
      </styled.dd>
    </Stack>
  )
}

function None() {
  return (
    <Text as="span" color="fg.subtle">
      None
    </Text>
  )
}

function strategyText(strategy: DeploymentResource['spec']['strategy']): string {
  if (strategy?.type === 'Recreate') return 'Recreate'
  const rolling = strategy?.rollingUpdate
  // Kubernetes' defaults: max surge / max unavailable.
  return `RollingUpdate · ${rolling?.maxSurge ?? '25%'} / ${rolling?.maxUnavailable ?? '25%'}`
}

function Annotations({ annotations }: { annotations: Record<string, string> }) {
  const [open, setOpen] = useState(false)
  const blockId = useId()
  const entries = Object.entries(annotations)
  if (entries.length === 0) return <None />
  return (
    <Stack gap="2" alignItems="flex-start">
      <HStack gap="1">
        <Text as="span">{`(${entries.length})`}</Text>
        <Text as="span" color="fg.subtle" aria-hidden="true">
          ·
        </Text>
        <Button
          variant="plain"
          size="xs"
          px="1"
          aria-expanded={open}
          aria-controls={open ? blockId : undefined}
          aria-label={open ? 'Hide annotations' : 'Show annotations'}
          onClick={() => setOpen(!open)}
        >
          {open ? 'hide' : 'show'}
        </Button>
      </HStack>
      {open ? (
        <Code
          id={blockId}
          size="sm"
          display="block"
          h="auto"
          maxW="full"
          p="2"
          lineHeight="normal"
          whiteSpace="pre-wrap"
          overflowWrap="anywhere"
        >
          {entries.map(([key, value]) => `${key}: ${value}`).join('\n')}
        </Code>
      ) : null}
    </Stack>
  )
}

// --- Tables ------------------------------------------------------------------------------------

type Condition = NonNullable<NonNullable<DeploymentResource['status']>['conditions']>[number]
type ConditionRow = Condition & { id: string }

function TrueFalseBadge({ status }: { status: Condition['status'] }) {
  return (
    <Badge
      variant="subtle"
      colorPalette={status === 'True' ? 'green' : status === 'False' ? 'red' : 'gray'}
    >
      {status}
    </Badge>
  )
}

function conditionColumns(now: string): DataTableColumn<ConditionRow>[] {
  return [
    { id: 'type', header: 'Type', accessor: (c) => c.type },
    {
      id: 'status',
      header: 'Status',
      accessor: (c) => c.status,
      cell: (c) => <TrueFalseBadge status={c.status} />,
    },
    {
      id: 'reason',
      header: 'Reason',
      accessor: (c) => c.reason,
      cell: (c) => (
        <Stack gap="0.5" minW="48">
          <Text as="span">{c.reason ?? '—'}</Text>
          {c.message ? (
            <Text as="span" textStyle="xs" color="fg.muted" whiteSpace="normal">
              {c.message}
            </Text>
          ) : null}
        </Stack>
      ),
    },
    {
      id: 'lastTransition',
      header: 'Last transition',
      accessor: (c) => c.lastTransitionTime,
      cell: (c) => <AgeCell from={c.lastTransitionTime ?? ''} now={now} />,
    },
  ]
}

type WithId<T> = T & { id: string }

/** Rows for a `DataTable`: names can repeat across kinds' fields, so the position keeps ids unique. */
function withIds<T extends { name: string }>(items: T[]): WithId<T>[] {
  return items.map((item, index) => ({ ...item, id: `${index}:${item.name}` }))
}

const joined = (values: string[]) => (values.length > 0 ? values.join(', ') : '—')

function podColumns(now: string): DataTableColumn<WithId<PodRef>>[] {
  return [
    { id: 'name', header: 'Name', accessor: (pod) => pod.name },
    {
      id: 'status',
      header: 'Status',
      accessor: (pod) => pod.phase,
      cell: (pod) => (
        <Badge
          variant="subtle"
          colorPalette={
            pod.phase === 'Running'
              ? 'green'
              : pod.phase === 'Pending'
                ? 'amber'
                : pod.phase === 'Failed'
                  ? 'red'
                  : pod.phase === 'Succeeded'
                    ? 'blue'
                    : 'gray'
          }
        >
          {pod.phase}
        </Badge>
      ),
    },
    { id: 'restarts', header: 'Restarts', accessor: (pod) => pod.restarts, align: 'end' },
    { id: 'node', header: 'Node', accessor: (pod) => pod.node ?? '—' },
    {
      id: 'age',
      header: 'Age',
      accessor: (pod) => pod.createdAt,
      cell: (pod) => <AgeCell from={pod.createdAt} now={now} />,
    },
  ]
}

function replicaSetColumns(now: string): DataTableColumn<WithId<ReplicaSetRef>>[] {
  return [
    { id: 'name', header: 'Name', accessor: (rs) => rs.name },
    { id: 'desired', header: 'Desired', accessor: (rs) => rs.desired, align: 'end' },
    { id: 'ready', header: 'Ready', accessor: (rs) => rs.ready, align: 'end' },
    {
      id: 'age',
      header: 'Age',
      accessor: (rs) => rs.createdAt,
      cell: (rs) => <AgeCell from={rs.createdAt} now={now} />,
    },
    {
      id: 'current',
      header: 'Current',
      accessor: (rs) => rs.current,
      cell: (rs) =>
        rs.current ? (
          <Badge variant="subtle" colorPalette="green">
            Current
          </Badge>
        ) : (
          <Text as="span" color="fg.subtle">
            Old
          </Text>
        ),
    },
  ]
}

const serviceColumns: DataTableColumn<WithId<ServiceRef>>[] = [
  { id: 'name', header: 'Name', accessor: (s) => s.name },
  { id: 'type', header: 'Type', accessor: (s) => s.type },
  {
    id: 'clusterIP',
    header: 'Cluster IP',
    accessor: (s) => s.clusterIP,
    cell: (s) => (
      <Text as="span" fontFamily="mono" textStyle="sm">
        {s.clusterIP ?? '—'}
      </Text>
    ),
  },
  { id: 'ports', header: 'Ports', sortable: false, accessor: (s) => joined(s.ports) },
]

const ingressColumns: DataTableColumn<WithId<IngressRef>>[] = [
  { id: 'name', header: 'Name', accessor: (i) => i.name },
  { id: 'host', header: 'Host', accessor: (i) => i.host },
  { id: 'path', header: 'Path', accessor: (i) => i.path },
  { id: 'service', header: 'Service', accessor: (i) => i.service },
]

const configColumns: DataTableColumn<WithId<ConfigRef>>[] = [
  { id: 'name', header: 'Name', accessor: (c) => c.name },
  { id: 'usedAs', header: 'Used as', sortable: false, accessor: (c) => joined(c.usedAs) },
  { id: 'keys', header: 'Keys', accessor: (c) => c.keys, align: 'end' },
]

const pvcColumns: DataTableColumn<WithId<PvcRef>>[] = [
  { id: 'name', header: 'Name', accessor: (p) => p.name },
  {
    id: 'status',
    header: 'Status',
    accessor: (p) => p.status,
    cell: (p) => (
      <Badge
        variant="subtle"
        colorPalette={p.status === 'Bound' ? 'green' : p.status === 'Pending' ? 'amber' : 'red'}
      >
        {p.status}
      </Badge>
    ),
  },
  { id: 'capacity', header: 'Capacity', accessor: (p) => p.capacity ?? '—' },
  { id: 'storageClass', header: 'Storage class', accessor: (p) => p.storageClass ?? '—' },
]

const hpaColumns: DataTableColumn<WithId<HpaRef>>[] = [
  { id: 'name', header: 'Name', accessor: (h) => h.name },
  { id: 'min', header: 'Min', accessor: (h) => h.min, align: 'end' },
  { id: 'max', header: 'Max', accessor: (h) => h.max, align: 'end' },
  { id: 'target', header: 'Target', accessor: (h) => h.target },
  { id: 'current', header: 'Current', accessor: (h) => h.current },
]

const serviceAccountColumns: DataTableColumn<WithId<ServiceAccountRef>>[] = [
  { id: 'name', header: 'Name', accessor: (sa) => sa.name },
  { id: 'secrets', header: 'Secrets', accessor: (sa) => sa.secrets, align: 'end' },
  { id: 'roles', header: 'Roles', sortable: false, accessor: (sa) => joined(sa.roles) },
]

type KindId =
  | 'pods'
  | 'replicaSets'
  | 'services'
  | 'ingresses'
  | 'configMaps'
  | 'secrets'
  | 'pvcs'
  | 'hpa'
  | 'serviceAccount'

/** The kinds in the segment order, with the nouns their table counts and empty state use. */
const KINDS: { id: KindId; label: string; entity: { singular: string; plural: string } }[] = [
  { id: 'pods', label: 'Pods', entity: { singular: 'pod', plural: 'pods' } },
  {
    id: 'replicaSets',
    label: 'ReplicaSets',
    entity: { singular: 'ReplicaSet', plural: 'ReplicaSets' },
  },
  { id: 'services', label: 'Services', entity: { singular: 'Service', plural: 'Services' } },
  { id: 'ingresses', label: 'Ingresses', entity: { singular: 'Ingress', plural: 'Ingresses' } },
  {
    id: 'configMaps',
    label: 'ConfigMaps',
    entity: { singular: 'ConfigMap', plural: 'ConfigMaps' },
  },
  { id: 'secrets', label: 'Secrets', entity: { singular: 'Secret', plural: 'Secrets' } },
  { id: 'pvcs', label: 'PVCs', entity: { singular: 'PVC', plural: 'PVCs' } },
  { id: 'hpa', label: 'HPA', entity: { singular: 'HPA', plural: 'HPAs' } },
  {
    id: 'serviceAccount',
    label: 'Service account',
    entity: { singular: 'service account', plural: 'service accounts' },
  },
]

function KindTable<T extends { id: string }>({
  entity,
  columns,
  rows,
}: {
  entity: { singular: string; plural: string }
  columns: DataTableColumn<T>[]
  rows: T[]
}) {
  return (
    <DataTable
      entity={entity}
      columns={columns}
      rows={rows}
      emptyMessage={`No ${entity.plural} are related to this Deployment`}
    />
  )
}

function RelatedObjectsCard({ related, now }: { related: RelatedObjects; now: string }) {
  const headingId = useId()
  const [kind, setKind] = useState<KindId>('pods')
  const pods = useMemo(() => podColumns(now), [now])
  const replicaSets = useMemo(() => replicaSetColumns(now), [now])
  const rows = useMemo(
    () => ({
      pods: withIds(related.pods),
      replicaSets: withIds(related.replicaSets),
      services: withIds(related.services),
      ingresses: withIds(related.ingresses),
      configMaps: withIds(related.configMaps),
      secrets: withIds(related.secrets),
      pvcs: withIds(related.pvcs),
      hpa: withIds(related.hpa ? [related.hpa] : []),
      serviceAccount: withIds(related.serviceAccount ? [related.serviceAccount] : []),
    }),
    [related],
  )
  const items = useMemo(
    () => KINDS.map((k) => ({ value: k.id, label: `${k.label} ${rows[k.id].length}` })),
    [rows],
  )
  const entity = KINDS.find((k) => k.id === kind)!.entity

  // One table per kind, remounted on a switch so each starts at its own first page.
  let table: ReactNode
  switch (kind) {
    case 'pods':
      table = <KindTable key={kind} entity={entity} columns={pods} rows={rows.pods} />
      break
    case 'replicaSets':
      table = <KindTable key={kind} entity={entity} columns={replicaSets} rows={rows.replicaSets} />
      break
    case 'services':
      table = <KindTable key={kind} entity={entity} columns={serviceColumns} rows={rows.services} />
      break
    case 'ingresses':
      table = (
        <KindTable key={kind} entity={entity} columns={ingressColumns} rows={rows.ingresses} />
      )
      break
    case 'configMaps':
    case 'secrets':
      table = <KindTable key={kind} entity={entity} columns={configColumns} rows={rows[kind]} />
      break
    case 'pvcs':
      table = <KindTable key={kind} entity={entity} columns={pvcColumns} rows={rows.pvcs} />
      break
    case 'hpa':
      table = <KindTable key={kind} entity={entity} columns={hpaColumns} rows={rows.hpa} />
      break
    case 'serviceAccount':
      table = (
        <KindTable
          key={kind}
          entity={entity}
          columns={serviceAccountColumns}
          rows={rows.serviceAccount}
        />
      )
      break
  }

  return (
    <Card.Root variant="outline" as="section" aria-labelledby={headingId}>
      <Card.Header>
        <HStack justify="space-between" alignItems="center" flexWrap="wrap" gap="3">
          <Heading as="h2" id={headingId} textStyle="md" fontWeight="semibold">
            Related objects
          </Heading>
          {/* Nine kinds: the strip scrolls sideways when the card is narrower. */}
          <Box overflowX="auto" maxW="full" py="0.5">
            <SegmentGroup.Root
              size="sm"
              value={kind}
              onValueChange={(details) => setKind((details.value as KindId | null) ?? 'pods')}
            >
              <SegmentGroup.Label srOnly>Kind</SegmentGroup.Label>
              <SegmentGroup.Indicator />
              <SegmentGroup.Items items={items} whiteSpace="nowrap" />
            </SegmentGroup.Root>
          </Box>
        </HStack>
      </Card.Header>
      <Card.Body>{table}</Card.Body>
    </Card.Root>
  )
}

// --- Overview ----------------------------------------------------------------------------------

/**
 * A Deployment's Overview tab: three tiles (Ready with a bar, Updated · Available with the rollout,
 * Restarts with the image), a details card (labels, annotations, selector, strategy, replicas,
 * images, service account, node selector, created), the conditions and one Related objects card
 * whose segments switch the table between the kinds around the Deployment.
 */
export function DeploymentOverview({ deployment, summary, related, now }: DeploymentOverviewProps) {
  const conditionsId = useId()
  const { metadata, spec } = deployment
  const podSpec = spec.template.spec
  const images = podSpec.containers.map((container) => container.image)
  const restarts = related.pods.reduce((sum, pod) => sum + pod.restarts, 0)
  const creator = metadata.annotations?.[CREATED_BY_ANNOTATION]
  const selector = Object.entries(spec.selector.matchLabels ?? {}).map(([k, v]) => `${k}=${v}`)

  const conditionRows = useMemo<ConditionRow[]>(
    () => (deployment.status?.conditions ?? []).map((c) => ({ ...c, id: c.type })),
    [deployment.status?.conditions],
  )
  const conditionCols = useMemo(() => conditionColumns(now), [now])

  return (
    <Stack gap="6">
      <Grid columns={{ base: 1, md: 3 }} gap="4">
        <Tile
          label="Ready"
          value={`${summary.ready} / ${summary.desired}`}
          bar={{
            value: summary.ready,
            max: summary.desired,
            tone: readyTone(summary.ready, summary.desired, summary.status),
          }}
        />
        <Tile
          label="Updated · Available"
          value={`${summary.updated} · ${summary.available}`}
          sub={rolloutNote(deployment, summary, now)}
        />
        <Tile label="Restarts" value={String(restarts)} sub={imageNote(images)} />
      </Grid>

      <Card.Root variant="outline">
        <Card.Header>
          <Card.Title as="h2" textStyle="md">
            Details
          </Card.Title>
        </Card.Header>
        <Card.Body>
          <styled.dl
            display="grid"
            gridTemplateColumns={{ base: '1fr', md: 'repeat(2, minmax(0, 1fr))' }}
            columnGap="8"
            rowGap="4"
          >
            <DetailItem term="Labels">
              <LabelChips labels={metadata.labels ?? {}} max={6} />
            </DetailItem>
            <DetailItem term="Annotations">
              <Annotations annotations={metadata.annotations ?? {}} />
            </DetailItem>
            <DetailItem term="Selector">
              {selector.length > 0 ? (
                <Text as="span" fontFamily="mono" textStyle="sm">
                  {selector.join(', ')}
                </Text>
              ) : (
                <None />
              )}
            </DetailItem>
            <DetailItem term="Strategy">{strategyText(spec.strategy)}</DetailItem>
            <DetailItem term="Replicas">
              {`${summary.desired} desired · ${summary.updated} updated · ${summary.available} available`}
            </DetailItem>
            <DetailItem term={images.length === 1 ? 'Image' : 'Images'}>
              {images.length > 0 ? (
                <Stack gap="1" alignItems="flex-start">
                  {images.map((image, index) => (
                    <Code
                      key={`${index}:${image}`}
                      size="sm"
                      h="auto"
                      maxW="full"
                      py="0.5"
                      lineHeight="normal"
                      overflowWrap="anywhere"
                    >
                      {image}
                    </Code>
                  ))}
                </Stack>
              ) : (
                <None />
              )}
            </DetailItem>
            <DetailItem term="Service account">
              {podSpec.serviceAccountName ?? 'default'}
            </DetailItem>
            <DetailItem term="Node selector">
              <LabelChips labels={podSpec.nodeSelector ?? {}} max={6} />
            </DetailItem>
            <DetailItem term="Created">
              {metadata.creationTimestamp ? (
                <>
                  <styled.time dateTime={metadata.creationTimestamp}>
                    {`${relativeAge(metadata.creationTimestamp, now)} ago`}
                  </styled.time>
                  {creator ? ` by ${creator}` : null}
                </>
              ) : (
                '—'
              )}
            </DetailItem>
          </styled.dl>
        </Card.Body>
      </Card.Root>

      <styled.section aria-labelledby={conditionsId} display="flex" flexDirection="column" gap="3">
        <Heading as="h2" id={conditionsId} textStyle="md" fontWeight="semibold">
          Conditions
        </Heading>
        <DataTable
          entity={{ singular: 'condition', plural: 'conditions' }}
          columns={conditionCols}
          rows={conditionRows}
          emptyMessage="No conditions reported yet"
        />
      </styled.section>

      <RelatedObjectsCard related={related} now={now} />
    </Stack>
  )
}
