# Known issues and open items

Everything each phase's final review set aside, in one place. Each row carries a proposed disposition
for triage: **Fix** (worth a cleanup task), **Document** (a known limitation or a host contract; stays
here), **Drop** (by design, or not worth carrying). Once triaged, fixed rows are removed and the rest
stay as the record. Dates are the phase that left the item.

## Forum pages (2026-11-12)

| #   | Item                                                                                                  | Proposed | Why                                                                                             |
| --- | ----------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| F4  | Public forum API is wider than the spec (about 30 helpers, `vocabulary`, `REACTION_EMOJI`)            | Document | Settle the surface in the publishing phase, together with the other export questions (T1)       |
| F6  | Q&A hero input is not white in the dark theme                                                         | Drop     | A dark input on the gradient is the right dark-mode rendering; the mockup was light only        |
| F12 | Discussions feed at `lg`: the call to action precedes the `h1` in DOM and Tab order                   | Document | Source order is the small-screen reading order, the same trade-off as the blog's Journal        |
| F14 | Boards category header shows the category's total ("486 topics") above the loaded count ("13 topics") | Document | The header is the category record; the bar is the loaded list. A real host loads the whole list |
| F15 | Discussions "N replies" heading counts the original post's children, which sit under the opening card | Drop     | Every counted reply is visible                                                                  |
| F16 | Boards `replyFrom` flag lingers if a host resolves `onReply` without appending the post               | Document | Host contract: resolve means the post was added                                                 |
| F17 | Opener focus falls to `body` if a host re-keys the Reply button between render and close              | Drop     | Not reachable with stable keys                                                                  |
| F18 | Hand-written threads show lower reply counts than the mockups; pool replies fit some topics loosely   | Drop     | Demo content                                                                                    |
| F22 | Time helpers do not guard an invalid ISO string                                                       | Document | Typed content; hosts pass ISO strings                                                           |
| F23 | The Q&A answer cell's "answers" label uses a raw 0.625rem size (the theme has no `2xs` text style)    | Document | `text-styles.ts` is a synced Park file; a `2xs` style would need a port transform               |
| F24 | The brand link's accessible name drops "/ Community" below `sm`                                       | Drop     | The visible text is the name                                                                    |

## Deployments pages, YamlEditor and SchemaBrowser (2026-11-12)

| #   | Item                                                                                                                                                                                                       | Proposed | Why                                                                                                                                  |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Dialog and live-region plumbing is copy-pasted between `pages/access/entity-tab.tsx` and the Deployments list; `pages/resources` and `pages/deployments` deep-import from `pages/access`                   | Fix      | Lift `ConfirmDialog`, `EntityDialog`, the form fields, `useFormSubmit` and `use-reader-pause` into a shared module before publishing |
| D3  | The bundled schema has no `additionalProperties: false`, so key typos never lint; a property literally named `*` collides with the any-key row                                                             | Document | A sentence in the guide; both are upstream schema shapes                                                                             |
| D4  | The hover chunk weight (markdown-it + shiki, about 230 kB) cannot be configured away in codemirror-json-schema 0.8                                                                                         | Document | Own linter fallback or an upstream change                                                                                            |
| D6  | The create flow flashes the starter template before navigating                                                                                                                                             | Fix      | Navigate before rendering the template, or hold the shell                                                                            |
| D7  | Toggling `live` remounts the events table and resets sort and page                                                                                                                                         | Document | Keyed remount is deliberate                                                                                                          |
| D9  | Save stays disabled until CodeMirror loads; tests must await the textbox                                                                                                                                   | Document | Lazy editor                                                                                                                          |
| D10 | `deployment-overview.tsx` is about 630 lines                                                                                                                                                               | Document | Split when next touched                                                                                                              |
| D11 | The "Restarts" tile is a lifetime count                                                                                                                                                                    | Document | Matches the data available                                                                                                           |
| D13 | Schema problem wording is the library's, not the mockup's                                                                                                                                                  | Drop     |                                                                                                                                      |
| D14 | Preview: demo handlers read `state` from the render closure (stale only if two actions land in one tick); a `saveYaml` resolving after unmount schedules one harmless timer; unknown names answer HTTP 200 | Document | Demo behaviour                                                                                                                       |

## Blog pages (2026-11-12)

| #   | Item                                                                                                                                                                                                                                         | Proposed | Why                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ----------------------------------------------------------- |
| B1  | Journal at `lg`: "Copy link" sits alone beside the comments and the sticky rail stops at the end of the article; the index's left column is not sticky; the rail's `h2`s precede the `h1` in DOM; below `lg` the back link and details stack | Document | DOM order equals reading order; the trade-off is deliberate |
| B3  | Date helpers throw on an invalid ISO string                                                                                                                                                                                                  | Document | Typed content                                               |
| B7  | Magazine grid: the hero stays visible on page 2; the description is screen-reader-only                                                                                                                                                       | Drop     | Design                                                      |
| B11 | `Byline` keys parts by name; the Editorial list badge sits after the byline below `sm`; the dark-theme e2e asserts only the body background                                                                                                  | Drop     |                                                             |

## Access page and DataTable (2026-11-11)

| #   | Item                                                                                                                                       | Proposed | Why                        |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------- | -------------------------- |
| A3  | "Delete 2 roles?" uses the selected count while the description carries the built-in skip note; Edit pre-fills `tokenLifetimeDays` with 90 | Drop     | Described in the dialog    |
| A6  | A controlled `selectedIds` rejected by a host leaves Ark's hidden checkbox input drifting                                                  | Document | JSDoc warns                |
| A7  | `DateTimeText` is hard-coded `en`/UTC                                                                                                      | Document | Localisation is a non-goal |
| A9  | The live region also announces the sort; audit tone mapping differs from the mockup's illustrative colours                                 | Drop     | Rulings                    |
| A10 | Test quirks: `userEvent.setup({ delay: 20 })` for a jsdom caret race; `stubLayout()` for Zag focus; a smoke test mutates a module ref      | Document | Explained in the tests     |

## Status pages and console pages (2026-11-11)

| #   | Item                                                                                                                           | Proposed | Why                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------ | -------- | ------------------------------ |
| S3  | FAQ ids are host-supplied and not namespaced                                                                                   | Document | Documented in the guide        |
| S5  | Current-topic tracking cannot reach a short last topic at the page bottom                                                      | Document | Hash following covers clicks   |
| S7  | The word watermark's tallest letters sit flush with the top edge from 768px; the message block sits 2px higher than the mockup | Drop     | Visual nits                    |
| S10 | `StatusActionButton` is exported deliberately; reconsider before publishing                                                    | Document | Part of the export review (T1) |

## Application shell and dashboard (2026-11-10)

| #   | Item                                                                                                                                                       | Proposed | Why                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------- |
| H1  | A Park `Select` inside the mobile nav `Drawer` needs `zIndex: 'popover'` on its Content (recipe stacks at `dropdown`)                                      | Document | Candidate port transform; the demo sets it per select            |
| H2  | Park `Alert.Indicator` hardcodes the info glyph, so `AlertBanner` on `status="error"` shows "i"                                                            | Fix      | Render the status icon in `AlertBanner` instead of the Indicator |
| H3  | `ChartCard`'s toggle swaps both its name and `aria-pressed`; gauges use `role="img"` so the visible "70%" is not read separately                           | Drop     | Spec rulings                                                     |
| H4  | Recharts `ResponsiveContainer initialDimension` is 600px until ResizeObserver fires                                                                        | Document |                                                                  |
| H5  | Line-chart end labels have no collision avoidance; `Legend align` is deprecated in Recharts 3.10; a stacked column is not rounded when the top series is 0 | Document |                                                                  |
| H6  | `StatusGrid` mounts one lazy Ark Tooltip per cell (48 on the demo)                                                                                         | Document |                                                                  |
| H7  | Captions render `sm` under titles (spec said `xs` on the right); `ProgressList` and `RankedBars` key rows by label                                         | Drop     |                                                                  |
| H8  | `SegmentedBar` segments past the fifth share `gray.8`                                                                                                      | Document |                                                                  |
| H9  | The live event stream pauses only on hover or focus-within; no visible pause control                                                                       | Fix      | Reuse the Deployments events tab's reader pause                  |
| H10 | The Capacity card's text column wraps narrowly beside the gauge at 1024px                                                                                  | Document |                                                                  |
| H11 | Test gaps: end-label ≤ 4 rule, area variant, `defaultCollapsed`, drawer auto-close past `md`, `useLiveEvents`, an empty `rows` table                       | Fix      | A tests task                                                     |
| H12 | The shell's help and notifications `IconButton`s have no callback props                                                                                    | Fix      | Inert controls; add `onHelp` and `onNotifications`               |
| H13 | `AppShellProvider` is exported but inert without `AppShell`; rail labels render full width on the server between `md` and `lg` until hydration             | Document |                                                                  |
| H14 | Demo deviations by ruling: 48 node cells = 44 good; `QuickActions` is exported but not on the page                                                         | Drop     |                                                                  |

## Auth pages (2026-11-09)

| #   | Item                                                                                                                   | Proposed | Why        |
| --- | ---------------------------------------------------------------------------------------------------------------------- | -------- | ---------- |
| U3  | The `.dark, .light` globalCss rule resets `colorPalette` to gray at every forced-color boundary                        | Drop     | Fine today |
| U5  | The panel backdrop does not dim the auth drawer                                                                        | Drop     |            |
| U6  | README states Zag's initial-focus ordering (tied to Zag 1.47); Ark merges the Heading ref under `Drawer.Title asChild` | Drop     |            |

## Tooling, CI, preview infrastructure (2026-11-09)

| #   | Item                                                                                                                                                                          | Proposed | Why                                                                      |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------------ |
| T1  | Export surface review before publishing: `StatusActionButton`, `AppShellProvider`, `QuickActions`, the forum helpers, unused Deployments exports                              | Document | A publishing-phase decision                                              |
| T2  | `pnpm test:e2e` silently reuses a running `pnpm dev` on :3000 (`reuseExistingServer: !CI`), contradicting the docs                                                            | Fix      | Run e2e on :3100 against the built preview, `reuseExistingServer: false` |
| T3  | `watch` runs codegen once; recipe and token changes need `make codegen`                                                                                                       | Fix      | Add `panda codegen --watch`                                              |
| T4  | `pnpm-workspace.yaml` `minimumReleaseAgeExclude` pins are dated housekeeping                                                                                                  | Fix      | Remove                                                                   |
| T5  | CI: no `timeout-minutes`, Playwright browsers not cached, actions pinned by tag not SHA                                                                                       | Fix      | Small workflow edit                                                      |
| T6  | Containerfile: base tag `latest` unpinned (plan-mandated); pnpm version duplicated from `packageManager`; `public/` copy depends on `.gitkeep`                                | Fix      | Dedupe the pnpm version; the rest stays                                  |
| T7  | `next.config.ts` relies on Next compiling to CJS for `__dirname`; tripwire: `.next/standalone/apps/preview/server.js` must exist after build                                  | Document |                                                                          |
| T8  | The sync script's barrel writer: `appendExport` merges non-`export … from` text; dedupe keyed on the whole statement; imports unsorted; palette scan covers recipe files only | Document |                                                                          |
| T9  | The theme toggle exposes no state; the component pages omit ButtonGroup, CloseButton, Fieldset, InputGroup, Spinner, Loader, Icon                                             | Fix      | Add them to the component pages                                          |
| T10 | e2e covers panel close via link, history back and Escape, but not the close button click                                                                                      | Fix      | One test                                                                 |
| T11 | Historical notes in the scaffold spec and plan (font caveat, pre-ruling font string)                                                                                          | Drop     | Spec, README and tests are the living sources                            |

## Park UI upstream quirks

| #   | Item                                                                                                                 | Proposed | Why                                                            |
| --- | -------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------------------------------------------- |
| P1  | `field.ts` `requiredIndicator.color: 'colorPalette.solid'` is not a token (invisible with a neutral accent)          | Fix      | A port transform to `colorPalette.solid.bg` in the sync script |
| P2  | `PasswordInput`'s trigger height mismatches `Input` at size `2xs`                                                    | Fix      | `insetY=0` or `height=var(--input-height)`                     |
| P3  | `SkeletonCircle` renders `l2` corners instead of a circle (recipe variant conflict)                                  | Fix      | A port transform or a local override                           |
| P4  | `Alert.Indicator` has no children slot (see H2); the `select` recipe's `dropdown` layer sits below `Drawer` (see H1) | Document | Candidate port transforms                                      |
