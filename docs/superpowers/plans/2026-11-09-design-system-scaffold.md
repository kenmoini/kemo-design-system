# Design System Scaffold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the `kemo-design-system` monorepo: a Park UI + Panda CSS v2 design-system package, a Next.js 16 live preview with a component gallery and auth-route stubs, and full CI (Makefile, GitHub Actions, lint, unit + e2e tests, Containerfile, README).

**Architecture:** `packages/ui` (`@kemo/ui`) owns tokens, Park UI recipes/components and runs `panda codegen && panda lib`; `apps/preview` (`@kemo/preview`) consumes it through `designSystem: '@kemo/ui'` and Next.js `transpilePackages`. A dependency-free Node script syncs Park UI's public registry into the package and ports files to the Panda v2 API.

**Tech Stack:** pnpm 12 workspaces, Node 24 (local 26 ok), TypeScript 5.9, Next.js 16.4 (Turbopack), React 19.3, Panda CSS 2.5, Ark UI 5.40, lucide-react, Vitest 5 + Testing Library, Playwright 1.65, ESLint 10 + Prettier 3, Podman/Buildah on UBI 9 Node 24, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-09-design-system-scaffold-design.md`

## Global Constraints

- Versions (verified 2026-11-09): next 16.4.5, react/react-dom 19.3.1, @pandacss/* 2.5.0, @ark-ui/react 5.40.0, lucide-react 1.70.0, typescript `~5.9.3` (never 7.x), eslint 10.14.0, eslint-config-next 16.4.5, typescript-eslint 8.72.1, prettier 3.9.10, vitest 5.1.0, jsdom 31.0.0, @vitejs/plugin-react 6.3.0, @testing-library/react 16.3.3, @testing-library/jest-dom 7.0.1, @testing-library/user-event 14.6.8, @playwright/test 1.65.0, next-themes 0.4.6, zod 4.6.7, react-hook-form 7.91.0, @hookform/resolvers 7.0.5.
- `engines.node >= 24`; `packageManager` pinned to the exact installed pnpm 12 (`pnpm -v`).
- Package names: `@kemo/ui`, `@kemo/preview`. Root is private.
- Prettier: `semi: false, singleQuote: true, printWidth: 100, trailingComma: 'all'`.
- Inside `packages/ui/src`: no `~/*` imports and no bare `styled-system/*` imports (relative only). `~/*` is allowed in `packages/ui/panda.config.ts` only.
- `staticCss` only in `apps/preview/panda.config.ts`. No Panda `prefix`. `@kemo/ui` never appears in any `include`.
- Theme values: `fonts.body`/`fonts.heading` = `var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif`; `radii.l1 = 0.0625rem`, `l2 = {radii.xs}`, `l3 = {radii.sm}`; `gray` aliases `neutral`; `html { colorPalette: 'gray' }`.
- Palettes at init: `neutral red green blue orange`.
- Generated folders (`styled-system/`, `dist/`, `.next/`) are gitignored; `packages/ui/package.json` `exports` written by `panda lib` are committed.
- Every file passes `pnpm lint` and `pnpm format:check`; every task ends green on the checks that exist at that point.

## Review Focus

1. Host without `--font-dm-sans` (non-Next consumer, font load failure): text must still render in a sans-serif fallback. Test added to Task 2 (`theme.test.ts` asserts the fallback stack follows the var).
2. Re-running the sync after a local edit to a Park file: the edit must survive unless `--force`. Test added to Task 3 (`writeIfUnchanged` skips differing files and reports them).
3. A recipe referencing a palette that was never fetched (Park `alert` → `blue`, `orange`): the sync must fail loudly, not emit unknown-token CSS. Test added to Task 3 (`findMissingPalettes`).
4. Dark mode must actually restyle, not just toggle a class: Task 7 e2e asserts `body` background differs between light and dark.
5. Container runtime must serve static assets, not just HTML (a missed `COPY` of `.next/static` or `public` yields unstyled pages): Task 9 verification fetches a `/_next/static/*.css` URL from the served HTML and expects 200.

---

### Task 1: Workspace root

**Files:**

- Create: `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `eslint.config.mjs`, `.prettierrc`, `.prettierignore`, `.editorconfig`, `.gitignore`, `.nvmrc`
- Already present: `docs/superpowers/specs/2026-11-09-design-system-scaffold-design.md`, this plan

**Interfaces:**

- Produces: root scripts `lint`, `lint:fix`, `format`, `format:check`, `typecheck` (`pnpm -r typecheck`), `test` (`pnpm -r test`), `clean`. `dev`/`build`/`test:e2e` are added in Task 8 once both packages exist.
- Produces: `tsconfig.base.json` (strict, ES2022, `moduleResolution: bundler`, `jsx: react-jsx`, `isolatedModules`, `skipLibCheck`, `noUncheckedIndexedAccess`, `resolveJsonModule`) for both packages to extend.
- Produces: `eslint.config.mjs` using `defineConfig`/`globalIgnores` from `eslint/config`, `@eslint/js` recommended, `typescript-eslint` recommended, `eslint-config-prettier` last, ignores `**/styled-system/**`, `**/dist/**`, `**/.next/**`, `**/playwright-report/**`, `**/test-results/**`. Later tasks append scoped blocks.

- [ ] **Step 1: Write root files.** `pnpm-workspace.yaml` lists `packages/*` and `apps/*`. Root `package.json`: `"private": true`, `"type": "module"`, `packageManager` = exact `pnpm@$(pnpm -v)`, `engines.node ">=24"`, scripts above, devDeps: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier`, `typescript ~5.9.3`, `concurrently`. `.nvmrc` = `24`. `.gitignore`: `node_modules`, `**/styled-system`, `**/dist`, `**/.next`, `playwright-report`, `test-results`, `coverage`, `.env*.local`, `*.tsbuildinfo`.
- [ ] **Step 2: Install.** Run: `pnpm install`. Expected: lockfile created, no errors. If pnpm 12 reports blocked build scripts, approve them in `pnpm-workspace.yaml` (pnpm's prompt names the key) rather than allowing all.
- [ ] **Step 3: Verify lint/format load.** Run: `pnpm lint && pnpm format:check`. Expected: both exit 0 (no source yet; config must parse).
- [ ] **Step 4: Commit** `chore: bootstrap pnpm workspace, lint and format config` (include the spec and this plan).

---

### Task 2: `packages/ui` skeleton with the Panda v2 lib pipeline

**Files:**

- Create: `packages/ui/package.json`, `packages/ui/tsconfig.json`, `packages/ui/components.json`, `packages/ui/vitest.config.ts`, `packages/ui/panda.config.ts` (minimal; Task 4 completes it), `packages/ui/src/index.ts`, `packages/ui/src/theme/tokens/fonts.ts`, `packages/ui/src/theme/radii.ts`, `packages/ui/src/test/setup.ts`
- Test: `packages/ui/src/theme/theme.test.ts`

**Interfaces:**

- Produces: `@kemo/ui` scripts `prepare` (`panda codegen`), `codegen`, `lib` (`panda codegen && panda lib`), `watch` (`panda codegen && panda lib --watch`), `typecheck`, `lint`, `test` (`vitest run`), `test:watch`.
- Produces: `fonts` (`defineTokens.fonts`) with keys `body`, `heading`, `mono`; `radii` (`defineSemanticTokens.radii`) with `l1`, `l2`, `l3`.
- Produces: `components.json` exactly as in the spec (`~/components`, `~/components/ui`, `~/theme`, `~/theme/recipes`, `~/hooks`, `~/lib`); `tsconfig.json` with `baseUrl: "."`, `paths: { "~/*": ["./src/*"] }`, `include: ["src", "panda.config.ts", "styled-system", "vitest.config.ts"]`.
- Deps: `@ark-ui/react`, `lucide-react`, `zod`, `react-hook-form`, `@hookform/resolvers`. DevDeps: `@pandacss/dev`, `@pandacss/preset-base`, `@pandacss/preset-panda`, `@pandacss/types`, `react`, `react-dom`, `@types/react`, `@types/react-dom`, `typescript`, `vite`, `vitest`, `jsdom`, `@vitejs/plugin-react`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`. PeerDeps: `react >=18`, `react-dom >=18`, `@pandacss/dev ^2.0.0`.

- [ ] **Step 1: Write the failing test** `packages/ui/src/theme/theme.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { token } from '../../styled-system/tokens'

describe('theme tokens', () => {
  it('fonts point at the DM Sans variable with a sans-serif fallback', () => {
    expect(token('fonts.body')).toBe('var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif')
    expect(token('fonts.heading')).toBe(token('fonts.body'))
  })
  it('uses the XS radius scale', () => {
    expect(token('radii.l1')).toBe('0.0625rem')
    expect(token('radii.l2')).toBe('0.125rem')
    expect(token('radii.l3')).toBe('0.25rem')
  })
})
```

- [ ] **Step 2: Run it to see it fail.** Run: `pnpm --filter @kemo/ui test`. Expected: FAIL (cannot resolve `../../styled-system/tokens`).
- [ ] **Step 3: Write package files.** `panda.config.ts` (minimal): `presets: ['@pandacss/preset-base', '@pandacss/preset-panda']`, `preflight: true`, `include: ['./src/**/*.{ts,tsx}']`, `outdir: 'styled-system'`, `jsxFramework: 'react'`, `theme.extend.tokens.fonts` from `~/theme/tokens/fonts`, `theme.extend.semanticTokens.radii` from `~/theme/radii`. `vitest.config.ts`: `@vitejs/plugin-react`, `environment: 'jsdom'`, `setupFiles: ['src/test/setup.ts']`, `include: ['src/**/*.test.{ts,tsx}']`. `setup.ts`: `import '@testing-library/jest-dom/vitest'`. `src/index.ts`: `export { fonts } from './theme/tokens/fonts'` and `export { radii } from './theme/radii'`.
- [ ] **Step 4: Install and generate.** Run: `pnpm install && pnpm --filter @kemo/ui lib`. Expected: `packages/ui/styled-system/` exists; `packages/ui/dist/panda/lib.json`, `preset.mjs`, `buildinfo.json` exist; `package.json` `exports` now contains `./panda/*`, `./css`, `./jsx`, `./recipes`, `./tokens`, `./types`, `./helpers`.
- [ ] **Step 5: Run the test.** Run: `pnpm --filter @kemo/ui test`. Expected: PASS (2 tests).
- [ ] **Step 6: Typecheck and lint.** Run: `pnpm typecheck && pnpm lint && pnpm format:check`. Expected: exit 0.
- [ ] **Step 7: Commit** `feat(ui): add @kemo/ui package with Panda v2 lib pipeline and DM Sans / XS radius tokens`.

---

### Task 3: Park UI registry sync + Panda v2 port script

**Files:**

- Create: `scripts/park-ui/port.mjs` (pure transforms), `scripts/park-ui/registry.mjs` (fetch + path mapping), `scripts/park-ui/sync.mjs` (CLI)
- Test: `scripts/park-ui/port.test.mjs`, `scripts/park-ui/registry.test.mjs` (Node built-in runner: `node --test scripts/park-ui/`)

**Interfaces:**

- Produces, in `port.mjs`:
  - `portSource(source: string, filePath: string, uiRoot: string): string` — applies transforms 1–4 below; idempotent.
  - `collapseCheckboxControl(source: string): string` — transform 4 only.
  - `checkPorted(source: string): string[]` — returns violation messages for `createStyleContext`, `from 'styled-system/`, `import type {…} from '@pandacss/dev'`; empty when clean.
  - `detectRecipeKind(source: string): 'recipe' | 'slotRecipe'` — `slotRecipe` when `defineSlotRecipe(` or a top-level `slots:` key is present.
  - `registerRecipe(indexSource: string, importLine: string, kind): string` — prepends the import (once) and adds the identifier to `export const recipes = {…}` or `slotRecipes = {…}` (once).
  - `appendExport(indexSource: string, exportLine: string): string` — appends once, sorted.
  - `appendColor(barrelSource: string, name: string): string` — adds `import { name } from './name'` and the key to `export const colors = {…}` once.
  - `findMissingPalettes(recipeSources: string[], available: string[]): string[]` — collects `colorPalette: '<name>'` literals not in `available` (dedupe, sorted).
- Produces, in `registry.mjs`:
  - `REGISTRY_BASE = 'https://park-ui.com/registry/react'`; `fetchItem(id): Promise<RegistryItem>`; `resolveItems(ids): Promise<RegistryItem[]>` (transitive `registryDependencies`, dedupe, preserves first-seen order).
  - `targetPath(file: { type, path }, paths: ResolvedPaths): string` where `ResolvedPaths` is derived from `components.json` aliases by replacing the `~/` prefix with `packages/ui/src/`: `registry:ui` → `ui`, `registry:recipe` → `recipes`, `registry:theme` → `theme`, `registry:color` → `theme/colors`, `registry:component`/`registry:block` → `components`.
  - `writeIfUnchanged(path, content, { force }): 'written' | 'unchanged' | 'skipped'` — `skipped` when an existing file differs and `force` is false.
- Produces CLI: `node scripts/park-ui/sync.mjs init [--force]`, `… add <id...> [--force] [--with-colors]`, `… port`. Exit 1 on any `checkPorted` violation or missing palette (unless `--with-colors` fetched them). Prints one line per file with its status.
- Transforms: (1) `createStyleContext` → `createSlotRecipeContext`; (2) `import type { … } from '@pandacss/dev'` → same names from `'@pandacss/types'` (type name unchanged); (3) `from 'styled-system/<x>'` → `from '<rel>/styled-system/<x>'` where `<rel>` = `path.relative(dirname(filePath), uiRoot)` (e.g. `../../..` for `src/components/ui/*.tsx`); (4) in the checkbox recipe, `control: {\n control: {` double nesting in the `solid` variant collapses to one `control:`.

- [ ] **Step 1: Write failing tests** `scripts/park-ui/port.test.mjs` (Node `node:test` + `node:assert/strict`) covering: `portSource` rewrites all three import forms for a file at `packages/ui/src/components/ui/card.tsx` (expects `../../../styled-system/jsx` and `createSlotRecipeContext`); `portSource` is idempotent (`portSource(portSource(s)) === portSource(s)`); `portSource` leaves `import { defineRecipe } from '@pandacss/dev'` untouched; `collapseCheckboxControl` on the upstream snippet yields a single `control` level; `checkPorted` flags each violation and returns `[]` on clean input; `detectRecipeKind` on `defineRecipe(`/`defineSlotRecipe(` sources; `registerRecipe` adds import and key once across two calls; `appendExport`/`appendColor` idempotent; `findMissingPalettes(["colorPalette: 'blue'", "colorPalette: 'gray'"], ['gray'])` → `['blue']`. And `scripts/park-ui/registry.test.mjs`: `targetPath` for each type; `writeIfUnchanged` returns `skipped` for a differing existing file (use `fs.mkdtempSync`), `written` with `force`, `unchanged` for identical content.
- [ ] **Step 2: Run to see them fail.** Run: `node --test scripts/park-ui/`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement `port.mjs` and `registry.mjs`** per the Interfaces block. Regex-based; no dependencies.
- [ ] **Step 4: Run tests.** Run: `node --test scripts/park-ui/`. Expected: PASS.
- [ ] **Step 5: Implement `sync.mjs`** (argument parsing with `node:util` `parseArgs`; `init` = `resolveItems(['__init','neutral','red','green','blue','orange'])`; after writing, run transforms over `packages/ui/src/components/ui/**/*.tsx` and `packages/ui/src/theme/**/*.ts`, then `checkPorted` and `findMissingPalettes` against `src/theme/colors/index.ts`).
- [ ] **Step 6: Add root script** `"park-ui": "node scripts/park-ui/sync.mjs"` and `"test:scripts": "node --test scripts/park-ui/"`; include `test:scripts` in root `test`. Run: `pnpm test`. Expected: PASS. Run: `pnpm lint && pnpm format:check`. Expected: exit 0.
- [ ] **Step 7: Commit** `feat(scripts): add Park UI registry sync with Panda v2 port transforms`.

---

### Task 4: First Park UI sync and the full theme config

**Files:**

- Create (by sync): `packages/ui/src/theme/{recipes/*,colors/*,tokens/*,animation-styles,conditions,global-css,keyframes,layer-styles,text-styles}.ts`, `packages/ui/src/components/ui/*.tsx`
- Create: `packages/ui/src/theme/colors/index.ts` (barrel, maintained by sync), `packages/ui/src/components/ui/index.ts` (barrel, maintained by sync)
- Modify: `packages/ui/panda.config.ts` (full config from spec Task 5 text in the approved plan), `packages/ui/src/index.ts`, `eslint.config.mjs` (add `await panda.configs.recommended({ configPath: './packages/ui/panda.config.ts', files: ['packages/ui/**/*.{ts,tsx}'] })`)
- Test: `packages/ui/src/components/ui/button.test.tsx`, `packages/ui/src/components/ui/field.test.tsx`, extend `theme.test.ts`

**Interfaces:**

- Consumes: Task 3 CLI; Task 2 `fonts`, `radii`.
- Produces: `@kemo/ui` exports every Park component via `export * from './components/ui'` (namespaced ones like `Card`, `Field`, `Alert`, `Checkbox`, `Fieldset`, `InputGroup`; flat ones like `Button`, `IconButton`, `Input`, `Heading`, `Text`, `Link`, `Badge`, `Skeleton`, `Spinner`, `Icon`, `CloseButton`).
- Produces: `semanticTokens.colors` includes `neutral`, `red`, `green`, `blue`, `orange`, `gray` (= neutral), `fg.{default,muted,subtle}`, `canvas`, `border`, `error`; `tokens.colors` includes Park's `black`/`white` alphas; `globalCss.html` carries `colorPalette: 'gray'`, `--global-font-body: fonts.body`, `--global-font-mono: fonts.mono`; plugin `Remove Panda Preset Colors`.

- [ ] **Step 1: Run the sync.** Run: `pnpm park-ui init && pnpm park-ui add button icon-button close-button input input-group field fieldset checkbox card heading text link alert spinner icon badge skeleton`. Expected: files written under `src/theme` and `src/components/ui`; `group`, `loader`, `span`, `absolute-center` pulled in; port guard and palette scan pass; exit 0.
- [ ] **Step 2: Extend the failing tests.** `theme.test.ts` adds: `token('colors.gray.9')` is a `var(--colors-neutral-9…)`-style reference (assert it is a non-empty string starting with `var(`), `token('colors.canvas')` defined, `token('colors.blue.9')` defined. `button.test.tsx`: render `<Button>Save</Button>` → `getByRole('button', { name: 'Save' })` has class containing `button`; render `<Button loading>Save</Button>` → disabled and `data-loading` attribute present. `field.test.tsx`: `<Field.Root invalid><Field.Label>Email</Field.Label><Input /><Field.ErrorText>Required</Field.ErrorText></Field.Root>` → the textbox has `aria-invalid="true"` and the error text is visible.
- [ ] **Step 3: Run tests to see them fail.** Run: `pnpm --filter @kemo/ui test`. Expected: FAIL (tokens undefined / components not generated).
- [ ] **Step 4: Write the full `panda.config.ts`** (spec decisions: presets, plugin, conditions, globalCss merge, tokens, semanticTokens, no `staticCss`, no `prefix`). Update `src/index.ts` to `export * from './components/ui'` plus the theme exports.
- [ ] **Step 5: Generate and typecheck.** Run: `pnpm --filter @kemo/ui lib && pnpm --filter @kemo/ui typecheck`. Expected: `panda codegen` reports no `nested_property` or unknown-token diagnostics; `tsc` clean. Fix any registry file the port missed (add a transform + test in Task 3's files rather than hand-editing).
- [ ] **Step 6: Run tests.** Run: `pnpm --filter @kemo/ui test`. Expected: PASS.
- [ ] **Step 7: Lint with the Panda plugin enabled.** Run: `pnpm lint && pnpm format:check`. Expected: exit 0 (format Park files with `pnpm format` if needed; they already match the Prettier settings).
- [ ] **Step 8: Verify idempotency.** Run: `pnpm park-ui port && git status --porcelain packages/ui/src`. Expected: no changes.
- [ ] **Step 9: Commit** `feat(ui): sync Park UI theme and auth-set components, complete Panda config`.

---

### Task 5: `PasswordInput`

**Files:**

- Create: `packages/ui/src/components/ui/password-input.tsx`
- Modify: `packages/ui/src/components/ui/index.ts` (`export { PasswordInput, type PasswordInputProps } from './password-input'`)
- Test: `packages/ui/src/components/ui/password-input.test.tsx`

**Interfaces:**

- Produces: `PasswordInput` — a single component: `PasswordInput.Root` props from `@ark-ui/react/password-input` plus `InputProps` size/variant (`size?: '2xs'|'xs'|'sm'|'md'|'lg'|'xl'|'2xl'`, `variant?: 'outline'|'surface'|'subtle'|'flushed'`), `placeholder`, `name`, `autoComplete` (`'current-password' | 'new-password'`, default `current-password`). Renders Ark `Root > Control > Input + VisibilityTrigger > Indicator` with the input styled via `styled(PasswordInput.Input, input)` and the trigger as `IconButton variant="plain" size={size}` positioned at the inline end (Eye / EyeOff icons from lucide, `aria-label` "Show password"/"Hide password").

- [ ] **Step 1: Write the failing test**: renders with `placeholder="Password"` → `getByPlaceholderText` has `type="password"`; clicking `getByRole('button', { name: /show password/i })` flips `type` to `text` and the button name to `/hide password/i`; `autoComplete="new-password"` is forwarded to the input.
- [ ] **Step 2: Run to see it fail.** Run: `pnpm --filter @kemo/ui test -- password-input`. Expected: FAIL.
- [ ] **Step 3: Implement** per Interfaces. Reuse Park's `input` recipe and `IconButton`; no new recipe.
- [ ] **Step 4: Run tests, typecheck, lint.** Run: `pnpm --filter @kemo/ui test && pnpm typecheck && pnpm lint`. Expected: PASS / exit 0.
- [ ] **Step 5: Commit** `feat(ui): add PasswordInput built on Ark PasswordInput`.

---

### Task 6: `apps/preview` Next.js app with gallery and auth stubs

**Files:**

- Create: `apps/preview/package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.cjs`, `panda.config.ts`, `next-env.d.ts` (generated), `public/.gitkeep`, `src/app/layout.tsx`, `src/app/globals.css`, `src/app/page.tsx`, `src/app/(auth)/layout.tsx`, `src/app/(auth)/{login,register,forgot-password,complete-profile}/page.tsx`, `src/components/theme-provider.tsx`, `src/components/theme-toggle.tsx`, `src/components/site-nav.tsx`
- Modify: `eslint.config.mjs` (add `eslint-config-next/core-web-vitals` + `/typescript` scoped to `apps/preview/**` with `settings.next.rootDir: 'apps/preview/'`, and a second Panda block with `configPath: './apps/preview/panda.config.ts'`, `files: ['apps/preview/**/*.{ts,tsx}']`)

**Interfaces:**

- Consumes: `@kemo/ui` components; `@kemo/ui/css` (`css`), `@kemo/ui/jsx` (`styled`, `Stack`, `HStack`) via the lib's synced exports.
- Produces: scripts `predev`/`prebuild` = `panda codegen`, `dev`, `build`, `start`, `typecheck`, `lint`, `test:e2e` (Task 7). `next.config.ts`: `transpilePackages: ['@kemo/ui']`, `output: 'standalone'`, `outputFileTracingRoot: path.join(import.meta.dirname, '../..')`. `panda.config.ts`: `designSystem: '@kemo/ui'`, `include: ['./src/**/*.{ts,tsx}']`, `outdir: 'styled-system'`, `jsxFramework: 'react'`, `preflight: true`, `staticCss: { recipes: '*' }`. `postcss.config.cjs`: `{ plugins: { '@pandacss/dev/postcss': {} } }`. `globals.css`: `@layer reset, base, tokens, recipes, utilities;`.
- Produces routes: `/` (gallery with `<h1>` "Component gallery" and sections Buttons, Inputs, Checkbox, Card, Typography, Alert, Badge, Skeleton), `/login` (`<h1>` "Sign in"), `/register` ("Create your account"), `/forgot-password` ("Reset your password"), `/complete-profile` ("Complete your profile"); each stub also renders `<Text>` "Design pending. See docs/superpowers/specs." Layout: `DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })`, class on `<html>`, `suppressHydrationWarning`, `ThemeProvider attribute="class" disableTransitionOnChange` from `next-themes`, `SiteNav` with links to the five routes and `ThemeToggle` (button labelled "Toggle theme", `data-testid="theme-toggle"`).

- [ ] **Step 1: Write package and config files** per Interfaces; `package.json` has `"type": "module"`, deps `next`, `react`, `react-dom`, `@kemo/ui: workspace:*`, `next-themes`; devDeps `@pandacss/dev`, `@pandacss/preset-base`, `@pandacss/preset-panda`, `@playwright/test`, `@types/node`, `@types/react`, `@types/react-dom`, `typescript`, `eslint-config-next`.
- [ ] **Step 2: Install and generate.** Run: `pnpm install && pnpm --filter @kemo/preview exec panda codegen`. Expected: `apps/preview/styled-system/` exists; no `design_system_*` errors.
- [ ] **Step 3: Write layout, providers, nav, gallery, stubs.** Gallery uses only `@kemo/ui` components and `css()`/`Stack` for layout; every Button variant (`solid subtle surface outline plain`) × size (`xs sm md lg`) appears once, plus one `loading` button; an `Alert` with default status (blue); a `Card` with header/body/footer; `Field` with `Input` and `PasswordInput` (default, invalid, disabled); a `Checkbox`.
- [ ] **Step 4: Build.** Run: `pnpm --filter @kemo/preview build`. Expected: Turbopack build succeeds, `apps/preview/.next/standalone/apps/preview/server.js` exists.
- [ ] **Step 5: Smoke by hand.** Run: `pnpm --filter @kemo/preview start & sleep 3; for r in / /login /register /forgot-password /complete-profile; do curl -s -o /dev/null -w "$r %{http_code}\n" http://localhost:3000$r; done; kill %1`. Expected: five `200` lines.
- [ ] **Step 6: Typecheck and lint.** Run: `pnpm typecheck && pnpm lint && pnpm format:check`. Expected: exit 0.
- [ ] **Step 7: Commit** `feat(preview): add Next.js preview app with component gallery and auth route stubs`.

---

### Task 7: Playwright smoke suite

**Files:**

- Create: `apps/preview/playwright.config.ts`, `apps/preview/e2e/smoke.spec.ts`
- Modify: `apps/preview/package.json` (`"test:e2e": "playwright test"`), `.gitignore` already covers reports

**Interfaces:**

- Produces: `playwright.config.ts` with `testDir: './e2e'`, chromium project only, `use.baseURL: 'http://localhost:3000'`, `webServer: { command: 'pnpm start', url: 'http://localhost:3000', reuseExistingServer: !process.env.CI, timeout: 60_000 }`, `reporter: process.env.CI ? 'github' : 'list'`.

- [ ] **Step 1: Write the tests** in `e2e/smoke.spec.ts`:
  - `test.describe('routes')`: for each of `/`, `/login`, `/register`, `/forgot-password`, `/complete-profile`: response status 200, `page.getByRole('heading', { level: 1 })` visible, and no `console` messages of type `error` collected during load.
  - `test('theme: DM Sans, XS radii')` on `/`: `getComputedStyle(document.body).fontFamily` contains `DM Sans`; first `.button` has `border-radius` `2px`; first `.card__root` has `border-radius` `4px`.
  - `test('dark mode restyles')` on `/`: record `body` `background-color`, click `getByTestId('theme-toggle')`, expect `html` to have class `dark` and `body` background to differ.
- [ ] **Step 2: Install browser and run to see failures/pass.** Run: `pnpm --filter @kemo/preview exec playwright install chromium && pnpm --filter @kemo/preview build && pnpm --filter @kemo/preview test:e2e`. Expected: all tests PASS (if a selector fails, fix the page, not the assertion values).
- [ ] **Step 3: Lint/format.** Run: `pnpm lint && pnpm format:check`. Expected: exit 0.
- [ ] **Step 4: Commit** `test(preview): add Playwright smoke suite for routes, theme and dark mode`.

---

### Task 8: Makefile, root dev/build scripts, README

**Files:**

- Create: `Makefile`, `README.md`
- Modify: root `package.json` (`dev`, `build`, `test:e2e`, `e2e:install`)

**Interfaces:**

- Produces root scripts: `dev` = `pnpm --filter @kemo/ui lib && concurrently -k -n ui,preview -c blue,green "pnpm --filter @kemo/ui watch" "pnpm --filter @kemo/preview dev"`; `build` = `pnpm --filter @kemo/ui lib && pnpm --filter @kemo/preview build`; `test:e2e` = `pnpm --filter @kemo/preview test:e2e`; `e2e:install` = `pnpm --filter @kemo/preview exec playwright install --with-deps chromium`.
- Produces Makefile targets (`help` default, `##` comments, `PNPM ?= pnpm`, `CONTAINER_ENGINE ?= podman`, `IMAGE ?= kemo-design-system:local`): `install`, `codegen`, `lib`, `dev`, `build`, `start`, `lint`, `lint-fix`, `format`, `format-check`, `typecheck`, `test`, `e2e`, `e2e-install`, `check` (lint, format-check, typecheck, test), `clean`, `container-build`, `container-run`, `park-ui-add` (`COMPONENTS` required), `park-ui-port`.

- [ ] **Step 1: Write Makefile and scripts.**
- [ ] **Step 2: Verify targets.** Run: `make help && make check`. Expected: help lists every target with a description; `check` exits 0.
- [ ] **Step 3: Cold-start check.** Run: `make clean && make install && (timeout 90 make dev > /tmp/dev.log 2>&1 &) ; sleep 45; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/login; pkill -f "next dev"; pkill -f "panda lib"`. Expected: `200`, and `/tmp/dev.log` shows no `design_system_manifest_not_found`.
- [ ] **Step 4: Write README.md** with sections: What this is; Design language (table from spec); Repo layout; Quickstart (`make install && make dev`); Dev workflow (two watchers, why `lib` runs first, where CSS lag comes from); Adding Park UI components (`make park-ui-add COMPONENTS="dialog menu"`, what the port script changes and why, palette rule); Consuming `@kemo/ui` from another app (`designSystem`, `transpilePackages`, `@layer` line, `--font-dm-sans` contract and non-Next fallback, `@pandacss/preset-*` devDeps); Testing (unit, scripts, e2e); CI; Container (network needed for Google Fonts at build); Roadmap (design phase for the four auth pages, then `packages/ui/src/pages` templates).
- [ ] **Step 5: Format check.** Run: `pnpm format:check`. Expected: exit 0.
- [ ] **Step 6: Commit** `chore: add Makefile, root dev scripts and README`.

---

### Task 9: Containerfile

**Files:**

- Create: `Containerfile`, `.containerignore`

**Interfaces:**

- Produces: multi-stage image per the approved plan (base `registry.access.redhat.com/ubi9/nodejs-24-minimal:latest`, `npm install -g pnpm@<exact>` as root then back to `1001`, `deps` stage with `pnpm install --frozen-lockfile --ignore-scripts` from the three `package.json` files + lockfile + workspace file, `build` stage running `pnpm --filter @kemo/ui lib && pnpm --filter @kemo/preview build`, `runtime` stage copying `.next/standalone`, `.next/static`, `public`, `ENV NODE_ENV=production PORT=8080 HOSTNAME=0.0.0.0`, `USER 1001`, `EXPOSE 8080`, `CMD ["node","apps/preview/server.js"]`). `.containerignore`: `node_modules`, `**/node_modules`, `**/.next`, `**/dist`, `**/styled-system`, `.git`, `playwright-report`, `test-results`.

- [ ] **Step 1: Write both files** (comment the Google Fonts network requirement above the build stage).
- [ ] **Step 2: Build.** Run: `make container-build`. Expected: exit 0.
- [ ] **Step 3: Run and verify HTML and static assets.** Run: `podman run -d --rm --name kds -p 8080:8080 kemo-design-system:local; sleep 3; curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/login; css=$(curl -s http://localhost:8080/ | grep -oE '/_next/static/[^"]+\.css' | head -1); curl -s -o /dev/null -w "%{http_code} $css\n" "http://localhost:8080$css"; podman exec kds id -u; podman stop kds`. Expected: `200`, `200 /_next/static/...css`, `1001`.
- [ ] **Step 4: Commit** `build: add UBI 9 Node 24 multi-stage Containerfile`.

---

### Task 10: GitHub Actions

**Files:**

- Create: `.github/workflows/ci.yml`

**Interfaces:**

- Produces workflow `CI` on `push` (branches: `main`) and `pull_request`; `concurrency` by ref; jobs:
  - `check`: `actions/checkout@v7`, `pnpm/action-setup@v6`, `actions/setup-node@v7` (`node-version-file: .nvmrc`, `cache: pnpm`), `pnpm install --frozen-lockfile`, `pnpm --filter @kemo/ui lib`, `pnpm lint`, `pnpm format:check`, `pnpm typecheck`, `pnpm test`.
  - `e2e` (needs `check`): same setup, `pnpm --filter @kemo/preview build`, `pnpm e2e:install`, `pnpm test:e2e` with `CI=true`, `actions/upload-artifact@v7` of `apps/preview/playwright-report` `if: failure()`.
  - `container` (needs `check`, `permissions: { contents: read, packages: write }`): `redhat-actions/buildah-build@v3` (`image: ghcr.io/${{ github.repository }}`, `tags: latest ${{ github.sha }}`, `containerfiles: ./Containerfile`), then `redhat-actions/push-to-registry@v3` `if: github.event_name == 'push' && github.ref == 'refs/heads/main'` with `registry: ghcr.io`, `username: ${{ github.actor }}`, `password: ${{ secrets.GITHUB_TOKEN }}`.

- [ ] **Step 1: Write the workflow.**
- [ ] **Step 2: Validate syntax.** Run: `pnpm dlx actionlint` if it runs on this machine; otherwise `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))"`. Expected: no errors.
- [ ] **Step 3: Commit** `ci: add GitHub Actions for checks, e2e and container image`.

---

### Task 11: Final verification

- [ ] **Step 1:** Run: `make clean && make install && make check && make e2e && make container-build`. Expected: all exit 0.
- [ ] **Step 2:** Run: `git status --porcelain`. Expected: empty (every generated file ignored, every source file committed).
- [ ] **Step 3:** Run: `git log --oneline`. Expected: one commit per task in order.
