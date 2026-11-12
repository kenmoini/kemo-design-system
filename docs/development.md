# Development

## Dev workflow

`make dev` first runs `pnpm --filter @kemo/ui lib`, then starts two watchers together with
`concurrently`:

- `pnpm --filter @kemo/ui watch` runs `panda codegen && panda lib --watch`. `panda lib --watch`
  re-emits the manifest in `packages/ui/dist/panda` whenever recipes or tokens change, but it does
  not re-run codegen. After adding a recipe variant or a token, run `make codegen` (or restart
  `make dev`) so the generated `styled-system` code knows about it.
- `pnpm --filter @kemo/preview dev` runs Next.js (Turbopack) with the Panda PostCSS plugin.

`lib` runs first because the preview's `panda codegen` reads the design-system manifest
(`dist/panda/lib.json`) through `designSystem: '@kemo/ui'`. Without it Panda fails with
`design_system_manifest_not_found`. `pnpm install` only runs `panda codegen` in `packages/ui` (its
`prepare` script), not `panda lib`, which is why `make install` also runs `lib`.

CSS from a change in `packages/ui` can lag: the edit is picked up by `panda lib`, which rewrites
the manifest, and only then does the preview's Panda plugin regenerate CSS. Give it a moment
before assuming a change did not apply.

`make build` builds `@kemo/ui` and then the preview. `make start` runs `next start` on the result.
The preview uses `output: 'standalone'`, so `next start` prints a warning about it. It still
serves; the container runs the real standalone server.

`next dev` and `next build` download DM Sans through `next/font/google`, so they need outbound
network access.

## Testing

| Command                         | What it runs                                                                       |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `make test` (`pnpm test`)       | Vitest in `packages/ui` and `apps/preview`, then Node's test runner for `scripts/` |
| `pnpm test:scripts`             | Only the `scripts/park-ui` tests                                                   |
| `make e2e-install`              | Once: installs Chromium for Playwright (`pnpm e2e:install`)                        |
| `make e2e` (`pnpm test:e2e`)    | Builds, then runs the Playwright smoke suite in `apps/preview/e2e`                 |
| `make check`                    | Lint, format check, typecheck and unit tests                                       |
| `make gallery` (`pnpm gallery`) | Builds, then captures the screenshot gallery into `docs/gallery` (see below)       |

The e2e suite loads every route (landing page, auth pages, component pages, dashboard, Access tabs,
Deployments pages, FAQ, Blank page, blog pages and status pages) and fails on any console error or uncaught page error. It also checks the
theme (font, radii), dark mode through the preview panel's theme toggle, and that the panel
navigates, closes and marks the current page. On the auth pages, where any uncaught page error (such
as an escaped `onSubmit` rejection) fails the test, it checks validation and the mock error on every
form, the sent state and that its heading takes focus, the read-only email, that a click on the
terms link leaves the checkbox alone, and that the drawer stays dark in a light host, ignores
Escape, fills a 375px viewport with the paired fields stacked, and leaves the preview panel usable.
On the dashboard it checks the shell's landmarks and the nine card titles, the chart's table toggle,
that dark mode changes the series colours, the icon rail just below `lg` (1023px), the navigation
drawer and no horizontal overflow at 375px, and that the live event stream grows. On the status and
console pages it checks that the 404 heading is light on the gradient with both actions and no
overflow at 375px, that an unknown URL answers 404 with the status page, that the error boundary
shows the 500 page and "Try again" renders the route again, the maintenance window, and that the FAQ
index jumps to a topic and marks it current (also the last topic at 1440×900, which the page cannot
scroll to the top) and a question's anchor sets the hash. On the Access page it checks that the tabs
are links that mark the current tab, that the users table searches and filters, that "Bulk actions"
follows the selection, adding a user through the dialog and disabling one from its row menu, the
Overview widgets, the Audit layout and the OIDC sync badges, that an unknown tab answers 404, and
at 375px the scrolled tab strip, the "Filters" drawer and no horizontal overflow. On the
Deployments pages it checks that a cluster scope narrows the list and survives a reload, the labels
filter, opening a Deployment from the list, switching the related kinds, editing replicas in the
YAML editor and saving after a trip to the Overview (the draft is still there), that a schema
problem blocks Save, that the schema browser follows the cursor, that "Download clean YAML" has no
`resourceVersion` or `status`, the Events filters, and at 375px the stacked scope pickers, the
"Filters" drawer and no horizontal overflow. On the blog pages
it checks every variation from index to post and back and the topic filter, pagination, the
subscribe dialog and rail (and its failure) and that focus lands on the confirmation, posting a
comment and a reply (focus returns to Reply) and posting without `crypto.randomUUID`, a rejected and
a long comment, the empty state, the Magazine post's centred reading column, the Journal's current
section, its rail resting above Copy link at the end of the post, and at 375px its rail and a Tab
order that runs down the page, Copy link and dark mode. It runs against a built preview, so build first (`make e2e` does).

## Screenshot gallery

[docs/gallery](gallery/README.md) holds a full-page screenshot of every preview page, grouped by
family (one per guide), with a generated README that links each family to its guide. The capture is
a Playwright run driven by the manifest in `apps/preview/gallery/manifest.ts`
(`apps/preview/playwright.gallery.config.ts`): one test per page and theme loads the route on a
built preview, waits for hydration, the h1, fonts and network idle, hides the preview panel's
trigger, runs the entry's optional `setup` step (open a dialog, press a toggle), and saves
`docs/gallery/<family>/<id>.png` and `<id>.dark.png` at a 1440×900 viewport, one per host theme
(dark mode comes from `prefers-color-scheme`, which next-themes follows). Pages that force dark
mode (auth, status) set `themes: ['light']` and are captured once. After the run,
`gallery/write-index.ts` rewrites `docs/gallery/README.md` from the manifest, so the README is
generated (Prettier ignores it) and the manifest is the only place to edit.

`make gallery` builds first, then captures; `pnpm gallery` captures against the existing build.
The run serves the build on port 3100 so a `next dev` on 3000 is left alone. `GALLERY_ONLY`
limits a run to family ids, shot ids or both (`GALLERY_ONLY=blog,deployments/yaml pnpm gallery`,
or `make gallery ONLY=blog`) and `GALLERY_THEMES=dark` to one theme; the index is still rewritten in full, with a "not captured yet" cell
for any shot whose PNG is missing. Live widgets (event streams, the demo clock) make a re-capture
differ pixel for pixel, so re-run only the family you changed and commit its PNGs with the index.

Every page or component phase ends with a gallery entry: add the route (and a `setup` for a state
worth showing) to the manifest, capture it, check the PNG, and commit it with the code. Mock data
is what the pages show, so keep the manifest's ids (the Deployment name, the post slug) in step
with the mocks; an entry with a `heading` fails instead of saving a client-side 404.

## CI

GitHub Actions runs three jobs:

- `check`: install, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`
- `e2e`: `pnpm build`, `pnpm e2e:install`, `pnpm test:e2e`
- `container`: builds the image with the Containerfile and pushes it to GHCR

All of it can be reproduced locally with `make`.

## Container

The Containerfile builds on a UBI 9 Node 24 image, runs the Next.js standalone server on port
8080 as user 1001, and is built with `make container-build` and run with `make container-run`.
`CONTAINER_ENGINE` (default `podman`) and `IMAGE` (default `kemo-design-system:local`) can be
overridden, for example `make container-build CONTAINER_ENGINE=docker`. The build needs network
access because `next build` fetches DM Sans from Google Fonts.
