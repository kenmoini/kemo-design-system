import { expect, test } from '@playwright/test'

const ROUTES = [
  '/',
  '/login',
  '/register',
  '/forgot-password',
  '/complete-profile',
  '/components/buttons',
  '/components/forms',
  '/components/surfaces',
  '/components/typography',
]

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })

      const response = await page.goto(route)

      expect(response?.status()).toBe(200)
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      expect(errors).toEqual([])
    })
  }
})

test('theme: DM Sans and XS radii', async ({ page }) => {
  const radius = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => getComputedStyle(el).borderRadius)

  await page.goto('/')
  await page.evaluate(() => document.fonts.ready)
  const fontFamily = await page.evaluate(() => getComputedStyle(document.body).fontFamily)
  expect(fontFamily).toContain('DM Sans')

  await page.goto('/components/buttons')
  expect(await radius('.button')).toBe('2px')

  await page.goto('/components/surfaces')
  expect(await radius('.card__root')).toBe('4px')
})

test('dark mode restyles', async ({ page }) => {
  await page.goto('/')
  const background = () =>
    page.locator('body').evaluate((el) => getComputedStyle(el).backgroundColor)
  const before = await background()

  await page.getByTestId('preview-panel-trigger').click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByTestId('theme-toggle').click()

  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect.poll(background).not.toBe(before)
})

test('panel navigates and closes', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByTestId('preview-panel-trigger')
  const dialog = page.getByRole('dialog')
  const buttonsLink = dialog.getByRole('link', { name: 'Buttons', exact: true })

  await trigger.click()
  await expect(dialog).toBeVisible()
  await buttonsLink.click()

  await expect(page).toHaveURL(/\/components\/buttons$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Buttons' })).toBeVisible()
  await expect(dialog).not.toBeVisible()

  await trigger.click()
  await expect(buttonsLink).toHaveAttribute('aria-current', 'page')
})
