# Design: kemo-design-system scaffold

Date: 2026-11-09. Status: approved (plan-mode review, builder check applied).

## Intent

A shared, pluggable UI foundation for a family of applications on one extendible platform. Every
app uses the same design language and consumes the same package, so a change to a token or a
component lands everywhere. The first deliverable is a set of example pages to build on, starting
with authentication: Login, Forgot Password, Register, Complete Profile (for OIDC logins whose
scopes or mappers leave the profile incomplete).

This document covers the **scaffold**: monorepo, design-system package, live preview server,
dependencies, and CI (Makefile, GitHub Actions, lint, tests, Containerfile, README). The visual
design of the four auth pages is a separate, later brainstorm against the live preview.

## Design language (fixed by the owner)

| Setting              | Value                                         | Where it lives                                                                                     |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Framework            | React 19 / Next.js 16 (App Router)            | `apps/preview`, consumer apps                                                                      |
| Component foundation | Park UI (Ark UI headless + Panda CSS recipes) | `packages/ui/src/components/ui`, `packages/ui/src/theme`                                           |
| Font family          | DM Sans                                       | `fonts.body`/`fonts.heading` tokens → `var(--font-dm-sans)`; preview sets the var with `next/font` |
| Gray color           | Neutral (Radix 12-step)                       | `semanticTokens.colors.gray` aliases `neutral`                                                     |
| Accent color         | Neutral                                       | `html { colorPalette: 'gray' }` (Park's global CSS)                                                |
| Radius               | XS                                            | `radii.l1 = 0.0625rem`, `l2 = {radii.xs}` (0.125rem), `l3 = {radii.sm}` (0.25rem)                  |

## Goals

- One `pnpm` workspace: `packages/ui` (`@kemo/ui`, publishable) and `apps/preview` (`@kemo/preview`,
  the live dev preview and the surface for design work).
- Panda CSS **v2** with the official design-system workflow: the package runs `panda codegen && panda lib`;
  apps set `designSystem: '@kemo/ui'`.
- Park UI components arrive from Park's public registry and are owned in-repo (Park's model), ported
  to the Panda v2 API by a scripted, idempotent transform.
- A component gallery page that proves the theme (font, palette, radii, dark mode) and stub routes
  for the four auth pages.
- CI that a newcomer can run locally with `make`: lint, format, typecheck, unit tests, e2e smoke,
  container image.

## Non-goals (this scaffold)

- Visual design or implementation of the auth page templates (next phase).
- Real authentication (pages stay presentational with pluggable `onSubmit`; preview uses mocks).
- Publishing `@kemo/ui` to a registry; Storybook; visual regression.

## Anti-goals

- A fork of Park UI we have to maintain. Files are copied from the registry and only mechanically
  ported; re-syncing must stay a one-command operation.
- Hidden theme magic. Tokens, recipes and the Panda config are plain files in `packages/ui`.
- Interactive-only setup steps. Everything runs non-interactively (CI, agents).

## Decisions

1. **Panda v2 (2.5.0), not v1.** Park UI's registry targets Panda v1 (`createStyleContext`,
   `RecipeConfig` from `@pandacss/dev`). The port is three rewrites plus one upstream bug fix;
   a community fork verified the registry on Panda 2.5.0 with exactly these changes.
2. **Own sync script instead of `@park-ui/cli`.** The CLI is interactive-only, emits v1 code, and
   always writes the `sm` radius scale. `components.json` stays CLI-compatible for humans.
3. **Relative `styled-system` imports inside `packages/ui`.** Next.js does not honor a workspace
   package's own `tsconfig.paths`; bare `styled-system/*` and `~/*` imports are forbidden in
   `packages/ui/src`. (`~/*` is allowed only in `panda.config.ts`, which Panda loads itself.)
4. **`staticCss: { recipes: '*' }` lives in the preview app only.** `panda lib` bakes the library
   config into `preset.mjs`; putting it in the library would force every consumer to emit every variant.
5. **No Panda `prefix` yet.** Decide before publishing; consumers must then match.
6. **Font contract:** the host defines `--font-dm-sans`. Preview uses `next/font/google` (needs
   network at `next build`). Non-Next hosts load `@fontsource-variable/dm-sans` or a `<link>`.
7. **Node 24** for CI and containers (`registry.access.redhat.com/ubi9/nodejs-24-minimal`; no Node 26
   UBI image yet). `engines.node >= 24`. TypeScript pinned to 5.9.x (typescript-eslint peer `< 6.1`).
8. **Tooling:** pnpm 12, ESLint 10 flat config + Prettier 3, Vitest 5 + Testing Library, Playwright,
   Podman + Buildah, GHCR for images.
9. **Palettes fetched at init:** `neutral red green blue orange`. Park's `alert` recipe hardcodes
   `blue` (info) and `orange` (warning); the registry does not declare color dependencies, so the
   sync script scans recipes for `colorPalette: '<name>'` and refuses to leave a palette missing.

## Left to the builder

- Internal structure of the gallery page and auth-route stubs (content is fixed: `h1` plus a note).
- Exact ESLint rule set beyond the named configs; Prettier options are fixed.
- `PasswordInput` internals (Ark `PasswordInput` parts styled with Park's `input` recipe; trigger
  aligned with `Input` sizes).
- Test selectors (prefer `data-scope`/`data-part` from Ark over class names).

## References

- Implementation plan: `docs/superpowers/plans/2026-11-09-design-system-scaffold.md`
- Park UI registry: `https://park-ui.com/registry/react/index.json`
- Panda design systems: `https://panda-css.com/docs/design-systems/build-a-design-system`
- Official monorepo example: `https://github.com/chakra-ui/panda-examples/tree/main/examples/monorepo`
