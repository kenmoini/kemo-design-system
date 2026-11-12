import { expect, test } from '@playwright/test'

const PAGES = [
  ['/blog/editorial-list', 'Notes from the platform team'],
  ['/blog/editorial-list/cold-start-62', 'How we cut cold-start time for cluster consoles by 62%'],
  ['/blog/magazine-grid', 'Notes from the platform team'],
  ['/blog/magazine-grid/cold-start-62', 'How we cut cold-start time for cluster consoles by 62%'],
  ['/blog/journal-rail', 'Platform journal'],
  ['/blog/journal-rail/cold-start-62', 'How we cut cold-start time for cluster consoles by 62%'],
] as const

test.describe('blog routes', () => {
  // Every console error and uncaught error fails these tests unless the test lists it in `expected`
  // (a substring of `message [source url]`).
  let errors: string[] = []
  let expected: string[] = []
  test.beforeEach(({ page }) => {
    errors = []
    expected = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${message.text()} [${message.location().url}]`)
    })
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  })
  test.afterEach(() => {
    expect(errors.filter((error) => !expected.some((text) => error.includes(text)))).toEqual([])
  })

  for (const [route, h1] of PAGES) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const response = await page.goto(route)

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1)
      await expect(page.getByRole('heading', { level: 1, name: h1 })).toBeVisible()
    })

    test(`${route} has no horizontal scroll at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto(route)
      await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
    })
  }

  test('/blog redirects to the first variation', async ({ page }) => {
    await page.goto('/blog')

    await expect(page).toHaveURL(/\/blog\/editorial-list$/)
  })

  test('an unknown post shows the 404 page', async ({ page, baseURL }) => {
    expected = [`status of 404 (Not Found) [${baseURL}/blog/editorial-list/nope]`]

    const response = await page.goto('/blog/editorial-list/nope')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: "There's nothing at this address." }),
    ).toBeVisible()
  })

  test('an unknown variation shows the 404 page', async ({ page, baseURL }) => {
    expected = [`status of 404 (Not Found) [${baseURL}/blog/nope]`]

    const response = await page.goto('/blog/nope')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: "There's nothing at this address." }),
    ).toBeVisible()
  })

  test('the preview panel lists the blog between pages and status pages', async ({ page }) => {
    await page.goto('/blog/editorial-list')
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
    await page.getByTestId('preview-panel-trigger').click()
    const dialog = page.getByRole('dialog', { name: 'Preview', exact: true })
    await expect(dialog).toBeVisible()

    const sections = await dialog.getByRole('heading', { level: 3 }).allInnerTexts()
    expect(sections.slice(0, 4)).toEqual(['Pages', 'Blog', 'Status pages', 'Components'])
    const blog = dialog
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Blog', exact: true }) })
    await expect(blog.getByRole('link')).toHaveCount(6)

    await blog.getByRole('link', { name: 'Magazine grid: post', exact: true }).click()
    await expect(page).toHaveURL(/\/blog\/magazine-grid\/cold-start-62$/)
  })
})
