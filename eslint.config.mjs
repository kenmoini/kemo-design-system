import js from '@eslint/js'
import panda from '@pandacss/eslint-plugin'
import { defineConfig, globalIgnores } from 'eslint/config'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import path from 'node:path'
import tseslint from 'typescript-eslint'

const uiDir = path.join(import.meta.dirname, 'packages/ui')

export default defineConfig([
  globalIgnores([
    '**/styled-system/**',
    '**/dist/**',
    '**/.next/**',
    '**/playwright-report/**',
    '**/test-results/**',
    '**/node_modules/**',
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
  prettier,
])
