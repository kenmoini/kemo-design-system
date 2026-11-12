# Consuming @kemo/ui from another app

`@kemo/ui` is not published yet (see [Roadmap](../README.md#roadmap), item 8), so for now only apps inside
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

The preset also carries a `jsxMatchTag` rule, `{ from: 'recharts', ignore: true }`, that stops Panda
treating Recharts props as style props. `jsxMatchTag` replaces rather than merges, so an app that
defines its own `jsxMatchTag` must include that rule in it.

Panda's `jsx` tracking covers the Park components by name. Add `staticCss: { recipes: '*' }` to
the app config only if you need every recipe variant pre-generated; the preview does, for its
component pages.
