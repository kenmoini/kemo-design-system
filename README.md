# kemo-design-system

A React design system and the live preview app used to design with it. `@kemo/ui` is a Park UI
component library (Ark UI headless components styled with Panda CSS recipes) with a fixed theme.
`@kemo/preview` is a Next.js app that renders a component gallery and stub routes for the first
page set to build: Login, Forgot Password, Register and Complete Profile (for OIDC logins whose
scopes or mappers leave the profile incomplete). Other Kemo apps are meant to consume `@kemo/ui`
so a token or component change lands everywhere.

This repository is the scaffold: tooling, theme, components, preview and CI. The visual design of
the auth pages comes later (see [Roadmap](#roadmap)).

## Stack and design language

| Setting              | Value                                         | Where it lives                                                                                                                                    |
| -------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Component foundation | Park UI (Ark UI headless + Panda CSS recipes) | `packages/ui/src/components/ui`, `packages/ui/src/theme`                                                                                          |
| Font family          | DM Sans                                       | `fonts.body` / `fonts.heading` tokens resolve to `var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif`; the preview sets the var |
| Gray color           | Neutral (Radix 12-step)                       | `semanticTokens.colors.gray` aliases `neutral`                                                                                                    |
| Accent color         | Neutral                                       | `html { colorPalette: 'gray' }` in the global CSS                                                                                                 |
| Radius               | XS                                            | `radii.l1 = 0.0625rem`, `l2 = {radii.xs}` (0.125rem), `l3 = {radii.sm}` (0.25rem)                                                                 |

Palettes shipped with the theme: neutral, red, green, blue, orange.

Main versions: Next.js 16.4.5, React 19.3.1, Panda CSS 2.5.0, Ark UI 5.40.0, TypeScript 5.9.3,
Vitest 5.1, Playwright 1.65, ESLint 10, Prettier 3.9, pnpm 12.4.2. Node 24 is what CI and the
container use; the repo requires Node >= 24 and works on newer releases.

## Repo layout

```
apps/preview/        @kemo/preview: Next.js gallery, auth route stubs, Playwright e2e suite
packages/ui/         @kemo/ui: theme, Park UI components, Panda config (`panda lib` output in dist/)
scripts/park-ui/     Park UI registry sync and the Panda v2 port transform (with tests)
docs/superpowers/    Design spec for the scaffold
Makefile             Front door for every task below
```

## Quickstart

```sh
make install && make dev
```

Open http://localhost:3000. `make help` lists every target. Every target is a thin wrapper over a
`pnpm` script, so `pnpm dev`, `pnpm build` and so on work the same way.

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

## Adding Park UI components

Components are copied from Park UI's public registry into `packages/ui/src/components/ui` and owned
in-repo.

```sh
make park-ui-add COMPONENTS="dialog menu"
pnpm format
```

The target runs `node scripts/park-ui/sync.mjs add dialog menu` followed by `panda codegen` in
`@kemo/ui`. It needs network access. `pnpm park-ui init|add <ids...> [--force] [--with-colors]|port`
exposes the script directly. Existing files that differ from the registry are skipped unless you
pass `--force`.

`--force` overwrites the requested items' files where they differ from the registry. The port
still runs, but any other local edit to a Park file is lost, so check `git diff` after a forced run.
`packages/ui/src/theme/tokens/fonts.ts` (DM Sans) and `packages/ui/src/theme/radii.ts` (XS radii)
are ours even though they sit at Park theme paths. Park's `__init` does not ship them today; if it
ever does, `pnpm park-ui init --force` will overwrite them.

`init` and `add` print a line such as `note      card needs packages: @ark-ui/react, react` for
each registry item with npm dependencies. The script does not install them: add any that
`packages/ui/package.json` does not already list with `pnpm --filter @kemo/ui add <pkg>`.

Park's registry targets Panda v1, so the script ports each file to the v2 API:

- `createStyleContext` becomes `createSlotRecipeContext`
- type imports from `@pandacss/dev` become `@pandacss/types`
- bare `styled-system/*` imports become relative imports
- the checkbox control nesting is fixed
- `'PasswordInput'` is added to the input recipe's `jsx` list
- `Card.Footer` renders a `div` instead of Park's `h3`, so footer buttons are not inside a heading

It also scans the incoming recipes for color palettes the theme does not ship. Park's alert recipe,
for example, needs blue and orange. A missing palette stops the add and tells you to re-run with
`--with-colors` so the palette is copied in. Keep the palette set deliberate: adding one grows
every consumer's CSS.

`make park-ui-port` re-applies the port to files already in the repo. Run `pnpm format` after an
add, because the barrel files are written unformatted.

## Consuming @kemo/ui from another app

`@kemo/ui` is not published yet (see [Roadmap](#roadmap), item 3), so for now only apps inside
this workspace (`apps/*` or `packages/*`) can consume it, the way `apps/preview` does.

1. Add `"@kemo/ui": "workspace:*"` to the app's dependencies, and the dev dependencies
   `@pandacss/dev`, `@pandacss/preset-base` and `@pandacss/preset-panda` (all `^2.5.0`).
2. Point Panda at the package. No presets are needed, and `@kemo/ui` must not be in `include`.
   Set `jsxFramework: 'react'`, as the preview does: it is the setting that makes Panda extract
   style props and recipe variants from JSX. The library's preset carries the same value; stating
   it keeps the app's config explicit.

   ```ts
   // panda.config.ts
   import { defineConfig } from '@pandacss/dev'

   export default defineConfig({
     designSystem: '@kemo/ui',
     include: ['./src/**/*.{ts,tsx}'],
     outdir: 'styled-system',
     jsxFramework: 'react',
   })
   ```

   Do not set `prefix` or `hash`. The components get their class names at runtime from
   `packages/ui/styled-system`, which is generated from the library's config (neither option is
   set there), so the app's CSS has to use the same class names. If they differ, Panda warns with
   `design_system_option_mismatch` and the components render unstyled.

3. Run `panda codegen` before `dev`, `build` and `typecheck`; the preview does it in its `predev`,
   `prebuild` and `pretypecheck` scripts. Codegen writes the app's own `styled-system/`, and that
   is where `css`, `cva`, `styled`, `Stack` and the other helpers come from: its `css`, `jsx`,
   `patterns` and `recipes` modules re-export the matching `@kemo/ui/*` modules. Importing from
   `@kemo/ui/css`, `@kemo/ui/jsx`, `@kemo/ui/patterns`, `@kemo/ui/recipes` or `@kemo/ui/tokens`
   directly works too; Panda extracts styles from both import paths.
4. Use the PostCSS plugin `@pandacss/dev/postcss` and declare the layer order in the global CSS:

   ```css
   @layer reset, base, tokens, recipes, utilities;
   ```

5. Transpile the package. Its main export is TypeScript source (`"."` in
   `packages/ui/package.json` points at `./src/index.ts`), so the app's bundler has to compile it.
   In Next.js:

   ```ts
   // next.config.ts
   const nextConfig = { transpilePackages: ['@kemo/ui'] }
   ```

   With another bundler, make sure it transpiles TypeScript and TSX from `@kemo/ui` instead of
   treating the package as prebuilt JavaScript.

6. Provide DM Sans. The `fonts.body` and `fonts.heading` tokens are
   `var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif`. In Next.js use
   `next/font/google` (`DM_Sans` with `variable: '--font-dm-sans'`) and put its class on `<html>`.
   Elsewhere, a Google Fonts `<link>` or `@fontsource/dm-sans` registers the family as `DM Sans`,
   which the tokens pick up without the variable. `@fontsource-variable/dm-sans` registers
   `DM Sans Variable` instead, so with it set `--font-dm-sans: 'DM Sans Variable'`. If no DM Sans
   is loaded, text falls back to `ui-sans-serif, system-ui, sans-serif`.

Panda's `jsx` tracking covers the Park components by name. Add `staticCss: { recipes: '*' }` to
the app config only if you need every recipe variant pre-generated; the preview does, for the
gallery.

## Testing

| Command                      | What it runs                                                       |
| ---------------------------- | ------------------------------------------------------------------ |
| `make test` (`pnpm test`)    | Vitest in `packages/ui`, then Node's test runner for `scripts/`    |
| `pnpm test:scripts`          | Only the `scripts/park-ui` tests                                   |
| `make e2e-install`           | Once: installs Chromium for Playwright (`pnpm e2e:install`)        |
| `make e2e` (`pnpm test:e2e`) | Builds, then runs the Playwright smoke suite in `apps/preview/e2e` |
| `make check`                 | Lint, format check, typecheck and unit tests                       |

The e2e suite covers the gallery and auth routes, the theme (font, palette, radii) and dark mode.
It runs against a built preview, so build first (`make e2e` does).

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

## Roadmap

1. Design phase for the four auth pages (Login, Forgot Password, Register, Complete Profile),
   worked out against the live gallery in `apps/preview`.
2. Page templates under `packages/ui/src/pages`, exported from `@kemo/ui`.
3. Publishing `@kemo/ui`, once the package prefix is decided.
