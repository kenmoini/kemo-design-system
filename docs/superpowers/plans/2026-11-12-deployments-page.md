# Deployments Pages Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Deployments list and detail pages (Overview, YAML, Events) on the console shell, a CodeMirror 6 `YamlEditor` and a pluggable `SchemaBrowser`, kind-agnostic resource tabs for future kinds, and a preview demo with in-memory state, tests and README.

**Architecture:** `lib/kubernetes/` holds pure helpers (status derivation, clean YAML, YAML path ↔ offset, relative age). `widgets/yaml-editor/` wraps CodeMirror 6 (lazy-loaded) with a token theme and schema lint/hover/completion; `widgets/schema-browser/` walks any JSON Schema. `pages/resources/` holds the kind-agnostic detail shell, YAML tab and Events tab; `pages/deployments/` holds the scope bar, list page, Deployment overview and the composed detail page plus the bundled schema. The preview's `app/deployments/*` routes render `DeploymentsDemo` over a reducer in the segment layout.

**Tech Stack:** React 19, Park UI (Ark UI 5.40) on Panda CSS 2.5, TanStack Table 9 (existing `DataTable`), CodeMirror 6 (`@codemirror/{state,view,language,commands,lint,autocomplete,lang-yaml}`, `@lezer/highlight`), `codemirror-json-schema` ^0.8, `yaml` ^2.9, Next.js 16, Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-11-deployments-page-design.md`

## Global Constraints

- Imports: from `src/widgets/<name>/` and `src/pages/<name>/` the styled-system is `../../../styled-system/*`, Park components `../../components/ui`, other widgets `../../widgets`, shell `../../layouts/app-shell`, kubernetes helpers `../../lib/kubernetes`, `LinkComponent` from `../auth/types`; from `src/lib/kubernetes/` nothing UI is imported. Never `~/` or bare `styled-system/`. Tokens only; CodeMirror theme colours via `token.var('colors.…')` from `../../../styled-system/tokens`.
- Synced Park files (`src/components/ui/**` except `password-input.tsx`, `src/theme/recipes/**`, `src/theme/colors/**`, `global-css.ts`, `conditions.ts`) are never hand-edited; new ones only via `pnpm park-ui add breadcrumb scroll-area code` + `pnpm park-ui port` (`0 written` afterwards).
- `'use client'` on files with hooks or CodeMirror. Prettier `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`; `pnpm lint` zero warnings; Panda ESLint plugin (static style props; literal conditionals).
- Copy exactly as the spec: statuses "Available" / "Progressing" / "Degraded" / "Paused"; "All clusters" / "All namespaces"; "{n} deployments in {c} clusters · {ns}"; "No deployments in this scope"; YAML toolbar "Save", "Reload", "Download ▾" → "Download YAML" / "Download clean YAML", "Schema", "Shortcuts", status "Saved" / "● Unsaved changes" / "· {n} problem(s)" / "Server copy changed · Reload to see it"; Reload confirm "Discard your changes?"; Events segments "All {n}" / "Warning {w}", "Deployment + children" / "Deployment only"; actions "Scale…", "Restart", "Pause", "Resume", "Edit YAML", "Delete"; Restart confirm "Restart {name}?" / "A rolling restart replaces every pod."
- `cleanYaml` strips exactly `metadata.uid`, `metadata.resourceVersion`, `metadata.generation`, `metadata.creationTimestamp`, `metadata.managedFields`, `metadata.selfLink`, the `kubectl.kubernetes.io/last-applied-configuration` annotation and `status`, keeping key order; the YAML is 2-space indented.
- Save is disabled until dirty and blocked while problems exist; the host owns the draft (`draft`/`onDraftChange`).
- Green before every commit: `pnpm --filter @kemo/ui lib && pnpm test && pnpm typecheck && pnpm lint && pnpm format:check`; preview tasks add `pnpm build` and Playwright on :3100. One commit per task on `main`. Never stop the user's `next dev` on :3000; run build/dev/Playwright/registry sync/`pnpm add` with the sandbox disabled.

## Review Focus

1. YAML that does not parse (bad indentation) or violates the schema: the problems strip names the line, Save is blocked, and the text stays as typed (Task 4 test `blocks save while the document has problems`).
2. Editing YAML, switching to Overview and back: the draft is still there and marked unsaved (Task 6 e2e `yaml edit and save` switches tabs before saving).
3. `cleanYaml` on a resource with annotations, managed fields and status: exactly the listed fields are removed, everything else and the key order survive (Task 1 test `strips only the server-managed fields`).
4. Changing the scope so the Namespace filter's value is no longer in scope: the filter is cleared and the toolbar names the new scope (Task 5 test `clears a namespace filter that leaves the scope`).
5. A schema with a `$ref` cycle or an `anyOf` at the root, and a CRD schema unrelated to Deployments: the browser renders without looping and nothing assumes `apps/v1` (Task 3 tests `does not loop on a $ref cycle` and `renders a CRD schema`).

---

### Task 1: Foundations — Park sync, dependencies, kubernetes helpers, `tags` filter

**Files:**

- Run: `pnpm park-ui add breadcrumb scroll-area code` + `pnpm park-ui port`; `pnpm --filter @kemo/ui add @codemirror/state @codemirror/view @codemirror/language @codemirror/commands @codemirror/lint @codemirror/autocomplete @codemirror/lang-yaml @lezer/highlight codemirror-json-schema@^0.8 yaml@^2.9`
- Create: `packages/ui/src/lib/kubernetes/{types.ts,status.ts,clean-yaml.ts,yaml-paths.ts,age.ts,index.ts}`, tests `status.test.ts`, `clean-yaml.test.ts`, `yaml-paths.test.ts`, `age.test.ts`
- Modify: `packages/ui/src/widgets/data-table/types.ts` (discriminated `DataTableFilter`), `data-table-filters.tsx`, `columns.ts`, `data-table.test.tsx`; `packages/ui/src/index.ts` (`export * from './lib/kubernetes'`)

**Interfaces:**

- Produces (`types.ts`): every interface from the spec's data model verbatim (`DeploymentStatus`, `ScopeValue`, `ClusterOption`, `K8sMeta`, `DeploymentResource`, `Container`, `Volume`, `DeploymentSummary`, `RelatedObjects` + refs, `K8sEvent`).
- Produces: `deploymentStatus(d: DeploymentResource): DeploymentStatus`; `summarize(d: DeploymentResource, cluster: string, status?: DeploymentStatus): DeploymentSummary`; `cleanResource<T extends { metadata: K8sMeta; status?: unknown }>(r: T): T` (deep copy minus the listed fields); `cleanYaml(r): string`; `toYaml(obj: unknown): string`; `parseYaml<T = unknown>(text: string): { value: T; errors: { message: string; line: number; col: number }[] }`; `pathAtOffset(text: string, offset: number): (string | number)[]`; `offsetForPath(text: string, path: (string | number)[]): number | undefined`; `relativeAge(from: string, now: string): string` ("4m", "3h", "9d", "42d", "1y 2mo"? — use `"{n}s" | "{n}m" | "{n}h" | "{n}d"` up to days, then `"{n}mo"`, `"{n}y"`).
- Produces (DataTable): `DataTableFilter<T> = CheckboxFilter<T> | SelectFilter<T> | TagsFilter<T>` where `TagsFilter { id; label; kind: 'tags'; accessor: (row: T) => string[]; placeholder?: string }`; the rail renders a `TagsInput` (chips validated to contain `=`, invalid input rejected with the inline message "Use key=value"); filter fn: every chip ∈ accessor(row); the Filters badge counts chips; no facet counts for tags.

- [ ] **Step 1: Write the failing tests.** `status.test.ts`: paused → `'paused'`; Available=False → `'degraded'`; ReplicaFailure=True → `'degraded'`; Progressing=True reason `ReplicaSetUpdated` → `'progressing'`; `updatedReplicas < replicas` → `'progressing'`; all good → `'available'`. `clean-yaml.test.ts`: `strips only the server-managed fields` (fixture with uid/resourceVersion/generation/creationTimestamp/managedFields/selfLink, two annotations incl. last-applied, labels, spec, status → output YAML has neither the listed fields nor `status`, keeps `labels` and the other annotation, keeps key order `apiVersion, kind, metadata, spec`; 2-space indent); `toYaml`/`parseYaml` round-trip; `parseYaml` returns a line/col error for bad indentation. `yaml-paths.test.ts`: `pathAtOffset` inside `spec.template.spec.containers[0].image` → `['spec','template','spec','containers',0,'image']`; on a key → that key's path; `offsetForPath` returns the key's offset and `undefined` for a missing path. `age.test.ts`: 90 s → "1m", 3 h → "3h", 42 d → "42d", 400 d → "1y". `data-table.test.tsx` gains: `filters by tags` (two chips → only rows carrying both labels; badge "2" below lg; a chip "nope" without `=` is rejected with "Use key=value").
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run kubernetes data-table`. Expected: FAIL.
- [ ] **Step 3: Install, sync, implement.** Sync and install (sandbox disabled); `pnpm park-ui port` twice (second prints `0 written`); implement the helpers and the `tags` filter.
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0; lockfile adds only the listed packages and their deps.
- [ ] **Step 5: Commit** `feat(ui): add kubernetes helpers, a tags filter and the editor foundations`.

---

### Task 2: `YamlEditor` (spike first)

**Files:**

- Create: `packages/ui/src/widgets/yaml-editor/{spike.test.tsx,theme.ts,extensions.ts,yaml-editor.tsx,use-yaml-document.ts,index.ts}`
- Modify: `packages/ui/src/widgets/index.ts` (`export * from './yaml-editor'`)
- Test: `packages/ui/src/widgets/yaml-editor/yaml-editor.test.tsx`

**Interfaces:**

- Consumes: `parseYaml`, `pathAtOffset`, `offsetForPath` (Task 1); `token.var`.
- Produces: `YamlEditor(props: YamlEditorProps)` with `YamlEditorProps { value: string; onChange?: (text: string) => void; schema?: object; readOnly?: boolean; onProblems?: (problems: YamlProblem[]) => void; onCursorPath?: (path: (string | number)[]) => void; height?: string; ariaLabel: string; cursorPathRequest?: (string | number)[] }` (`cursorPathRequest`: when it changes, move the cursor to `offsetForPath`); `YamlProblem { from: number; to: number; line: number; message: string; severity: 'error' | 'warning' }`; `useYamlDocument({ initial }): { text; setText; dirty; reset(next?) }`; `yamlTheme` (an `Extension` built from `EditorView.theme` + `HighlightStyle` with the spec's token mapping, light/dark through the same vars).
- Behaviour: CodeMirror is imported lazily (`import('./extensions')` in an effect) — before it resolves the component renders a `pre` with the text at `height` (default `32rem`) so SSR output matches; `lineNumbers`, `foldGutter`, `history`, `yaml()`, bracket matching, `indentUnit` 2 spaces, Tab inserts two spaces (`indentWithTab`), Escape blurs; the content element has `aria-label` and `role="textbox"` `aria-multiline`; schema features via `codemirror-json-schema` (`yamlSchema(schema)` or the per-feature functions, whichever the spike proves) feeding `onProblems` through a lint listener; parse errors from `yaml` are also reported as problems; `onCursorPath` from `pathAtOffset` on selection change (debounced per update); `readOnly` via `EditorState.readOnly`.

- [ ] **Step 1: The spike (`spike.test.tsx`, kept as a test):** mount a bare `EditorView` in jsdom with `yaml()` + the `codemirror-json-schema` YAML extensions and a 20-line schema `{ type: 'object', properties: { kind: { enum: ['A','B'] }, spec: { type: 'object', properties: { replicas: { type: 'integer', description: 'How many' } }, required: ['replicas'] } } }`; set the doc `kind: C\nspec: {}`; assert that the lint diagnostics (via `forceLinting` + `diagnosticCount`/`lintState`) report the enum violation and the missing `replicas`; assert hover/completion sources are registered (call the completion source at the `spec:` position and expect `replicas`). If any assertion cannot be made to pass with `codemirror-json-schema` 0.8 on YAML after an honest attempt, record the exact failure in the report and implement the spec's fallback (own linter over `parseYaml` + a validator for `type/required/enum/properties/items/additionalProperties`, hover from the schema walker, no completion); the spike test then pins the fallback's diagnostics instead.
- [ ] **Step 2: Write the failing editor tests** (`yaml-editor.test.tsx`; await the lazy load with `findByRole('textbox')`): renders the value; typing calls `onChange` with the new text; `onProblems` reports the enum violation line for `strategy.type: RollingUpdat` against a mini schema; `onCursorPath` reports `['spec','strategy','type']` when the cursor is placed there (`view.dispatch({ selection })` via a test handle or by clicking at an offset); `readOnly` prevents edits; `cursorPathRequest` moves the selection to the key; the SSR placeholder (`renderToString`) contains the text and no CodeMirror DOM.
- [ ] **Step 3: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run yaml-editor`. Expected: FAIL (spike aside).
- [ ] **Step 4: Implement** theme, extensions, the component and hook.
- [ ] **Step 5: Test and checks** (full chain). Expected: PASS / exit 0, no `act()` warnings; `pnpm --filter @kemo/ui lib` succeeds (CodeMirror CSS-in-JS needs no Panda extraction).
- [ ] **Step 6: Commit** `feat(ui): add a CodeMirror YamlEditor with schema lint, hover and completion`.

---

### Task 3: `SchemaBrowser`, the bundled Deployment schema and the registry

**Files:**

- Create: `packages/ui/src/widgets/schema-browser/{resolve.ts,schema-browser.tsx,index.ts}`, `packages/ui/src/pages/deployments/schema/apps-v1-deployment.json`, `packages/ui/src/pages/resources/schema-registry.ts`
- Modify: `packages/ui/src/widgets/index.ts`
- Test: `packages/ui/src/widgets/schema-browser/{resolve,schema-browser}.test.tsx`, `packages/ui/src/pages/deployments/schema/deployment-schema.test.ts`

**Interfaces:**

- Produces (`resolve.ts`): `resolveNode(schema: object, path: (string | number)[]): SchemaNode | undefined` where `SchemaNode { path; title?: string; description?: string; type: string /* 'object' | 'array' | 'string' | … | 'oneOf' */; required: string[]; enum?: unknown[]; default?: unknown; fields: SchemaField[]; itemsPath?: (string | number)[]; alternatives?: SchemaNode[] }` and `SchemaField { name: string; type: string; required: boolean; description?: string; enum?: unknown[]; default?: unknown; drillable: boolean }`; resolves local `$ref` (`#/definitions/...`, `#/$defs/...`) with a visited set, `allOf` (merged), `oneOf`/`anyOf` (alternatives), `properties`, `items`, `additionalProperties` (shown as a `*` field), ignores `x-kubernetes-*`.
- Produces: `SchemaBrowser({ schema: object; path: (string | number)[]; onPathChange: (path) => void; onSelectField?: (path) => void })` — Park `Breadcrumb` of the path (root label = `schema.title ?? 'Resource'`; array segments shown as `[]`), the node description (`Text color="fg.muted"`), the field list in a `ScrollArea`: each row `Code`-styled name, type `Badge` (subtle), "required" `Badge`, description, "enum: a · b", "default: x"; drillable rows are `Button variant="plain"` that call `onPathChange`; names are `Button variant="plain"` calling `onSelectField(path)`; empty node → "No fields documented".
- Produces: `deploymentSchema` (JSON import, typed `object`): a trimmed draft-07 schema for `apps/v1 Deployment` with `title: "Deployment"`, descriptions for every included field, `required` arrays, enums/defaults for `spec.strategy.type` (`RollingUpdate` default), `imagePullPolicy`, `restartPolicy`, `dnsPolicy`, `ports[].protocol`, probe `scheme`; `definitions` for `Container`, `Volume`, `Probe`, `ResourceRequirements`, `LabelSelector`, `ObjectMeta`, `PodSpec`, `PodTemplateSpec`, `DeploymentStrategy`, `DeploymentStatus` (so `$ref` is exercised). `SchemaRegistry = Record<string, object>`; `schemaFor(registry, apiVersion, kind)`; `defaultSchemaRegistry = { 'apps/v1/Deployment': deploymentSchema }`.

- [ ] **Step 1: Failing tests.** `resolve.test.ts`: root fields of a mini schema; drill into `spec` → its fields with `required`; `items` on an array; `$ref` to `definitions`; `does not loop on a $ref cycle` (A → B → A resolves with a visited guard and returns the node); `anyOf` root → `alternatives`. `schema-browser.test.tsx`: `renders a CRD schema` (a hand-written `example.io/v1 Widget` schema: `spec.size` enum small/medium/large default medium, `spec.endpoints[]` items with `url` required → breadcrumb "Widget", fields, enum and default text, drill into `endpoints` shows `url` required); clicking a name calls `onSelectField(['spec','size'])`; breadcrumb click navigates up. `deployment-schema.test.ts`: `schemaFor(defaultSchemaRegistry, 'apps/v1', 'Deployment')` is the bundle; `resolveNode(deploymentSchema, ['spec','strategy'])` has field `type` with enum `['Recreate','RollingUpdate']` and default `RollingUpdate`; `['spec','template','spec','containers']` is an array whose items have `name` and `image` required; every field under `spec` has a description (walk two levels).
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run schema`. Expected: FAIL.
- [ ] **Step 3: Implement** (write the schema JSON by hand from the Kubernetes API reference descriptions; keep it under ~900 lines).
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add SchemaBrowser and the bundled Deployment schema`.

---

### Task 4: Kind-agnostic resource shell, YAML tab and Events tab

**Files:**

- Create: `packages/ui/src/pages/resources/{types.ts,resource-detail-shell.tsx,resource-yaml-tab.tsx,resource-events-tab.tsx,download.ts,shortcuts-dialog.tsx,index.ts}`
- Modify: `packages/ui/src/index.ts` (`export * from './pages/resources'`)
- Test: `packages/ui/src/pages/resources/{resource-detail-shell,resource-yaml-tab,resource-events-tab}.test.tsx`

**Interfaces:**

- Consumes: `YamlEditor`, `useYamlDocument` (Task 2); `SchemaBrowser` (Task 3); `DataTable`, `ActionMenu` (existing); `ConfirmDialog`, `EntityDialog` (from `../access`); `PageHeader`-free (the shell renders its own header); Park `Breadcrumb`, `Tabs`, `Drawer`, `SegmentGroup`, `Badge`, `Button`, `Menu`; `K8sEvent`, `relativeAge`.
- Produces: `ResourceDetailShell`, `ResourceYamlTab`, `ResourceEventsTab` with the spec's props; `downloadText(fileName: string, text: string)` (creates an object URL + anchor click; no-op on the server); `ShortcutsDialog({ open; onOpenChange })` listing: Save ⌘/Ctrl+S, Fold ⌘/Ctrl+Alt+[, Unfold ⌘/Ctrl+Alt+], Find ⌘/Ctrl+F, Indent Tab, Leave editor Esc.
- `ResourceYamlTab` behaviour: `text = draft ?? yamlText`; `dirty = draft !== undefined && draft !== yamlText`; problems from the editor; Save `disabled` until dirty, `aria-disabled` while problems > 0 (click shows nothing; tooltip "Fix the problems first"); Save calls `onSave(text)` and on resolve calls `onDraftChange(undefined)`; Reload → `ConfirmDialog` "Discard your changes?" when dirty, then `onDraftChange(undefined)` and `onReload?.()`; Download `Menu` → `downloadText(fileName, text)` / `downloadText(fileName.replace(/\.ya?ml$/, '.clean.yaml'), cleanText())`; status strip text per the spec, `serverChanged` adds "Server copy changed · Reload to see it"; "Schema" toggles the Drawer (`aria-pressed`), Drawer `modal={false}` on `lg`+ (`useMediaQuery(MEDIA_LG)`), `modal` below; the Drawer body is `SchemaBrowser` with `path` from `onCursorPath` (user drilling overrides until the cursor moves) and `onSelectField` → `cursorPathRequest`; ⌘/Ctrl+S inside the editor triggers Save when allowed; `mode="create"` renders `createControls` above the editor and labels Save "Create".
- `ResourceEventsTab` behaviour: `SegmentGroup` type (All {n} / Warning {w}) and scope (`"{Kind} + children"` / `"{Kind} only"` where `Kind` = the involved kind of the parent, default "Deployment"); rows sorted by `lastSeen` desc; `DataTable` with columns Type (`Badge` Normal `blue` / Warning `amber`), Reason, Message (`whiteSpace: normal`), Object (`Code` "{kind}/{name}"), Count (end), Last seen (`relativeAge`); `live` → a polite status "● streaming · paused on hover" and the dashboard's pause-on-hover/focus behaviour on the card.

- [ ] **Step 1: Failing tests.** Shell: breadcrumb links, h1 with the status badge text, context, actions slot, three tab links with hrefs and `aria-selected`, children. YAML tab: `blocks save while the document has problems` (draft with `type: RollingUpdat` → status "· 1 problem", Save `aria-disabled`); Save enabled when dirty and clean → `onSave` called with the draft and `onDraftChange(undefined)` after resolve; Reload when dirty opens the confirm, confirming clears the draft; Download menu items call `downloadText` with the right names and the clean text (mock the helper); Schema button toggles a dialog containing the browser with the breadcrumb; `serverChanged` text; create mode renders `createControls` and "Create". Events tab: badge text per type; Warning segment narrows; "Deployment only" hides ReplicaSet/Pod rows; sorted by last seen; live status text when `live`.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run resource-`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add the resource detail shell with YAML and Events tabs`.

---

### Task 5: `ScopeBar`, Deployments list page, Overview and the composed detail page

**Files:**

- Create: `packages/ui/src/pages/deployments/{scope-bar.tsx,deployments-list-page.tsx,deployment-overview.tsx,deployment-detail-page.tsx,scale-dialog.tsx,cells.tsx,index.ts}`
- Modify: `packages/ui/src/index.ts` (`export * from './pages/deployments'`)
- Test: `packages/ui/src/pages/deployments/{scope-bar,deployments-list-page,deployment-overview,deployment-detail-page}.test.tsx`

**Interfaces:**

- Consumes: Tasks 1–4; `DataTable` (`tags` filter), `StatCard` (or a local tile), `ConfirmDialog`, `EntityDialog`, `NumberField`, `MultiSelectField` from `../access`; `PageHeader`.
- Produces: `ScopeBar`, `DeploymentsListPage`, `DeploymentOverview`, `DeploymentDetailPage` with the spec's props (`onScale(id, replicas)`; bulk `onRestart(ids)`, `onSetPaused(ids, paused)`, `onDelete(ids)`); `ScaleDialog({ open; onOpenChange; name; replicas; onConfirm(replicas) })` (NumberField 0–100).
- List behaviour: rows filtered to the scope by the host (the page receives `rows` already scoped) but the page clears its Namespace filter value when it is not in `scope.namespaces`/the scoped namespaces; toolbar start "{n} deployments in {c} clusters · {ns}" (`c` = chosen clusters or all; `ns` = "all namespaces" or "{k} namespaces"); columns/facets/actions per the spec; row actions: Scale… (dialog), Restart (confirm), Pause|Resume, Edit YAML (link `detailHref(row) + '/yaml'`), Delete (confirm); bulk: Restart, Pause, Resume, Delete with confirms that say how many rows are skipped (already paused / not paused).
- Overview: tiles, details grid (`md`: two columns), conditions table, related card with `SegmentGroup` of kinds (counts) and a `DataTable` per kind (no selection/rail/search), empty state per kind; "Annotations ({n}) · show" toggles a `Code` block.
- Detail page: composes `ResourceDetailShell` (breadcrumb Deployments › name, status badge from `summary.status`, context "{cluster} · {namespace} · apps/v1", actions Scale…/Restart/Pause|Resume/Edit YAML/Delete) with `DeploymentOverview` | `ResourceYamlTab` (fileName `{name}.yaml`, `cleanText = () => cleanYaml(deployment)`) | `ResourceEventsTab`.

- [ ] **Step 1: Failing tests.** ScopeBar: "All clusters"/"All namespaces" when empty; choosing two clusters shows two chips and the namespaces union; `onChange` values. List: rows, status badges, ready text "6/6", label chips with "+N", links to `detailHref`; `clears a namespace filter that leaves the scope` (set the Namespace filter, re-render with a scope without it → filter cleared, toolbar says "… in 1 cluster · all namespaces"); Scale dialog → `onScale('id', 8)`; Restart confirm → `onRestart(['id'])`; bulk Pause with one already-paused row → confirm says "1 will be skipped" → `onSetPaused([other], true)`; empty scope message. Overview: tile values, strategy text, conditions rows, kind switch shows Services columns, zero-kind empty state, annotations toggle. Detail page: header pieces, `tab="yaml"` renders the YAML toolbar, `tab="events"` the events table, actions call handlers.
- [ ] **Step 2: Run to see them fail.** Run: `pnpm --filter @kemo/ui exec vitest run scope-bar deployments-list deployment-overview deployment-detail`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Test and checks** (full chain). Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add the Deployments list, overview and detail pages`.

---

### Task 6: Preview routes, demo state, mocks, panel, README, e2e

**Files:**

- Create: `apps/preview/src/app/deployments/{layout.tsx,page.tsx}`, `apps/preview/src/app/deployments/new/page.tsx`, `apps/preview/src/app/deployments/[cluster]/[namespace]/[name]/[[...tab]]/page.tsx`, `apps/preview/src/components/deployments/{deployments-demo.tsx,deployment-detail-demo.tsx,deployment-create-demo.tsx}`, `apps/preview/src/lib/{mock-deployments.ts,deployments-reducer.ts}`
- Modify: `apps/preview/src/lib/mock-dashboard.ts` (Deployments `href: '/deployments'`), `apps/preview/src/components/preview-panel.tsx` (`{ href: '/deployments', label: 'Deployments' }` after Dashboard), `apps/preview/e2e/smoke.spec.ts`, `README.md`
- Test: `apps/preview/e2e/smoke.spec.ts`

**Interfaces:**

- Produces: `mock-deployments.ts` — seeded generators for `clusters: ClusterOption[]` (3), `deployments: { cluster: string; resource: DeploymentResource }[]` (45 with the spec's status mix; 3 with multiple containers and env/envFrom/volumes), `relatedFor(resource, cluster): RelatedObjects` (derivation per the spec's Intent), `eventsFor(resource): K8sEvent[]` (8–14) + `eventRotation`, `now`, `starterTemplate`. `deployments-reducer.ts` — `DeploymentsState { scope; items: Record<id, { cluster; resource; draft?: string; serverChanged?: boolean }>; events: Record<id, K8sEvent[]>; nextId }` with actions `setScope`, `scale`, `restart` (annotation + progressing → available after 3 s via a demo effect), `setPaused`, `delete`, `setDraft`, `saveYaml` (parse, validate unchanged kind/name/namespace → reject with a message; updates resource + summary; clears the draft; sets `serverChanged` on other dirty copies? no — only the saved one), `create(cluster, text)`, `eventTick`. Layout holds the reducer and the scope in `localStorage` key `kemo.deployments.scope` (read in an effect; SSR uses All/All). `generateStaticParams` for every mock deployment × `[]`, `['yaml']`, `['events']`; unknown → `notFound()`.
- e2e: `ROUTES` += `/deployments`, `/deployments/new`, `/deployments/prod-us-east/checkout/checkout-api`, `…/checkout-api/yaml`, `…/checkout-api/events` (+5). Named (`describe('deployments')`): `scope narrows the list` (choose "prod-eu-west" → count text changes; reload → still chosen); `labels filter` (chip `app=checkout-api` → one row); `open a deployment` (click "checkout-api" → URL, tiles visible); `overview switches related kinds` (click "Services" → "Cluster IP" header); `yaml edit and save` (go to YAML, change `replicas: 6` to `8` via the editor's textbox, click Overview, back to YAML → "● Unsaved changes" still shown, Save → Overview tile "8 / 8"); `yaml schema problem blocks save` (type `RollingUpdat` → "1 problem", Save `aria-disabled`); `schema drawer follows the cursor` (click "Schema", place the cursor on `strategy` → breadcrumb contains "strategy"); `download clean yaml` (`page.waitForEvent('download')` → saved text has no `resourceVersion` and no `status:`); `events filter` ("Warning" segment → only Warning badges; "Deployment only" → no `pod/` objects); `deployments at 375` (pickers stacked, "Filters" drawer opens, `scrollWidth === 375`). Expected total: 63 + 5 + 10 = 78.
- README "## Deployments pages, YamlEditor and SchemaBrowser" after the Access section (what ships; CodeMirror lazy-load + theming note; wiring the list and detail pages; `cleanYaml`; passing another schema via `SchemaRegistry`; the kind-agnostic split for Gateway/CRD pages); roadmap updated.

- [ ] **Step 1: Write the failing e2e tests and ROUTES entries first**, build, run on :3100 → the new tests fail (404s), 63 pass.
- [ ] **Step 2: Implement** mocks, reducer, demos, routes, nav/panel, README.
- [ ] **Step 3: Run everything.** `pnpm --filter @kemo/ui lib && pnpm typecheck && pnpm lint && pnpm format:check && pnpm test && pnpm build`, then Playwright on :3100. Expected: 78 passed; zero console/page errors on looped routes. Screenshot `/deployments` (1440, 1023, 375, light + dark), the detail Overview, YAML with the schema drawer open, YAML with a problem, Events (1440), `/deployments/new` (1440); compare with `docs/superpowers/specs/assets/2026-11-11-deployment*-options.html`.
- [ ] **Step 4: Commit** `feat(preview): add the Deployments pages demo`.

---

### Task 7: Final verification

- [ ] **Step 1:** `make check`, `pnpm build` + Playwright on :3100, `make container-build`. Expected: exit 0 each; 78 e2e passed.
- [ ] **Step 2:** `git status --porcelain` empty; `git log --oneline` shows one commit per task plus review fixes.
