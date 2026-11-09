import js from '@eslint/js'
import panda from '@pandacss/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import path from 'node:path'
import tseslint from 'typescript-eslint'

const uiDir = path.join(import.meta.dirname, 'packages/ui')
const previewDir = path.join(import.meta.dirname, 'apps/preview')
const previewFiles = ['apps/preview/**/*.{ts,tsx}']

// eslint-config-next assumes a single-app repo: scope every entry to the preview app and point
// @next/next at it. Its ignores-only entries are dropped; the global ignores below cover them.
// rootDir is absolute (apps/preview/) because @next/next globs it from process.cwd(), and the
// package's own `eslint .` runs from apps/preview.
const scopeToPreview = (configs) =>
  configs
    .filter((config) => !(Object.keys(config).length === 1 && config.ignores))
    .map((config) => ({
      ...config,
      files: previewFiles,
      settings: { ...config.settings, next: { rootDir: `${previewDir}/` } },
    }))

export default defineConfig([
  globalIgnores([
    '**/styled-system/**',
    '**/dist/**',
    '**/.next/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/node_modules/**',
    '**/next-env.d.ts',
  ]),
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended],
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: { globals: globals.node },
  },
  // Load the Panda project from the package dir: its presets resolve from packages/ui/node_modules
  // and the config's `include: ['./src/**']` is relative to that cwd (the plugin defaults to process.cwd()).
  await panda.configs.recommended({
    cwd: uiDir,
    configPath: path.join(uiDir, 'panda.config.ts'),
    files: ['packages/ui/**/*.{ts,tsx}'],
  }),
  {
    // Park UI registry file: IconButtonProps is a deliberate named extension point of ButtonProps.
    files: ['packages/ui/src/components/ui/icon-button.tsx'],
    rules: {
      '@typescript-eslint/no-empty-object-type': [
        'error',
        { allowInterfaces: 'with-single-extends' },
      ],
    },
  },
  {
    // Park UI registry file: SkeletonText forwards `gap` to Stack at runtime; Panda extracts the value
    // at the consumer's <SkeletonText gap=…> call site via the skeleton recipe's `jsx` list.
    files: ['packages/ui/src/components/ui/skeleton.tsx'],
    rules: { '@pandacss/no-dynamic-styling': 'off' },
  },
  ...scopeToPreview(nextVitals),
  ...scopeToPreview(nextTs),
  // Same shape as the packages/ui block: the preview's Panda config resolves `designSystem` from its dir.
  await panda.configs.recommended({
    cwd: previewDir,
    configPath: path.join(previewDir, 'panda.config.ts'),
    files: previewFiles,
  }),
  prettier,
])
