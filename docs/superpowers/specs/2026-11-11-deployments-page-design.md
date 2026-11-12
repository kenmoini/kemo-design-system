# Deployments pages

Date: 2026-11-11. Status: approved in the visual brainstorm (list: option A "scope row + filter rail"; detail
Overview: option B "summary tiles + one related-objects table"; YAML and Events tabs played back and accepted).
Mockups: `docs/superpowers/specs/assets/2026-11-11-deployments-list-options.html` and
`2026-11-11-deployment-detail-options.html`.

## Intent

The console's "Deployments" nav item becomes two real pages: a list of Kubernetes `apps/v1` Deployments across
the clusters and namespaces an admin chooses, and a detail page per Deployment with Overview, YAML and Events
tabs in the spirit of the OpenShift console. The Deployment is extended with a derived set of related objects
(ReplicaSets, Pods, Services, Ingresses, ConfigMaps, Secrets, PVCs, HPA, ServiceAccount) so the Overview shows
the whole workload. It also brings the design system its code editor: a CodeMirror 6 YAML editor themed with
Park tokens, with JSON-Schema lint, hover and completion, and a schema browser that improves on OpenShift's
sidebar by showing enums and defaults.

## Goals, non-goals, anti-goals

Goals: a `ScopeBar` (multi-select clusters and namespaces, "All" by default, host-persisted); a list page on the
Access `DataTable` with status facets, a `key=value` labels filter and a namespace narrow-down; a detail page
with header actions (Scale, Restart, Pause/Resume, Edit YAML, Delete) and three tabs; a reusable `YamlEditor`
and `SchemaBrowser`; a `cleanYaml` helper; a bundled, trimmed `apps/v1 Deployment` JSON schema; a preview demo
whose in-memory state makes every control real (edit-and-save YAML included); tests and README.

Non-goals: talking to a real cluster, watch streams, pod logs or terminals, a form-based editor, other
workload kinds (StatefulSet, DaemonSet), diff view on Reload, multi-document YAML, a full Kubernetes OpenAPI
schema (the bundled one is trimmed to what a Deployment author touches).

Anti-goals: an editor that loses edits on tab change or Reload without asking; a schema browser that shows a
field name with no description; "Download clean" leaking server-managed fields; status by colour alone; a list
that silently drops rows outside the chosen scope without saying what the scope is.

## Constraints (unchanged)

Panda CSS 2.5 `panda lib` workflow; Park UI components synced from the registry, never hand-edited; our files
under `src/pages/**`, `src/layouts/**`, `src/widgets/**`, `src/lib/**`, our token files; relative `styled-system`
imports; tokens only; `'use client'` where hooks are used; Prettier `semi: false, singleQuote: true, printWidth:
100, trailingComma: 'all'`; lint zero warnings; Vitest + Testing Library; Playwright; one commit per task on
`main`.

New dependencies (library): `@codemirror/state`, `@codemirror/view`, `@codemirror/language`,
`@codemirror/commands`, `@codemirror/lint`, `@codemirror/autocomplete`, `@codemirror/lang-yaml`,
`@lezer/highlight`, `codemirror-json-schema` (^0.8), `yaml` (^2.9). No Monaco. New Park foundations to sync:
`breadcrumb`, `scroll-area`, `code`. Reused: everything the Access phase built (`DataTable`, `ActionMenu`,
dialogs, form fields, `ConfirmDialog`, `createEntityTab`-style wiring is not needed here).

## The look

### Deployments list (`/deployments`)

Inside the host's `AppShell` ("Deployments" active). `PageHeader` "Deployments", context "apps/v1 Deployments
across the clusters you can see", action "+ Create deployment" (`solid`, links to the create route).

- **Scope row** under the header: two labelled multi-select pickers, Clusters and Namespaces (Park `Select
multiple` rendering the chosen values as chips with a "+N" overflow, "All clusters" / "All namespaces" when
  nothing is chosen). The Namespaces options are the union of namespaces in the chosen clusters. Changing scope
  calls `onScopeChange`; the host persists it (the preview uses `localStorage`). Below `md` the two pickers stack.
- **Table** on the Access `DataTable` with its filter rail (Drawer below `lg`): search (name, namespace, image);
  Status ☐ facets with counts (Available, Progressing, Degraded, Paused); Labels, a chip input of `key=value`
  pairs where a row matches when every chip is present in its labels (new `DataTableFilter` kind `'tags'`);
  Namespace ▾ (select; a narrow-down inside the chosen scope). Toolbar: "{n} deployments" (· "{k} selected"),
  "Bulk actions ▾" (Restart, Pause, Resume, Delete with confirm), no Add button here (it is in the header).
  Columns: Name (link to the detail page; cluster · namespace beneath in `xs` muted), Status (`Badge` with a dot:
  Available green, Progressing amber, Degraded red, Paused gray), Ready ("{ready}/{desired}" + a 48px bar: green
  when complete, red when degraded, gray when paused), Labels (up to three chips + "+N"), Age (relative, from a
  host-supplied `now`), actions (Scale…, Restart, Pause|Resume, Edit YAML (link), Delete). Default sort: name.
  Empty scope: "No deployments in this scope" + a "Clear filters" button when filters are set.

### Detail page (`/deployments/{cluster}/{namespace}/{name}`, tab segment `overview` (default) | `yaml` | `events`)

- **Header**: Park `Breadcrumb` (Deployments › {name}); `Heading as="h1"` with the name and the status `Badge`;
  context line "{cluster} · {namespace} · apps/v1"; actions row: Scale… (`outline`; dialog with a `NumberField`
  for replicas, 0–100), Restart (`outline`; confirm "Restart {name}?" "A rolling restart replaces every pod."),
  Pause or Resume (`outline`; toggles `spec.paused`), Edit YAML (`outline`, link to the yaml tab), Delete
  (`outline`, danger colour; confirm). Below, a Park `Tabs` strip of links: Overview, YAML, Events (same pattern as
  the Access page).
- **Overview** (option B): three `StatCard`-like tiles in a row (`md`: 3; below: 1) — Ready "{ready} / {desired}"
  with a progress bar, Updated · Available "{updated} · {available}" with "rollout complete {when}" or "rolling
  out…", Restarts · last 24 h "{n}" with "image {tag}"; then a two-column details card: Labels (chips),
  Annotations (count + "show"), Selector (mono), Strategy ("RollingUpdate · 25% / 25%" or "Recreate"), Replicas,
  Image(s) (mono), Service account, Node selector, Created ("{age} ago by {creator}" when known); then a
  Conditions table (Type, Status badge, Reason, Last transition); then one "Related objects" card whose header
  holds a `SegmentGroup` of kinds with counts (Pods, ReplicaSets, Services, Ingresses, ConfigMaps, Secrets,
  PVCs, HPA, Service account) and whose body is a `DataTable` (no selection, no rail) with per-kind columns:
  Pods (Name, Status badge, Restarts, Node, Age); ReplicaSets (Name, Desired, Ready, Age, Current badge);
  Services (Name, Type, Cluster IP, Ports); Ingresses (Name, Host, Path, Service); ConfigMaps / Secrets (Name,
  Used as: env / envFrom / volume, Keys); PVCs (Name, Status, Capacity, Storage class); HPA (Name, Min, Max,
  Target, Current); Service account (Name, Secrets, Roles). Kinds with zero objects are still listed with "0" and
  show an empty state "No {kind} are related to this Deployment".
- **YAML**: a toolbar — Save (`solid`, disabled until dirty and only when there are no problems), Reload
  (`outline`; confirms when dirty: "Discard your changes?"), Download ▾ (`Menu`: "Download YAML", "Download clean
  YAML"), a status `Text` ("Saved", "● Unsaved changes", "· {n} problem(s)" in amber/red), and on the right
  "Schema" (`outline`, toggles the browser Drawer, pressed state) and "Shortcuts" (`plain`, opens a small dialog
  listing the editor shortcuts). Below, the `YamlEditor` filling the tab height (min 32rem; grows with the
  viewport), line numbers, folding, YAML highlighting on Park tokens (keys `fg.default`, strings `green.11`,
  numbers `amber.11`, comments `fg.subtle`, booleans/null `blue.11`, cursor line `gray.a2`, selection `blue.a4`,
  gutter `gray.surface.bg` with `fg.subtle` numbers, errors underlined `red.9`), schema lint markers with a
  problems strip under the editor ("⚠ Line 11 · type must be one of Recreate, RollingUpdate"), hover docs and
  completion from the schema. The schema browser Drawer (end side, 22rem, non-modal so the editor stays usable):
  a `Breadcrumb` path that follows the cursor (Deployment › spec › strategy), the current object's description,
  then its fields: name (mono), type, "required" badge, description, enum values, default; objects and arrays are
  links that drill in; clicking a field name moves the editor cursor to that key when it exists in the document.
  Create mode (`/deployments/new`) uses the same tab with a starter template (name, namespace, one container),
  Save calls `onCreate` and navigates to the new detail page.
- **Events**: toolbar with `SegmentGroup` "All {n} / Warning {w}" and `SegmentGroup` "Deployment + children /
  Deployment only", a streaming note ("● streaming · paused on hover") when `live`; a `DataTable` (no selection,
  no rail) with Type (`Badge` Normal blue / Warning amber), Reason, Message (wraps), Object (mono "{kind}/{name}"),
  Count, Last seen; sorted by last seen; the live region pauses on hover/focus like the dashboard streams.

### Responsive

Scope pickers stack below `md`; the rail becomes the Filters Drawer below `lg` (DataTable already does this);
the detail header actions wrap; Overview tiles stack; the YAML schema Drawer is modal below `lg`; tables scroll
inside their cards.

## Data model (library types; the preview supplies mocks)

```ts
type DeploymentStatus = 'available' | 'progressing' | 'degraded' | 'paused'
interface ScopeValue {
  clusters: string[]
  namespaces: string[]
} // [] means "All"
interface ClusterOption {
  id: string
  label: string
  namespaces: string[]
}
interface K8sMeta {
  name: string
  namespace: string
  uid?: string
  resourceVersion?: string
  generation?: number
  creationTimestamp?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
  managedFields?: unknown[]
}
interface DeploymentResource {
  // the subset of apps/v1 Deployment the UI reads
  apiVersion: 'apps/v1'
  kind: 'Deployment'
  metadata: K8sMeta
  spec: {
    replicas?: number
    paused?: boolean
    selector: { matchLabels?: Record<string, string> }
    strategy?: {
      type?: 'RollingUpdate' | 'Recreate'
      rollingUpdate?: { maxSurge?: string | number; maxUnavailable?: string | number }
    }
    minReadySeconds?: number
    revisionHistoryLimit?: number
    progressDeadlineSeconds?: number
    template: {
      metadata?: { labels?: Record<string, string>; annotations?: Record<string, string> }
      spec: {
        containers: Container[]
        volumes?: Volume[]
        serviceAccountName?: string
        nodeSelector?: Record<string, string>
        restartPolicy?: string
      }
    }
  }
  status?: {
    replicas?: number
    updatedReplicas?: number
    readyReplicas?: number
    availableReplicas?: number
    observedGeneration?: number
    conditions?: {
      type: 'Available' | 'Progressing' | 'ReplicaFailure'
      status: 'True' | 'False' | 'Unknown'
      reason?: string
      message?: string
      lastTransitionTime?: string
    }[]
  }
}
interface Container {
  name: string
  image: string
  ports?: { containerPort: number; name?: string }[]
  env?: {
    name: string
    value?: string
    valueFrom?: {
      configMapKeyRef?: { name: string; key: string }
      secretKeyRef?: { name: string; key: string }
    }
  }[]
  envFrom?: { configMapRef?: { name: string }; secretRef?: { name: string } }[]
  resources?: unknown
  volumeMounts?: { name: string; mountPath: string }[]
}
interface Volume {
  name: string
  configMap?: { name: string }
  secret?: { secretName: string }
  persistentVolumeClaim?: { claimName: string }
  emptyDir?: unknown
}
interface DeploymentSummary {
  id: string /* "{cluster}/{namespace}/{name}" */
  cluster: string
  namespace: string
  name: string
  status: DeploymentStatus
  ready: number
  desired: number
  updated: number
  available: number
  labels: Record<string, string>
  images: string[]
  createdAt: string
  paused: boolean
}
interface RelatedObjects {
  pods: PodRef[]
  replicaSets: ReplicaSetRef[]
  services: ServiceRef[]
  ingresses: IngressRef[]
  configMaps: ConfigRef[]
  secrets: ConfigRef[]
  pvcs: PvcRef[]
  hpa?: HpaRef
  serviceAccount?: ServiceAccountRef
}
interface PodRef {
  name: string
  phase: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown'
  ready: boolean
  restarts: number
  node?: string
  createdAt: string
}
interface ReplicaSetRef {
  name: string
  desired: number
  ready: number
  createdAt: string
  current: boolean
}
interface ServiceRef {
  name: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
  clusterIP?: string
  ports: string[]
}
interface IngressRef {
  name: string
  host: string
  path: string
  service: string
}
interface ConfigRef {
  name: string
  usedAs: ('env' | 'envFrom' | 'volume')[]
  keys: number
}
interface PvcRef {
  name: string
  status: 'Bound' | 'Pending' | 'Lost'
  capacity?: string
  storageClass?: string
}
interface HpaRef {
  name: string
  min: number
  max: number
  target: string
  current: string
}
interface ServiceAccountRef {
  name: string
  secrets: number
  roles: string[]
}
interface K8sEvent {
  id: string
  type: 'Normal' | 'Warning'
  reason: string
  message: string
  involvedObject: { kind: 'Deployment' | 'ReplicaSet' | 'Pod'; name: string }
  count: number
  firstSeen: string
  lastSeen: string
  source?: string
}
```

`deploymentStatus(d: DeploymentResource): DeploymentStatus`: `paused` when `spec.paused`; `degraded` when the
`Available` condition is `False` or a `ReplicaFailure` condition is `True`; `progressing` when the
`Progressing` condition is `True` with a reason other than `NewReplicaSetAvailable`, or `updatedReplicas <
replicas`; else `available`. `summarize(d, cluster): DeploymentSummary`. `relatedObjects` is host-supplied (the
preview derives it from its mocks by the rules in the Intent).

`cleanYaml(d)`: returns a deep copy without `metadata.uid`, `metadata.resourceVersion`,
`metadata.generation`, `metadata.creationTimestamp`, `metadata.managedFields`, `metadata.selfLink`, the
`kubectl.kubernetes.io/last-applied-configuration` annotation, and `status`; serialised with the `yaml` package
(2-space indent, keys in the original order). `toYaml(d)` / `parseYaml(text)` wrap `yaml`.

## Reuse for other kinds (Gateway API, CRDs)

The YAML and Events tabs, the detail header and the schema tooling are kind-agnostic; only the list columns and
the Overview tab know what a Deployment is. The split is:

- **Kind-agnostic** (`pages/resources/`): `ResourceDetailShell` (breadcrumb, name + status badge, context line,
  actions slot, tab links), `ResourceYamlTab` (toolbar, editor, problems strip, schema Drawer, create mode) and
  `ResourceEventsTab`; `YamlEditor` and `SchemaBrowser` take **any** JSON Schema object (draft-07 style, as
  produced from a cluster's OpenAPI v3 by `kubectl`'s converters or a CRD's `openAPIV3Schema`), resolving `$ref`,
  `allOf`, `properties`, `items`, `additionalProperties`, `oneOf`/`anyOf` (shown as alternatives) and
  `x-kubernetes-*` extensions by ignoring them. `cleanYaml` strips the same server-managed fields from any
  resource. A `SchemaRegistry` (`{ [apiVersion/kind]: JSONSchema }`) plus `schemaFor(registry, apiVersion,
kind)` let a host hand the page one schema per kind; the Deployment schema is the one entry we bundle.
- **Deployment-specific** (`pages/deployments/`): `DeploymentsListPage` (columns, facets, actions),
  `DeploymentOverview` (tiles, details, related kinds) and `deploymentSchema`. A Gateway or CRD page composes
  `ResourceDetailShell` with its own overview and reuses the two generic tabs unchanged.

The e2e proves the point once: the Events and YAML tabs of the Deployment page are rendered through the generic
components, and a unit test renders `ResourceYamlTab` + `SchemaBrowser` with a small hand-written CRD schema
(two fields, one enum, one nested object) to show nothing in them assumes `apps/v1 Deployment`.

## Components and API

```ts
// pages/resources (kind-agnostic)
ResourceDetailShell({ breadcrumb: { label: string; href?: string }[]; name: string; status?: { tone: 'good' | 'warning' | 'critical' | 'off'; label: string }; context: ReactNode; actions?: ReactNode; tabs: { id: string; label: string }[]; activeTab: string; tabHref: (id: string) => string; linkComponent?; children })
ResourceYamlTab({ yamlText; draft?; onDraftChange; schema?: object; onSave; onReload?; fileName; cleanText: () => string; mode?: 'edit' | 'create'; createControls?: ReactNode; serverChanged?: boolean })
ResourceEventsTab({ events: K8sEvent[]; live?; now; childKinds?: string[] /* which involvedObject kinds count as "children"; default ['ReplicaSet','Pod'] */ })
type SchemaRegistry = Record<string, object>   // key "apps/v1/Deployment"
schemaFor(registry: SchemaRegistry, apiVersion: string, kind: string): object | undefined
// widgets/yaml-editor
YamlEditor({ value: string; onChange?: (text: string) => void; schema?: object; readOnly?: boolean; onProblems?: (problems: { from: number; to: number; message: string; severity: 'error' | 'warning' }[]) => void; onCursorPath?: (path: (string | number)[]) => void; height?: string; ariaLabel: string })
  // 'use client'; CodeMirror 6 EditorView with lineNumbers, foldGutter, history, yaml(), schema lint/hover/completion from codemirror-json-schema when `schema` is given, a Park-token theme (EditorView.theme + HighlightStyle via token.var), `aria-label` on the content, Tab inserts two spaces, Escape moves focus out
useYamlDocument({ initial: string }): { text; setText; dirty; reset(next?) }
// widgets/schema-browser
SchemaBrowser({ schema: object; path: (string | number)[]; onPathChange: (path) => void; onSelectField?: (path) => void })
  // resolves `$ref`/`properties`/`items`/`additionalProperties`; renders the breadcrumb, the node description, and the field list (name, type, required, description, enum, default); arrays show their item type and drill into `items`
// pages/deployments
ScopeBar({ clusters: ClusterOption[]; value: ScopeValue; onChange: (v: ScopeValue) => void })
DeploymentsListPage({ scope; onScopeChange; clusters; rows: DeploymentSummary[]; now: string; detailHref: (row) => string; createHref: string; linkComponent?; onScale: (ids: string[], replicas: number) => void; onRestart: (ids) => void; onSetPaused: (ids, paused: boolean) => void; onDelete: (ids) => void; selectedIds?; onSelectionChange? })
DeploymentDetailPage({ deployment: DeploymentResource; cluster: string; summary: DeploymentSummary; related: RelatedObjects; events: K8sEvent[]; liveEvents?: boolean; tab: 'overview' | 'yaml' | 'events'; tabHref: (tab) => string; listHref: string; linkComponent?; now: string; schema: object; yamlText: string; draft?: string; onDraftChange: (text?: string) => void; onSaveYaml: (text: string) => void | Promise<void>; onScale; onRestart; onSetPaused; onDelete })
  // composes ResourceDetailShell with the Deployment actions and renders DeploymentOverview | ResourceYamlTab | ResourceEventsTab
DeploymentOverview({ deployment; summary; related; now })
deploymentSchema: object   // bundled trimmed JSON schema for apps/v1 Deployment (descriptions, enums, defaults for the fields a Deployment author touches: metadata, spec.*, template.spec.containers[*] incl. env/envFrom/ports/resources/probes/volumeMounts, volumes, strategy, affinity (shallow))
// lib/kubernetes
deploymentStatus, summarize, cleanYaml, toYaml, parseYaml, relativeAge(from, now)
// DataTable addition (widgets/data-table)
DataTableFilter<T> gains kind: 'tags' — accessor returns string[]; the rail shows a TagsInput; a row matches when every chip is included in the accessor's array; the Filters badge counts chips
```

Exports join `src/index.ts` via `export * from './widgets/yaml-editor'`, `'./widgets/schema-browser'`,
`'./pages/resources'`, `'./pages/deployments'`, `'./lib/kubernetes'`.

## Preview

- Routes: `app/deployments/page.tsx` (list), `app/deployments/new/page.tsx` (create: the YAML tab in create
  mode), `app/deployments/[cluster]/[namespace]/[name]/[[...tab]]/page.tsx` (`generateStaticParams` for every
  mock deployment × three tabs; unknown → `notFound()`). Demo state in `app/deployments/layout.tsx` (reducer),
  as the Access page does; scope persisted to `localStorage` under `kemo.deployments.scope`.
- Mocks (`src/lib/mock-deployments.ts`, deterministic): three clusters (prod-us-east, prod-eu-west,
  staging-us-east) with 3–4 namespaces each; 45 deployments (38 available, 4 progressing, 2 degraded, 1 paused)
  with full `DeploymentResource`s (two or three with multiple containers, env/envFrom/volumes referencing
  ConfigMaps/Secrets/PVCs), derived `RelatedObjects` per deployment (rules from the Intent), 8–14 events each with
  a rotation for the live stream; a fixed `now`.
- Reducer actions: `setScope`, `scale(ids, replicas)` (updates spec + status + ready), `restart(ids)` (stamps
  `kubectl.kubernetes.io/restartedAt`, flips to progressing then available after 3 s), `setPaused(ids, bool)`,
  `delete(ids)`, `saveYaml(id, text)` (parses, validates kind/name/namespace unchanged, updates the resource and
  summary; rejects with the parse message otherwise), `create(text)`, `eventTick`.
- Nav: Deployments `href: '/deployments'`, badge stays 3. Panel: "Deployments" after Dashboard.
- README: "Deployments pages, YamlEditor and SchemaBrowser" section (what ships, CodeMirror theming note, how a
  host wires the list and detail pages, `cleanYaml`, the bundled schema and how to pass another); roadmap.

## Tests

- Unit: `deploymentStatus` for each branch; `cleanYaml` removes exactly the listed fields and keeps order;
  `relativeAge`; `ScopeBar` renders chips, "All" when empty, union of namespaces, calls `onChange`; the `'tags'`
  filter matches all chips and counts in the badge; list page renders rows, status badges, links, row/bulk
  actions with confirms, the Scale dialog; `YamlEditor` renders the text, calls `onChange`, reports a schema
  problem for an invalid enum, reports the cursor path, `readOnly`; `SchemaBrowser` shows the path, drills into
  objects/arrays, shows enum and default, `onSelectField`; `DeploymentOverview` tiles, details, conditions,
  kind switch with counts and empty state; `DeploymentYamlTab` Save disabled until dirty and blocked with
  problems, Reload confirms when dirty, Download menu items call the download helpers with the right text,
  Schema toggle; `DeploymentEventsTab` filters by type and scope.
- e2e: `/deployments`, `/deployments/new`, one detail route per tab join the routes loop; named: `scope
narrows the list` (pick one cluster → count and rows change, reload keeps it); `labels filter`; `open a
deployment` (click a name → detail URL, Overview tiles); `overview switches related kinds`; `yaml edit and
save` (change replicas in the editor → "Unsaved changes" → Save → Overview shows the new count); `yaml schema
problem blocks save`; `schema drawer follows the cursor`; `download clean yaml` (intercept the download, assert
  no `resourceVersion`/`status`); `events filter`; `deployments at 375` (pickers stack, drawer filters, no
  overflow).

## Decisions

1. CodeMirror 6, not Monaco: modular, no workers, themed through tokens, schema features via
   `codemirror-json-schema`; OpenShift's Monaco path would fight the design system and the bundle.
2. The schema browser is ours and shows enum and default, which OpenShift's sidebar omits.
3. Related objects are host-derived data, not computed by the library: the library renders what it is given;
   the preview shows the derivation rules once.
4. The list reuses the Access `DataTable` and gains one filter kind (`tags`) rather than a second table.
5. Tabs are links with a route per tab, as on the Access page; the detail URL carries cluster, namespace and
   name so links are shareable across scopes.
6. Save is blocked while the schema reports a problem; a host can still receive invalid text through
   `onChange` if it wants its own validation.
7. "Download clean" strips the server-managed fields listed above and nothing else; a host can post-process.
8. The detail shell, YAML tab, Events tab, editor, schema browser and `cleanYaml` are kind-agnostic and live
   under `pages/resources` and `widgets/`; only the list columns and the Overview are Deployment-specific, so
   Gateway API objects and CRDs reuse everything but those two by passing their own schema and overview.

## Calls made after the builder check

- **Loading the editor**: the barrel keeps exporting `YamlEditor`, `SchemaBrowser` and `deploymentSchema`
  (the package is `sideEffects: false`, so bundlers tree-shake them for consumers that never import them).
  `YamlEditor` imports CodeMirror lazily (`import()` inside an effect) and server-renders a `pre` with the text
  and the same height, so the YAML tab prerenders and hydrates without a layout jump; the preview needs no
  `next/dynamic`. The schema is a static JSON module (~60 kB) imported by the page.
- **Schema features on YAML**: Task 1 is a spike that proves `codemirror-json-schema` lint, hover and
  completion on a YAML document against the bundled schema. If any of the three fails, the fallback is our own
  linter: parse with `yaml` (`parseDocument` keeps offsets), validate with a small validator covering `type`,
  `required`, `enum`, `properties`, `items` and `additionalProperties`, and surface diagnostics through
  `@codemirror/lint`; hover then shows the schema description for the node under the cursor from the same
  walker. Completion is optional in the fallback.
- **Positions**: `lib/kubernetes/yaml-paths.ts` exports `pathAtOffset(text, offset)` and
  `offsetForPath(text, path)` built on `yaml`'s `parseDocument` + `LineCounter`; the editor uses them for
  `onCursorPath` and for "click a field name moves the cursor". Both are public and unit-tested.
- **Draft ownership**: the host owns the YAML draft. `DeploymentDetailPage` takes `yamlText` (server copy),
  `draft?: string` and `onDraftChange(text | undefined)`; the preview reducer keeps one draft per deployment, so
  switching tabs or deployments keeps edits. Reload replaces the draft with the server copy (confirming when
  dirty). If the server copy changes under a dirty draft (restart, scale, the demo's auto-flip), the status strip
  says "Server copy changed · Reload to see it" and Save still applies the draft (last write wins in the mock).
- **`'tags'` filter**: `DataTableFilter` becomes a discriminated union on `kind`; `'tags'` has `accessor: (row)
=> string[]`, chips must contain `=` (a chip without it is rejected inline with "Use key=value"), a row matches
  when every chip is in its array, the Filters badge counts chips, and the facet counts are not shown for tags.
- **Scope vs filters**: when the scope changes, a Namespace filter value outside the new scope is cleared;
  selected rows that leave the scope leave the selection (the DataTable already prunes absent rows); the toolbar
  always names the scope ("45 deployments in 2 clusters · all namespaces").
- **Park foundations**: `breadcrumb`, `scroll-area` and `code` are synced from the registry (network, sandbox
  disabled). `ScopeBar` reuses the Access `MultiSelectField` chips; overflow is a fixed "+N" after two chips.
- **Actions**: `onScale(id, replicas)` is per row (no bulk scale); bulk actions are Restart, Pause, Resume and
  Delete, each through a `ConfirmDialog`; bulk Pause skips rows already paused (and Resume rows not paused) and
  the confirm says how many will be skipped, like the Access roles.
- **Create mode**: `/deployments/new` shows Cluster and Namespace pickers above the editor (cluster required,
  defaulting to the first cluster in scope; namespace from the picker, mirrored into `metadata.namespace`), a
  starter template, and Save → `onCreate(cluster, text)` → navigate to the new detail page.
- **Mocks**: generated deterministically from seeded name lists (no static 45×N literals).

## Left to the builder

- The exact trimmed content of the bundled Deployment schema (keep every description; include enums/defaults for
  `strategy.type`, `imagePullPolicy`, `restartPolicy`, `dnsPolicy`, `protocol`, `type` on probes).
- CodeMirror extension set details (keymaps, bracket matching, search panel on/off) within the rules above;
  how hover docs are styled; the shortcuts dialog content.
- Mock copy, names and images; icon choices.
- File layout under `src/widgets/{yaml-editor,schema-browser}/`, `src/pages/deployments/`, `src/lib/kubernetes/`
  and the barrel exports.
