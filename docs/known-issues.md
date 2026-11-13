# Known issues and open items

Everything each phase's final review set aside, in one place. Each row carries a proposed disposition
for triage: **Fix** (worth a cleanup task), **Document** (a known limitation or a host contract; stays
here), **Drop** (by design, or not worth carrying). Once triaged, fixed rows are removed and the rest
stay as the record. Dates are the phase that left the item.

## Forum pages (2026-11-12)

| #   | Item                                                                                                  | Proposed | Why                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| F4  | Public forum API is wider than the spec (about 30 helpers, `vocabulary`, `REACTION_EMOJI`)            | Document | Settle the surface in the publishing phase, together with the other export questions (T1)       |
| F12 | Discussions feed at `lg`: the call to action precedes the `h1` in DOM and Tab order                   | Document | Source order is the small-screen reading order, the same trade-off as the blog's Journal        |
| F14 | Boards category header shows the category's total ("486 topics") above the loaded count ("13 topics") | Document | The header is the category record; the bar is the loaded list. A real host loads the whole list |
| F16 | Boards `replyFrom` flag lingers if a host resolves `onReply` without appending the post               | Document | Host contract: resolve means the post was added                                                 |
| F22 | Time helpers do not guard an invalid ISO string                                                       | Document | Typed content; hosts pass ISO strings                                                           |
| F23 | The Q&A answer cell's "answers" label uses a raw 0.625rem size (the theme has no `2xs` text style)    | Document | `text-styles.ts` is a synced Park file; a `2xs` style would need a port transform               |

## Deployments pages, YamlEditor and SchemaBrowser (2026-11-12)

| #   | Item                                                                                                                                                                                                                                                             | Proposed | Why                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Dialog and live-region plumbing is copy-pasted between `pages/access/entity-tab.tsx` and the Deployments list; `pages/resources` and `pages/deployments` deep-import from `pages/access`, and `widgets/event-stream.tsx` imports `pages/access/use-reader-pause` | Fix      | Lift `ConfirmDialog`, `EntityDialog`, the form fields, `useFormSubmit` and `use-reader-pause` into a shared module before publishing |
| D3  | The bundled schema has no `additionalProperties: false`, so key typos never lint; a property literally named `*` collides with the any-key row                                                                                                                   | Document | A sentence in the guide; both are upstream schema shapes                                                                             |
| D4  | The hover chunk weight (markdown-it + shiki, about 230 kB) cannot be configured away in codemirror-json-schema 0.8                                                                                                                                               | Document | Own linter fallback or an upstream change                                                                                            |
| D6  | The create flow flashes the starter template before navigating                                                                                                                                                                                                   | Fix      | Navigate before rendering the template, or hold the shell                                                                            |
| D7  | Toggling `live` remounts the events table and resets sort and page                                                                                                                                                                                               | Document | Keyed remount is deliberate                                                                                                          |
| D9  | Save stays disabled until CodeMirror loads; tests must await the textbox                                                                                                                                                                                         | Document | Lazy editor                                                                                                                          |
| D10 | `deployment-overview.tsx` is about 630 lines                                                                                                                                                                                                                     | Document | Split when next touched                                                                                                              |
| D11 | The "Restarts" tile is a lifetime count                                                                                                                                                                                                                          | Document | Matches the data available                                                                                                           |
| D14 | Preview: demo handlers read `state` from the render closure (stale only if two actions land in one tick); a `saveYaml` resolving after unmount schedules one harmless timer; unknown names answer HTTP 200                                                       | Document | Demo behaviour                                                                                                                       |

## Blog pages (2026-11-12)

| #   | Item                                                                                                                                                                                                                                         | Proposed | Why                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| B1  | Journal at `lg`: "Copy link" sits alone beside the comments and the sticky rail stops at the end of the article; the index's left column is not sticky; the rail's `h2`s precede the `h1` in DOM; below `lg` the back link and details stack | Document | DOM order equals reading order; the trade-off is deliberate |
| B3  | Date helpers throw on an invalid ISO string                                                                                                                                                                                                  | Document | Typed content                                               |

## Access page and DataTable (2026-11-11)

| #   | Item                                                                                                                                          | Proposed | Why                                                                |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| A3  | Edit and Clone pre-fill `tokenLifetimeDays` with 90 (`service-accounts-tab.tsx`), so a host that maps it to an expiry resets it on every edit | Document | Form-only field; a host that stores the lifetime should pass it in |
| A6  | A controlled `selectedIds` rejected by a host leaves Ark's hidden checkbox input drifting                                                     | Document | JSDoc warns                                                        |
| A7  | `DateTimeText` is hard-coded `en`/UTC                                                                                                         | Document | Localisation is a non-goal                                         |
| A10 | Test quirks: `userEvent.setup({ delay: 20 })` for a jsdom caret race; `stubLayout()` for Zag focus; a smoke test mutates a module ref         | Document | Explained in the tests                                             |

## Status pages and console pages (2026-11-11)

| #   | Item                                                                                                                            | Proposed | Why                                                                                                         |
| --- | ------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------- |
| S3  | FAQ ids are host-supplied and not namespaced                                                                                    | Document | Documented in the guide                                                                                     |
| S5  | Current-topic tracking cannot reach a short last topic at the page bottom                                                       | Document | Hash following covers clicks                                                                                |
| S9  | The preview panel's floating trigger covers the footer's bottom-right version text on the status and auth pages at phone widths | Document | Preview chrome; the status spec accepts the overlap, and the library footers stay pinned to the bottom edge |
| S10 | `StatusActionButton` is exported deliberately; reconsider before publishing                                                     | Document | Part of the export review (T1)                                                                              |

## Application shell and dashboard (2026-11-10)

| #    | Item                                                                                                                                                       | Proposed | Why                                                                                       |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| H1   | A Park `Select` inside the mobile nav `Drawer` needs `zIndex: 'popover'` on its Content (recipe stacks at `dropdown`)                                      | Document | Candidate port transform; the demo sets it per select                                     |
| H4   | Recharts `ResponsiveContainer initialDimension` is 600px until ResizeObserver fires                                                                        | Document |                                                                                           |
| H5   | Line-chart end labels have no collision avoidance; `Legend align` is deprecated in Recharts 3.10; a stacked column is not rounded when the top series is 0 | Document |                                                                                           |
| H6   | `StatusGrid` mounts one lazy Ark Tooltip per cell (48 on the demo)                                                                                         | Document |                                                                                           |
| H8   | `SegmentedBar` segments past the fifth share `gray.8`                                                                                                      | Document |                                                                                           |
| H10  | The Capacity card's text column wraps narrowly beside the gauge at 1024px                                                                                  | Document |                                                                                           |
| H11b | `useLiveEvents` (the preview's live-feed hook) has no test: it uses React hooks and the preview's Vitest runs in Node only                                 | Document | A jsdom environment for that file, or move the hook into `@kemo/ui` where jsdom tests run |
| H13  | `AppShellProvider` is exported but inert without `AppShell`; rail labels render full width on the server between `md` and `lg` until hydration             | Document |                                                                                           |

## Auth pages (2026-11-09)

| #   | Item                                                                                            | Proposed | Why                                                                                                                            |
| --- | ----------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------ |
| U3  | The `.dark, .light` globalCss rule resets `colorPalette` to gray at every forced-color boundary | Document | A host's `colorPalette` does not cross into the forced `.dark`/`.light` subtrees (auth drawer, status pages, Nightfall blocks) |

## Tooling, CI, preview infrastructure (2026-11-09)

| #   | Item                                                                                                                                                                                                                                                                                                                              | Proposed | Why                             |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------- |
| T1  | Export surface review before publishing: `StatusActionButton`, `AppShellProvider`, `QuickActions`, the forum helpers, and the new public names `StatusBadge`, `StatusBadgeProps`, `createSchemaRegistry`, `isQuestion` (the generic name `StatusBadge` also collides with two internal ones, in `pages/access` and `pages/forum`) | Document | A publishing-phase decision     |
| T7  | `next.config.ts` relies on Next compiling to CJS for `__dirname`; tripwire: `.next/standalone/apps/preview/server.js` must exist after build                                                                                                                                                                                      | Document |                                 |
| T8  | The sync script's barrel writer: `appendExport` merges non-`export … from` text; dedupe keyed on the whole statement; imports unsorted; palette scan covers recipe files only                                                                                                                                                     | Document |                                 |
| T9  | The theme toggle exposes no state; the component pages omit ButtonGroup, CloseButton, Fieldset, InputGroup, Spinner, Loader, Icon                                                                                                                                                                                                 | Fix      | Add them to the component pages |

## Park UI upstream quirks

| #   | Item                                                                                                        | Proposed | Why                       |
| --- | ----------------------------------------------------------------------------------------------------------- | -------- | ------------------------- |
| P4  | `Alert.Indicator` has no children slot; the `select` recipe's `dropdown` layer sits below `Drawer` (see H1) | Document | Candidate port transforms |
