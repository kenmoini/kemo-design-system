import { expect, test } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { selectFamilies, shotPath } from './paths'

/**
 * Captures the screenshot gallery (docs/gallery). One test per page and theme so a failure names
 * the page; the index is rewritten afterwards by write-index.ts (the config's globalTeardown).
 * `GALLERY_ONLY=blog,deployments/yaml` limits the capture; see paths.ts.
 */

/** Gives Recharts' ResizeObserver, lazy editors and the live streams a moment to settle. */
const SETTLE_MS = 500

/** The preview panel's floating trigger belongs to the preview, not the page. */
const HIDE_PREVIEW_CHROME = '[data-testid="preview-panel-trigger"] { display: none !important }'

for (const family of selectFamilies(process.env.GALLERY_ONLY)) {
  test.describe(family.title, () => {
    for (const shot of family.shots) {
      for (const theme of shot.themes ?? ['light']) {
        test(`${shot.id} (${theme})`, async ({ page }) => {
          // next-themes follows the system scheme (defaultTheme="system"), so this picks the theme.
          await page.emulateMedia({ colorScheme: theme })

          const response = await page.goto(shot.route)
          expect(response?.status()).toBe(200)
          await expect(page.locator('html[data-hydrated]')).toBeAttached()
          await expect(page.getByRole('heading', { level: 1, name: shot.heading })).toBeVisible()
          await page.addStyleTag({ content: HIDE_PREVIEW_CHROME })
          await page.evaluate(() => document.fonts.ready)
          await page.waitForLoadState('networkidle')
          await shot.setup?.(page)
          await page.waitForTimeout(SETTLE_MS)

          const file = shotPath(family, shot, theme)
          await mkdir(path.dirname(file), { recursive: true })
          await page.screenshot({
            path: file,
            fullPage: true,
            animations: 'disabled',
            caret: 'hide',
          })
        })
      }
    }
  })
}
