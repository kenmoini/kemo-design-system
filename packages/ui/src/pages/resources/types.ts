import type { ReactNode } from 'react'
import type { K8sEvent } from '../../lib/kubernetes'
import type { LinkComponent } from '../auth/types'

/** The status next to a resource's name: the tone picks the badge colour, the label says it. */
export interface ResourceStatusBadge {
  tone: 'good' | 'warning' | 'critical' | 'off'
  label: string
}

/** One link in the detail page's tab strip. */
export interface ResourceTab {
  id: string
  label: string
}

export interface ResourceDetailShellProps {
  /** Up the tree to the resource, e.g. Deployments › checkout-api. Items with an `href` are links;
   * the last item is the current page. */
  breadcrumb: { label: string; href?: string }[]
  name: string
  status?: ResourceStatusBadge
  /** The muted line under the name, e.g. "{cluster} · {namespace} · apps/v1". */
  context: ReactNode
  /** The header's buttons (Scale…, Delete, …); they wrap on narrow screens. */
  actions?: ReactNode
  tabs: ResourceTab[]
  /** The tab the route points at; only its content is rendered. */
  activeTab: string
  /** The URL of each tab. */
  tabHref: (id: string) => string
  /** The host's link (Next's `Link`, say); defaults to a plain anchor. */
  linkComponent?: LinkComponent
  /** The active tab's content. */
  children: ReactNode
}

export interface ResourceYamlTabProps {
  /** The server copy. */
  yamlText: string
  /** The host-owned edit of `yamlText`; `undefined` means no edits, so switching tabs keeps them. */
  draft?: string
  /** Every edit, and `undefined` once the text matches the server copy again, a save resolves or
   * Reload discards the edits. */
  onDraftChange: (text: string | undefined) => void
  /** Any JSON Schema object (draft-07 style) for lint, hover, completion and the schema browser.
   * Keep it stable. Without one there is no Schema button. */
  schema?: object
  /** Save (Create in create mode): resolve once applied; a rejection keeps the draft and shows the
   * error's message. */
  onSave: (text: string) => void | Promise<void>
  /** Reload: replace the shown text with the latest server copy (it asks first when there are
   * edits, and clears the draft). */
  onReload?: () => void
  /** The name "Download YAML" saves under; "Download clean YAML" adds `.clean.yaml`. */
  fileName: string
  /** The text "Download clean YAML" saves. It receives the text the editor shows (the draft when
   * there is one), so the clean copy is of what the person sees: strip the server-managed fields
   * from it, and fall back to the server copy when it does not parse. */
  cleanText: (text: string) => string
  /** `create`: Save reads "Create" and is enabled whenever there is text. Default `edit`. */
  mode?: 'edit' | 'create'
  /** Create mode: shown above the editor (cluster and namespace pickers, say). */
  createControls?: ReactNode
  /** The server copy changed under the draft: the status line says so. */
  serverChanged?: boolean
}

export interface ResourceEventsTabProps {
  events: K8sEvent[]
  /** The events update as they happen: a streaming note, and the rows hold still for a reader. */
  live?: boolean
  /** "Now" for the Last seen ages (host-supplied, so server and client agree). */
  now: string
  /** The kind the page is about: it names the scope ("{kind} + children" / "{kind} only") and
   * picks the rows "only" keeps. Default "Deployment". */
  parentKind?: string
  /** Which `involvedObject` kinds count as children. Default `['ReplicaSet', 'Pod']`. */
  childKinds?: string[]
  /** Called with `true` while the pointer or focus is on the events, `false` once both leave, so a
   * host can also pause its stream (WCAG 2.2.2). The table holds its rows still meanwhile. */
  onPauseChange?: (paused: boolean) => void
}

export interface ShortcutsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}
