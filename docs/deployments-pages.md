# Deployments pages, YamlEditor and SchemaBrowser

The console's Deployments pages: a list of Kubernetes `apps/v1` Deployments across the clusters and
namespaces a reader picks, and a page per Deployment with Overview, YAML and Events tabs. They bring
the design system its code editor, a CodeMirror 6 YAML editor with JSON Schema lint, hover and
completion, and a schema browser that shows each field's type, description, enum and default.
Presentational like the rest: the host fetches, derives and keeps every value, and gets every action
back as a callback. Exports from `@kemo/ui`:

Screenshots: [gallery](gallery/README.md#deployments-pages).

- Deployment-specific (`pages/deployments`): `DeploymentsListPage` (header with "+ Create
  deployment", the `ScopeBar` of Clusters and Namespaces pickers, then a `DataTable` with Status,
  Labels and Namespace filters, row actions Scale…, Restart, Pause|Resume, Edit YAML and Delete,
  and bulk Restart, Pause, Resume and Delete), `DeploymentDetailPage` (the shell, the actions and
  the three tabs), `DeploymentOverview` (tiles, details, conditions, related objects), `ScaleDialog`,
  the cells `DeploymentStatusBadge`, `ReadyCell`, `LabelChips` and `AgeCell`,
  `deploymentStatusOptions`, the bundled `deploymentSchema`, `scopedNamespaces` and
  `CREATED_BY_ANNOTATION` (the annotation the Overview reads "by {creator}" from).
- Kind-agnostic (`pages/resources`): `ResourceDetailShell` (breadcrumb, name and status badge,
  context line, actions, tab links), `ResourceYamlTab` (Save, Reload, Download, the status line,
  the editor, its problems and the schema browser; also a create mode), `ResourceEventsTab` (type
  and scope filters, a live mode that holds still for a reader), `ShortcutsDialog`,
  `SchemaRegistry`, `schemaFor`, `defaultSchemaRegistry` and `downloadText`.
- Widgets: `YamlEditor`, `useYamlDocument`, `SchemaBrowser` and `resolveNode`; `DataTable` gains a
  `tags` filter kind (`key=value` chips; a row matches when it has every chip), a `countLabel` and
  the controlled `filterValues` the Deployments list uses to clear a stale Namespace filter;
  `MultiSelectField` gains `maxChips` (the rest collapse into a "+N" chip).
- Helpers (`lib/kubernetes`, no UI): the types (`DeploymentResource`, `DeploymentSummary`,
  `RelatedObjects`, `K8sEvent`, `ScopeValue`, `ClusterOption`, …), `deploymentStatus`,
  `summarize`, `cleanResource`, `cleanYaml`, `toYaml`, `parseYaml`, `pathAtOffset`,
  `offsetForPath` and `relativeAge`.

`YamlEditor` imports CodeMirror with `import()` once it mounts, so only a page that shows an editor
loads it, and until then (and on the server) it renders the text in a `pre` of the same height, so
the YAML tab prerenders and hydrates without a jump; no `next/dynamic` is needed. Its theme is a
CodeMirror theme and highlight style built from Park tokens' CSS variables (`token.var`), so the
light and dark switch on `<html>` recolours it with no second theme: keys `fg.default`, strings
`green.11`, numbers `amber.11`, booleans and null `blue.11`, comments `fg.subtle`, the cursor line
`gray.a2`, the selection `blue.a4`, errors underlined `red.9`. Save in the YAML tab waits for the
editor to load, then checks the text it sends against the schema (the linter itself runs half a
second after an edit).

A host wires the list to its data and keeps the scope:

```tsx
'use client'
import { type DeploymentSummary, DeploymentsListPage, type ScopeValue, summarize } from '@kemo/ui'
import NextLink from 'next/link'
import { useState } from 'react'
import { api, clusters, useDeployments } from './api' // your client

const detailHref = (row: DeploymentSummary) =>
  `/deployments/${row.cluster}/${row.namespace}/${row.name}`

// `now`: the server's time (an ISO string), so the server and client renders agree on the ages.
export function Deployments({ now }: { now: string }) {
  const [scope, setScope] = useState<ScopeValue>({ clusters: [], namespaces: [] }) // [] is "All"
  const items = useDeployments(scope) // { cluster, resource }[] in the scope
  return (
    <DeploymentsListPage
      scope={scope}
      onScopeChange={setScope} // persist it: the preview keeps it in localStorage
      clusters={clusters} // { id, label, namespaces }[]
      rows={items.map(({ cluster, resource }) => summarize(resource, cluster))}
      now={now}
      detailHref={detailHref} // its YAML tab is `${detailHref(row)}/yaml`
      createHref="/deployments/new"
      linkComponent={NextLink}
      onScale={(id, replicas) => api.scale(id, replicas)} // a rejection shows in the dialog
      onRestart={(ids) => api.restart(ids)}
      onSetPaused={(ids, paused) => api.setPaused(ids, paused)}
      onDelete={(ids) => api.delete(ids)}
    />
  )
}
```

The detail page takes the Deployment, its summary, the objects around it (the host derives them:
the library renders what it is given), its events, and the YAML as text with the host's draft:

```tsx
<DeploymentDetailPage
  deployment={resource}
  cluster={cluster}
  summary={summarize(resource, cluster)}
  related={related} // RelatedObjects: pods, replicaSets, services, ingresses, configMaps, …
  events={events} // K8sEvent[]: the Deployment's and its ReplicaSets' and Pods'
  liveEvents // a streaming note; the rows hold still while the pointer or focus is on them
  tab={tab} // 'overview' | 'yaml' | 'events', from the URL
  tabHref={(t) => (t === 'overview' ? base : `${base}/${t}`)}
  listHref="/deployments"
  linkComponent={NextLink}
  now={now}
  schema={schemaFor(defaultSchemaRegistry, 'apps/v1', 'Deployment') ?? deploymentSchema}
  yamlText={yamlText} // the server copy, e.g. toYaml(resource)
  draft={draft} // the host keeps the edit, so it outlasts a tab switch
  onDraftChange={setDraft} // undefined once saved, discarded or undone
  onSaveYaml={(text) => api.apply(text)} // a rejection keeps the draft and shows its message
  serverChanged={serverChanged} // "Server copy changed · Reload to see it"
  onScale={(id, replicas) => api.scale(id, replicas)}
  onRestart={(ids) => api.restart(ids)}
  onSetPaused={(ids, paused) => api.setPaused(ids, paused)}
  onDelete={(ids) => api.delete(ids).then(() => router.push('/deployments'))}
/>
```

Hold the draft (and anything else that must outlast a tab) above the `[[...tab]]` page, in a layout
or a store: Next remounts a page when its params change. Save is disabled until the text differs
from `yamlText` and blocked while the editor reports a problem; Reload asks before it discards a
draft. "Download YAML" saves the text as shown; "Download clean YAML" saves `cleanText(text)`, which
gets that same text (the Deployments page cleans the draft with `cleanYaml`, or the server copy when
the draft does not parse): the resource without `metadata.uid`, `resourceVersion`, `generation`, `creationTimestamp`,
`managedFields`, `selfLink`, the `kubectl.kubernetes.io/last-applied-configuration` annotation and
`status`, keys in their original order and indented by two spaces (`cleanResource` returns the
same as an object).

The YAML tab, the editor and the schema browser take any JSON Schema (draft-07 style, such as a
CRD's `openAPIV3Schema` or one converted from a cluster's OpenAPI v3), resolving `$ref`, `allOf`,
`properties`, `items`, `additionalProperties` and `oneOf`/`anyOf`, and ignoring the
`x-kubernetes-*` extensions. A `SchemaRegistry` holds one per kind, keyed
`{apiVersion}/{kind}`; `defaultSchemaRegistry` has the bundled `apps/v1/Deployment` (trimmed to the
fields a Deployment author touches, every one with its description), and a host adds its own:

```ts
import { defaultSchemaRegistry, schemaFor, type SchemaRegistry } from '@kemo/ui'
import httpRouteSchema from './schemas/httproute.json'

const registry: SchemaRegistry = {
  ...defaultSchemaRegistry,
  'gateway.networking.k8s.io/v1/HTTPRoute': httpRouteSchema,
}
// undefined for an unknown kind: the editor still flags YAML syntax, with no schema lint or browser
const schema = schemaFor(registry, resource.apiVersion, resource.kind)
```

Only the list's columns and the Overview know what a Deployment is. A page for another kind, a
Gateway API object or a CRD, composes `ResourceDetailShell` with its own overview and actions and
reuses `ResourceYamlTab` (with its schema) and `ResourceEventsTab` (`parentKind` names the
object, `childKinds` the kinds counted as its children) unchanged.

In the preview, `/deployments`, `/deployments/new` and
`/deployments/{cluster}/{namespace}/{name}[/yaml|/events]` are
`apps/preview/src/app/deployments/`: the segment's `layout.tsx` renders `DeploymentsDemoShell`
(the console frame and the state), so the list, the create page and the detail tabs share one
state and a YAML draft survives a trip to another tab or page; the detail route prerenders the
three tabs of every seeded Deployment with `generateStaticParams` and answers an unknown cluster,
namespace or tab with `notFound()`. A name the server has not prerendered is checked in the
browser instead, where the Deployments created during the visit live: an unknown one shows the 404
page once the page has hydrated. The demos are in `apps/preview/src/components/deployments/`, and
every control works on in-memory state through `deploymentsReducer` in
`apps/preview/src/lib/deployments-reducer.ts`: the scope (kept in `localStorage` under
`kemo.deployments.scope`), Scale, Restart (the rollout runs for three seconds; a paused Deployment
rolls out when it is resumed), Pause and Resume, Delete, the YAML draft per Deployment, Save (kind,
name and namespace can't change; a new pod template rolls out like a restart), Create, and the live
events of the Events tab. Its clock never reads the wall clock: every change moves it on, and the
shell moves it half a minute at a time while the page is visible, except while a reader holds the
live events still, so the ages move and the server and client renders match. The mock data,
generated from seed lists and a string hash, is in `apps/preview/src/lib/mock-deployments.ts`: 3
clusters, 45 Deployments (38 available, 4 progressing, 2 degraded, 1 paused; three run a sidecar),
a Service for each app that listens on a port and an Ingress for each namespace that serves web
traffic, the objects around each Deployment (`relatedFor`: its pods and ReplicaSets, the Services
in its namespace whose selectors match its pod labels and the Ingress rules that route to them,
the ConfigMaps, Secrets and PVCs the pods read, an autoscaler for a few, the service account) and
8 to 14 events each (`eventsFor`), naming those pods. The reducer and the mocks have unit tests in
`apps/preview/src/lib/deployments-reducer.test.ts` (Vitest, `pnpm --filter @kemo/preview test`).
