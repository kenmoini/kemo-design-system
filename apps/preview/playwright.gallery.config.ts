import { defineConfig, devices } from '@playwright/test'

/**
 * The screenshot gallery capture (`pnpm gallery`, see docs/development.md). Runs against a built
 * preview on :3100 so a `next dev` on :3000 is left alone; build first (`make gallery` does).
 */
export default defineConfig({
  testDir: './gallery',
  testMatch: /gallery\.spec\.ts$/,
  outputDir: './test-results/gallery',
  reporter: 'list',
  globalTeardown: './gallery/write-index.ts',
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:3100',
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  },
  projects: [{ name: 'chromium' }],
  webServer: {
    command: 'pnpm exec next start -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: true,
    timeout: 60_000,
  },
})
