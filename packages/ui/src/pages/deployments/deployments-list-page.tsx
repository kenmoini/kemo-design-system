'use client'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { Box, Stack } from '../../../styled-system/jsx'
import { Button, Link, Text } from '../../components/ui'
import { PageHeader } from '../../layouts/app-shell'
import type { ClusterOption, DeploymentSummary, ScopeValue } from '../../lib/kubernetes'
import {
  type ActionItem,
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableFilterValues,
} from '../../widgets'
import { ConfirmDialog } from '../access'
import type { LinkComponent } from '../auth/types'
import {
  AgeCell,
  DeploymentStatusBadge,
  deploymentStatusOptions,
  LabelChips,
  ReadyCell,
} from './cells'
import { scopedNamespaces } from './helpers'
import { ScaleDialog } from './scale-dialog'
import { ScopeBar } from './scope-bar'

export interface DeploymentsListPageProps {
  /** The chosen clusters and namespaces; `[]` means "All". The host persists it. */
  scope: ScopeValue
  onScopeChange: (scope: ScopeValue) => void
  clusters: ClusterOption[]
  /** The Deployments in `scope`: the host narrows them, the page names the scope. */
  rows: DeploymentSummary[]
  /** "Now" for the ages (host-supplied, so server and client agree). */
  now: string
  /** A row's detail page; its YAML tab is `{detailHref(row)}/yaml`. Keep it stable. */
  detailHref: (row: DeploymentSummary) => string
  /** The "+ Create deployment" link. */
  createHref: string
  /** The host's link (Next's `Link`, say); defaults to a plain anchor. */
  linkComponent?: LinkComponent
  /** Scale… on a row. */
  onScale: (id: string, replicas: number) => void | Promise<void>
  onRestart: (ids: string[]) => void
  onSetPaused: (ids: string[], paused: boolean) => void
  onDelete: (ids: string[]) => void
  /** The selected row ids; omit it to let the table hold the selection. */
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
}

const entity = { singular: 'deployment', plural: 'deployments' }
const count = (n: number) => `${n} ${n === 1 ? entity.singular : entity.plural}`
const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

const search = {
  keys: [
    (row: DeploymentSummary) => row.name,
    (row: DeploymentSummary) => row.namespace,
    (row: DeploymentSummary) => row.images.join(' '),
  ],
}

function columnsFor(
  now: string,
  detailHref: (row: DeploymentSummary) => string,
  HostLink: LinkComponent | undefined,
): DataTableColumn<DeploymentSummary>[] {
  return [
    {
      id: 'name',
      header: 'Name',
      accessor: (row) => row.name,
      cell: (row) => (
        <Stack gap="0.5" minW="0">
          {HostLink ? (
            <Link asChild variant="plain">
              <HostLink href={detailHref(row)}>{row.name}</HostLink>
            </Link>
          ) : (
            <Link href={detailHref(row)} variant="plain">
              {row.name}
            </Link>
          )}
          <Text as="span" textStyle="xs" color="fg.muted">
            {`${row.cluster} · ${row.namespace}`}
          </Text>
        </Stack>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      accessor: (row) => row.status,
      cell: (row) => <DeploymentStatusBadge status={row.status} />,
    },
    {
      id: 'ready',
      header: 'Ready',
      // The ratio sorts; a Deployment scaled to zero counts as complete.
      accessor: (row) => (row.desired > 0 ? row.ready / row.desired : 1),
      cell: (row) => <ReadyCell ready={row.ready} desired={row.desired} status={row.status} />,
    },
    {
      id: 'labels',
      header: 'Labels',
      cell: (row) => <LabelChips labels={row.labels} />,
    },
    {
      id: 'age',
      header: 'Age',
      accessor: (row) => row.createdAt,
      cell: (row) => <AgeCell from={row.createdAt} now={now} />,
    },
  ]
}

function filtersFor(namespaces: string[]): DataTableFilter<DeploymentSummary>[] {
  return [
    {
      id: 'status',
      label: 'Status',
      kind: 'checkbox',
      accessor: (row) => row.status,
      options: deploymentStatusOptions,
    },
    {
      id: 'labels',
      label: 'Labels',
      kind: 'tags',
      accessor: (row) => Object.entries(row.labels).map(([key, value]) => `${key}=${value}`),
      placeholder: 'key=value…',
    },
    {
      id: 'namespace',
      label: 'Namespace',
      kind: 'select',
      accessor: (row) => row.namespace,
      options: namespaces.map((namespace) => ({ value: namespace, label: namespace })),
      allLabel: 'All',
    },
  ]
}

type Confirmation = {
  title: string
  description: ReactNode
  confirmLabel: string
  tone: 'danger' | 'default'
  onConfirm: () => void
}

type View = { kind: 'scale'; row: DeploymentSummary } | ({ kind: 'confirm' } & Confirmation)

interface DialogState {
  open: boolean
  /** Kept after closing, so the dialog keeps its content while it animates out. */
  view: View | null
}

/**
 * The Deployments list: the page header with "+ Create deployment", the scope pickers, then a
 * `DataTable` of the scoped rows (name and where it runs, status, ready, labels, age) with a filter
 * rail (search, Status, Labels `key=value`, Namespace), per-row actions (Scale…, Restart,
 * Pause|Resume, Edit YAML, Delete) and bulk Restart, Pause, Resume and Delete, each confirmed. The
 * toolbar's count line names the scope; a Namespace filter outside a new scope is cleared.
 */
export function DeploymentsListPage({
  scope,
  onScopeChange,
  clusters,
  rows,
  now,
  detailHref,
  createHref,
  linkComponent: HostLink,
  onScale,
  onRestart,
  onSetPaused,
  onDelete,
  selectedIds,
  onSelectionChange,
}: DeploymentsListPageProps) {
  const [dialog, setDialog] = useState<DialogState>({ open: false, view: null })
  const show = (view: View) => setDialog({ open: true, view })
  const close = () => setDialog((current) => ({ ...current, open: false }))
  const confirm = (confirmation: Confirmation) => show({ kind: 'confirm', ...confirmation })

  // A host-held selection without the ids whose rows left `rows` (the scope narrowed, say).
  const selection = useMemo(() => {
    if (!selectedIds) return undefined
    const ids = new Set(rows.map((row) => row.id))
    const kept = selectedIds.filter((id) => ids.has(id))
    return kept.length === selectedIds.length ? selectedIds : kept
  }, [selectedIds, rows])

  // The namespaces the scope covers: the chosen ones, else those of the chosen (or all) clusters.
  const inScope = useMemo(
    () =>
      scope.namespaces.length > 0 ? scope.namespaces : scopedNamespaces(clusters, scope.clusters),
    [scope.namespaces, scope.clusters, clusters],
  )

  // The table's filters, held here so a Namespace value that leaves the scope can be cleared.
  const [filterValues, setFilterValues] = useState<DataTableFilterValues>({})
  const namespaceFilter = filterValues.namespace
  const staleNamespace = typeof namespaceFilter === 'string' && !inScope.includes(namespaceFilter)
  // The table never sees a stale value; the effect then drops it from the state.
  const shownFilterValues = useMemo(() => {
    if (!staleNamespace) return filterValues
    const rest = { ...filterValues }
    delete rest.namespace
    return rest
  }, [filterValues, staleNamespace])
  useEffect(() => {
    if (staleNamespace) setFilterValues(shownFilterValues)
  }, [staleNamespace, shownFilterValues])

  // The Namespace options are the namespaces present in the rows, plus the chosen one while it has
  // no rows left (its last Deployment deleted), so the select still shows it. Keyed by their text
  // so a new `rows` array with the same namespaces keeps the filters (and the columns) stable.
  const shownNamespace = shownFilterValues.namespace
  const namespaceKey = useMemo(() => {
    const namespaces = new Set(rows.map((row) => row.namespace))
    if (typeof shownNamespace === 'string') namespaces.add(shownNamespace)
    return [...namespaces].sort().join('\n')
  }, [rows, shownNamespace])
  const filters = useMemo(
    () => filtersFor(namespaceKey ? namespaceKey.split('\n') : []),
    [namespaceKey],
  )
  const columns = useMemo(() => columnsFor(now, detailHref, HostLink), [now, detailHref, HostLink])

  // A dialog hands focus back to what had it; when that is gone (a deleted row's menu), to the table.
  const regionRef = useRef<HTMLDivElement>(null)
  const lastFocusRef = useRef<HTMLElement | null>(null)
  const returnFocus = () => {
    const last = lastFocusRef.current
    return last?.isConnected ? last : regionRef.current
  }

  const rowActions = (row: DeploymentSummary): ActionItem[] => [
    { id: 'scale', label: 'Scale…', onSelect: () => show({ kind: 'scale', row }) },
    {
      id: 'restart',
      label: 'Restart',
      onSelect: () =>
        confirm({
          title: `Restart ${row.name}?`,
          description: 'A rolling restart replaces every pod.',
          confirmLabel: 'Restart',
          tone: 'default',
          onConfirm: () => onRestart([row.id]),
        }),
    },
    {
      id: 'pause',
      label: row.paused ? 'Resume' : 'Pause',
      onSelect: () => onSetPaused([row.id], !row.paused),
    },
    { id: 'edit-yaml', label: 'Edit YAML', href: `${detailHref(row)}/yaml` },
    {
      id: 'delete',
      label: 'Delete',
      tone: 'danger',
      onSelect: () =>
        confirm({
          title: `Delete ${row.name}?`,
          description: "This can't be undone.",
          confirmLabel: 'Delete',
          tone: 'danger',
          onConfirm: () => onDelete([row.id]),
        }),
    },
  ]

  const bulkActions = (selected: DeploymentSummary[]): ActionItem[] => {
    const ids = selected.map((row) => row.id)
    const running = selected.filter((row) => !row.paused)
    const paused = selected.filter((row) => row.paused)
    // Pause skips the rows already paused, Resume those not paused; the confirm says how many.
    const pauseConfirm = (pause: boolean) => {
      const acting = pause ? running : paused
      const skipped = selected.length - acting.length
      const verb = pause ? 'Pause' : 'Resume'
      confirm({
        title: `${verb} ${count(selected.length)}?`,
        description:
          skipped > 0
            ? `${selected.length} selected; ${skipped} ${pause ? 'already paused' : 'not paused'} will be skipped.`
            : pause
              ? 'Their rollouts stop until you resume them.'
              : 'Their rollouts carry on from where they stopped.',
        confirmLabel: verb,
        tone: 'default',
        onConfirm: () =>
          onSetPaused(
            acting.map((row) => row.id),
            pause,
          ),
      })
    }
    return [
      {
        id: 'restart',
        label: 'Restart',
        onSelect: () =>
          confirm({
            title: `Restart ${count(selected.length)}?`,
            description: 'A rolling restart replaces every pod.',
            confirmLabel: 'Restart',
            tone: 'default',
            onConfirm: () => onRestart(ids),
          }),
      },
      {
        id: 'pause',
        label: 'Pause',
        disabled: running.length === 0,
        onSelect: () => pauseConfirm(true),
      },
      {
        id: 'resume',
        label: 'Resume',
        disabled: paused.length === 0,
        onSelect: () => pauseConfirm(false),
      },
      {
        id: 'delete',
        label: 'Delete',
        tone: 'danger',
        onSelect: () =>
          confirm({
            title: `Delete ${count(selected.length)}?`,
            description: "This can't be undone.",
            confirmLabel: 'Delete',
            tone: 'danger',
            onConfirm: () => onDelete(ids),
          }),
      },
    ]
  }

  // One line names the count (of the rows the filters keep) and the scope.
  const clusterText = plural(scope.clusters.length || clusters.length, 'cluster', 'clusters')
  const namespaceText =
    scope.namespaces.length > 0
      ? plural(scope.namespaces.length, 'namespace', 'namespaces')
      : 'all namespaces'
  const countLabel = (n: number) => `${count(n)} in ${clusterText} · ${namespaceText}`

  const view = dialog.view
  return (
    <Stack gap="6">
      <PageHeader
        title="Deployments"
        context="apps/v1 Deployments across the clusters you can see"
        actions={
          // Without a host link, a bare anchor: Park's `Link` recipe would override the button's.
          <Button asChild variant="solid">
            {HostLink ? (
              <HostLink href={createHref}>+ Create deployment</HostLink>
            ) : (
              <a href={createHref}>+ Create deployment</a>
            )}
          </Button>
        }
      />
      <ScopeBar clusters={clusters} value={scope} onChange={onScopeChange} />
      <Box
        ref={regionRef}
        role="region"
        aria-label="Deployments table"
        tabIndex={-1}
        outline="none"
        onFocus={(event) => {
          lastFocusRef.current = event.target
        }}
      >
        <DataTable
          entity={entity}
          columns={columns}
          rows={rows}
          filters={filters}
          filterValues={shownFilterValues}
          onFilterValuesChange={setFilterValues}
          search={search}
          selectable
          selectedIds={selection}
          onSelectionChange={onSelectionChange}
          rowActions={rowActions}
          bulkActions={bulkActions}
          linkComponent={HostLink}
          countLabel={countLabel}
          initialSort={{ id: 'name' }}
          emptyMessage="No deployments in this scope"
        />
      </Box>
      <ScaleDialog
        open={dialog.open && view?.kind === 'scale'}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        name={view?.kind === 'scale' ? view.row.name : ''}
        replicas={view?.kind === 'scale' ? view.row.desired : 0}
        finalFocusEl={returnFocus}
        onConfirm={(replicas) => {
          if (view?.kind === 'scale') return onScale(view.row.id, replicas)
        }}
      />
      <ConfirmDialog
        open={dialog.open && view?.kind === 'confirm'}
        onOpenChange={(open) => {
          if (!open) close()
        }}
        title={view?.kind === 'confirm' ? view.title : ''}
        description={view?.kind === 'confirm' ? view.description : ''}
        confirmLabel={view?.kind === 'confirm' ? view.confirmLabel : ''}
        tone={view?.kind === 'confirm' ? view.tone : 'default'}
        finalFocusEl={returnFocus}
        onConfirm={() => {
          if (view?.kind === 'confirm') view.onConfirm()
        }}
      />
    </Stack>
  )
}
