import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url))

// Unit tests for the demo's pure modules (the Deployments reducer and mocks). They run in Node
// and take `@kemo/ui` from `test/kemo-ui.ts`, which re-exports only the library's pure helpers,
// so no React component, Park UI recipe or CodeMirror module is loaded.
export default defineConfig({
  resolve: {
    alias: [
      { find: /^@kemo\/ui$/, replacement: at('./test/kemo-ui.ts') },
      { find: /^@\//, replacement: at('./src/') },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
