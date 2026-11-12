import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // codemirror-json-schema ships ESM with extensionless relative imports: bundlers resolve them,
    // Node's ESM loader does not, so Vite has to process the package instead of externalizing it.
    server: { deps: { inline: ['codemirror-json-schema'] } },
  },
})
