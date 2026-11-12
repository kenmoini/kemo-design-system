'use client'
import { useState } from 'react'
import { Button } from '../../components/ui'
import {
  cleanYaml,
  type DeploymentResource,
  type DeploymentSummary,
  type K8sEvent,
  type RelatedObjects,
} from '../../lib/kubernetes'
import { ConfirmDialog } from '../access'
import type { LinkComponent } from '../auth/types'
import { ResourceDetailShell, ResourceEventsTab, ResourceYamlTab } from '../resources'
import { resourceStatusFor } from './cells'
import { DeploymentOverview } from './deployment-overview'
import { ScaleDialog } from './scale-dialog'

export type DeploymentTab = 'overview' | 'yaml' | 'events'

const TABS: { id: DeploymentTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'yaml', label: 'YAML' },
  { id: 'events', label: 'Events' },
]

export interface DeploymentDetailPageProps {
  deployment: DeploymentResource
  cluster: string
  summary: DeploymentSummary
  /** The objects around the Deployment, derived by the host. */
  related: RelatedObjects
  /** The Deployment's events and its children's. */
  events: K8sEvent[]
  /** The events stream in as they happen. */
  liveEvents?: boolean
  /** The tab the route points at. */
  tab: DeploymentTab
  /** The URL of each tab. */
  tabHref: (tab: DeploymentTab) => string
  /** The Deployments list, for the breadcrumb. */
  listHref: string
  /** The host's link (Next's `Link`, say); defaults to a plain anchor. */
  linkComponent?: LinkComponent
  /** "Now" for the ages (host-supplied, so server and client agree). */
  now: string
  /** The JSON Schema the YAML tab lints, completes and browses with (`deploymentSchema`). */
  schema: object
  /** The server copy as YAML. */
  yamlText: string
  /** The host-owned edit of `yamlText`; `undefined` means no edits. */
  draft?: string
  /** Every edit, and `undefined` once the edits are saved, discarded or undone. */
  onDraftChange: (text?: string) => void
  /** Save: resolve once applied; a rejection keeps the draft and shows the error's message. */
  onSaveYaml: (text: string) => void | Promise<void>
  /** The server copy changed under the draft: the YAML tab says so. */
  serverChanged?: boolean
  /** The Events reader pauses (pointer or focus on the live table) or resumes the stream. */
  onEventsPauseChange?: (paused: boolean) => void
  /** Reload on the YAML tab: the host drops its draft and any "server changed" note. */
  onReloadYaml?: () => void
  /** Scale…: the summary's id and the new replica count. */
  onScale: (id: string, replicas: number) => void | Promise<void>
  onRestart: (ids: string[]) => void
  onSetPaused: (ids: string[], paused: boolean) => void
  onDelete: (ids: string[]) => void
}

type Dialog = 'scale' | 'restart' | 'delete' | null

/**
 * A Deployment's detail page: the generic `ResourceDetailShell` (Deployments › name, the status
 * badge, "{cluster} · {namespace} · apps/v1") with the Deployment's actions (Scale…, Restart,
 * Pause|Resume, Edit YAML, Delete) and three tabs: `DeploymentOverview`, the generic
 * `ResourceYamlTab` and `ResourceEventsTab`.
 */
export function DeploymentDetailPage({
  deployment,
  cluster,
  summary,
  related,
  events,
  liveEvents = false,
  tab,
  tabHref,
  listHref,
  linkComponent: HostLink,
  now,
  schema,
  yamlText,
  draft,
  onDraftChange,
  onSaveYaml,
  serverChanged,
  onEventsPauseChange,
  onReloadYaml,
  onScale,
  onRestart,
  onSetPaused,
  onDelete,
}: DeploymentDetailPageProps) {
  const [dialog, setDialog] = useState<Dialog>(null)
  const { name, namespace } = deployment.metadata
  const id = summary.id
  const yamlHref = tabHref('yaml')
  const onOpenChange = (open: boolean) => {
    if (!open) setDialog(null)
  }

  const actions = (
    <>
      <Button variant="outline" size="sm" onClick={() => setDialog('scale')}>
        Scale…
      </Button>
      <Button variant="outline" size="sm" onClick={() => setDialog('restart')}>
        Restart
      </Button>
      <Button variant="outline" size="sm" onClick={() => onSetPaused([id], !summary.paused)}>
        {summary.paused ? 'Resume' : 'Pause'}
      </Button>
      {/* Without a host link, a bare anchor: Park's `Link` recipe would override the button's. */}
      <Button asChild variant="outline" size="sm">
        {HostLink ? (
          <HostLink href={yamlHref}>Edit YAML</HostLink>
        ) : (
          <a href={yamlHref}>Edit YAML</a>
        )}
      </Button>
      <Button variant="outline" size="sm" colorPalette="red" onClick={() => setDialog('delete')}>
        Delete
      </Button>
    </>
  )

  return (
    <>
      <ResourceDetailShell
        breadcrumb={[{ label: 'Deployments', href: listHref }, { label: name }]}
        name={name}
        status={resourceStatusFor(summary.status)}
        context={`${cluster} · ${namespace} · apps/v1`}
        actions={actions}
        tabs={TABS}
        activeTab={tab}
        tabHref={(tabId) => tabHref(tabId as DeploymentTab)}
        linkComponent={HostLink}
      >
        {tab === 'overview' ? (
          <DeploymentOverview
            deployment={deployment}
            summary={summary}
            related={related}
            now={now}
          />
        ) : tab === 'yaml' ? (
          <ResourceYamlTab
            yamlText={yamlText}
            draft={draft}
            onDraftChange={onDraftChange}
            schema={schema}
            onSave={onSaveYaml}
            fileName={`${name}.yaml`}
            cleanText={() => cleanYaml(deployment)}
            serverChanged={serverChanged}
            onReload={onReloadYaml}
          />
        ) : (
          <ResourceEventsTab
            events={events}
            live={liveEvents}
            now={now}
            parentKind="Deployment"
            onPauseChange={onEventsPauseChange}
          />
        )}
      </ResourceDetailShell>
      <ScaleDialog
        open={dialog === 'scale'}
        onOpenChange={onOpenChange}
        name={name}
        replicas={summary.desired}
        onConfirm={(replicas) => onScale(id, replicas)}
      />
      <ConfirmDialog
        open={dialog === 'restart'}
        onOpenChange={onOpenChange}
        title={`Restart ${name}?`}
        description="A rolling restart replaces every pod."
        confirmLabel="Restart"
        tone="default"
        onConfirm={() => onRestart([id])}
      />
      <ConfirmDialog
        open={dialog === 'delete'}
        onOpenChange={onOpenChange}
        title={`Delete ${name}?`}
        description="This can't be undone."
        confirmLabel="Delete"
        tone="danger"
        onConfirm={() => onDelete([id])}
      />
    </>
  )
}
