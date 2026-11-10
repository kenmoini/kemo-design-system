import { expect, type Page, test } from '@playwright/test'

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
  '/dashboard',
]

test.describe('routes', () => {
  for (const route of ROUTES) {
    test(`${route} renders without console errors`, async ({ page }) => {
      const errors: string[] = []
      page.on('console', (message) => {
        if (message.type() === 'error') errors.push(message.text())
      })
      page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))

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

test('panel closes on history navigation and Escape', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByTestId('preview-panel-trigger')
  const dialog = page.getByRole('dialog')

  await trigger.click()
  await dialog.getByRole('link', { name: 'Buttons', exact: true }).click()
  await expect(page).toHaveURL(/\/components\/buttons$/)

  await trigger.click()
  await expect(dialog).toBeVisible()
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await trigger.click()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
})

// WCAG relative luminance of a computed `rgb()`/`rgba()` color, plus its alpha.
function parseColor(value: string) {
  const match = value.match(/rgba?\(([^)]+)\)/)
  if (!match?.[1]) throw new Error(`Unexpected color: ${value}`)
  const [r = 0, g = 0, b = 0, alpha = 1] = match[1].split(/[\s,/]+/).map(Number)
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return { luminance: 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b), alpha }
}

test.describe('auth pages', () => {
  // Uncaught errors and unhandled rejections (a rejected onSubmit, say) fail every auth test.
  let pageErrors: string[] = []
  test.beforeEach(({ page }) => {
    pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
  })
  test.afterEach(() => {
    expect(pageErrors).toEqual([])
  })

  test('auth drawer stays dark in a light host theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/login')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    const color = await page
      .getByRole('heading', { level: 1 })
      .evaluate((el) => getComputedStyle(el).color)
    expect(parseColor(color).luminance).toBeGreaterThan(0.7)

    const background = parseColor(
      await dialog.evaluate((el) => getComputedStyle(el).backgroundColor),
    )
    expect(background.alpha < 1 || background.luminance < 0.2).toBe(true)

    // Palette-driven recipes follow too: the primary button is white on the dark glass.
    const primary = await page
      .getByRole('button', { name: 'Sign in', exact: true })
      .evaluate((el) => getComputedStyle(el).backgroundColor)
    expect(parseColor(primary).luminance).toBeGreaterThan(0.7)
  })

  test('escape does not dismiss the auth drawer', async ({ page }) => {
    await page.goto('/login')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    await page.keyboard.press('Escape')

    await expect(dialog).toHaveAttribute('data-state', 'open')
    await expect(dialog).toBeVisible()
  })

  test('sign in validates and shows the mock error', async ({ page }) => {
    await page.goto('/login')
    const submit = page.getByRole('button', { name: 'Sign in', exact: true })

    await submit.click()
    await expect(page.getByText('Enter your email or username.')).toBeVisible()
    await expect(page.getByText('Enter your password.')).toBeVisible()

    await page.getByLabel('Email or username').fill('fail@x')
    await page.getByLabel('Password', { exact: true }).fill('hunter2hunter2')
    await submit.click()
    // Scoped to the drawer: Next's route announcer is a role="alert" too.
    await expect(page.getByRole('dialog').getByRole('alert')).toHaveText(
      'Something went wrong. Try again.',
    )
  })

  test('register flags a password mismatch', async ({ page }) => {
    await page.goto('/register')

    await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery')
    await page.getByLabel('Confirm password', { exact: true }).fill('correct-horse-battery-staple')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(page.getByText("Passwords don't match.")).toBeVisible()
  })

  test('register: clicking the terms link does not toggle the checkbox', async ({ page }) => {
    await page.goto('/register')
    const checkbox = page.getByRole('checkbox', { name: /I agree to the/ })

    // Click the start of the label text ("I agree…"), clear of the links inside it.
    await page.getByText('I agree to the').click({ position: { x: 2, y: 2 } })
    await expect(checkbox).toBeChecked()

    await page.getByRole('link', { name: 'Terms of Service' }).click()
    await expect(page).toHaveURL(/\/register#terms$/)
    await expect(checkbox).toBeChecked()
  })

  test('forgot password shows the sent state', async ({ page }) => {
    await page.goto('/forgot-password')

    await page.getByLabel('Email').fill('ken@acme.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()

    const heading = page.getByRole('heading', { level: 1, name: 'Check your email' })
    await expect(heading).toBeVisible()
    // The form (and the focused button) unmounts, so focus moves to the new heading.
    await expect(heading).toBeFocused()
  })

  test('a failed submit keeps the form and shows the mock error', async ({ page }) => {
    const alert = page.getByRole('dialog').getByRole('alert')

    await page.goto('/register')
    await page.getByLabel('First name').fill('Ken')
    await page.getByLabel('Last name').fill('Moini')
    await page.getByLabel('Username').fill('ken-m')
    await page.getByLabel('Email').fill('fail@acme.com')
    await page.getByLabel('Password', { exact: true }).fill('correct-horse-battery')
    await page.getByLabel('Confirm password', { exact: true }).fill('correct-horse-battery')
    await page.getByText('I agree to the').click({ position: { x: 2, y: 2 } })
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(alert).toHaveText('Something went wrong. Try again.')
    await expect(page.getByRole('button', { name: 'Create account' })).toBeEnabled()

    await page.goto('/forgot-password')
    await page.getByLabel('Email').fill('fail@acme.com')
    await page.getByRole('button', { name: 'Send reset link' }).click()
    await expect(alert).toHaveText('Something went wrong. Try again.')
    await expect(page.getByRole('heading', { level: 1, name: 'Reset your password' })).toBeVisible()

    await page.goto('/complete-profile')
    await page.getByLabel('Username').fill('fail-ken')
    await page.getByLabel('First name').fill('Ken')
    await page.getByRole('button', { name: 'Finish and continue' }).click()
    await expect(alert).toHaveText('Something went wrong. Try again.')
    await expect(page.getByRole('button', { name: 'Finish and continue' })).toBeEnabled()
  })

  test('complete profile keeps the provider email read-only', async ({ page }) => {
    await page.goto('/complete-profile')
    const email = page.getByRole('textbox', { name: 'Email', exact: true })

    await expect(email).toHaveAttribute('readonly', '')
    await expect(email).toHaveValue('ken@acme.com')
  })

  test('preview panel opens from an auth route', async ({ page }) => {
    await page.goto('/login')
    const authDrawer = page.getByRole('dialog', { name: 'Welcome back' })
    const panel = page.getByRole('dialog', { name: 'Preview', exact: true })
    await expect(authDrawer).toBeVisible()

    await page.getByTestId('preview-panel-trigger').click()
    await expect(panel).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(panel).not.toBeVisible()
    await expect(authDrawer).toBeVisible()
  })

  test('auth drawer fills a narrow viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/register')
    const dialog = page.getByRole('dialog')
    await expect(dialog).toBeVisible()

    expect((await dialog.boundingBox())?.width).toBe(375)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)

    // Paired rows stack below `sm`, so each field keeps a usable width.
    const width = async (label: string) =>
      (await page.getByLabel(label, { exact: true }).boundingBox())?.width ?? 0
    expect(await width('Password')).toBeGreaterThanOrEqual(250)
    expect(await width('Confirm password')).toBeGreaterThanOrEqual(250)
    expect(await width('First name')).toBe(await width('Last name'))
  })
})

test.describe('dashboard', () => {
  const TITLES = [
    'Requests per minute',
    'Capacity',
    'Deployments per day',
    'Node health',
    'Top endpoints',
    'Recent deployments',
    'Rollouts',
    'Event stream',
    'Activity',
  ]

  // The outlined card whose title is `title`.
  const card = (page: Page, title: string) =>
    page
      .locator('.card__root')
      .filter({ has: page.getByRole('heading', { name: title, exact: true }) })

  let pageErrors: string[] = []
  test.beforeEach(({ page }) => {
    pageErrors = []
    page.on('pageerror', (error) => pageErrors.push(error.message))
  })
  test.afterEach(() => {
    expect(pageErrors).toEqual([])
  })

  test('dashboard renders the shell and nine widget titles', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text())
    })

    const response = await page.goto('/dashboard')

    expect(response?.status()).toBe(200)
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()
    await expect(page.getByRole('banner')).toBeVisible()
    await expect(page.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('contentinfo')).toBeVisible()
    for (const title of TITLES) {
      await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    }
    await expect(page.locator('.recharts-line').first()).toBeVisible()
    expect(errors).toEqual([])
  })

  test('chart table toggle', async ({ page }) => {
    await page.goto('/dashboard')
    const requests = card(page, 'Requests per minute')
    const chart = requests.locator('.recharts-wrapper > svg')
    await expect(chart).toBeVisible()

    await requests.getByRole('button', { name: 'View as table' }).click()
    await expect(requests.getByRole('table')).toBeVisible()
    await expect(requests.getByRole('columnheader', { name: 'API', exact: true })).toBeVisible()
    await expect(chart).toHaveCount(0)

    await requests.getByRole('button', { name: 'View as chart' }).click()
    await expect(chart).toBeVisible()
    await expect(requests.getByRole('table')).toHaveCount(0)
  })

  test('dark theme flips series colors', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/dashboard')
    const line = page.locator('.recharts-line path').first()
    const stroke = () => line.evaluate((el) => getComputedStyle(el).stroke)
    await expect(line).toBeVisible()
    const before = await stroke()
    expect(before).toMatch(/^rgb/)

    await page.getByTestId('preview-panel-trigger').click()
    await page.getByTestId('theme-toggle').click()

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect.poll(stroke).not.toBe(before)
  })

  // `lg` is (min-width: 64em), so 1024px is already the full sidebar; 1023px is the widest rail.
  test('sidebar becomes a rail below 1024px', async ({ page }) => {
    await page.setViewportSize({ width: 1023, height: 800 })
    await page.goto('/dashboard')
    const nav = page.getByRole('navigation', { name: 'Primary' })

    await expect(nav).toHaveAttribute('data-rail', 'true')
    expect((await nav.boundingBox())?.width).toBeLessThanOrEqual(60)
  })

  test('dashboard stacks at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 1, name: 'Overview' })).toBeVisible()

    // The primary navigation is hidden (the table's pager is a `navigation` landmark of its own).
    const primary = page.getByRole('navigation', { name: 'Primary' })
    await expect(primary).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)

    await page.getByRole('button', { name: 'Open navigation' }).click()
    const drawer = page.getByRole('dialog', { name: 'Navigation' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByRole('navigation', { name: 'Primary' })).toBeVisible()
    await expect(primary).toHaveCount(1)
  })

  test('live events append', async ({ page }) => {
    await page.goto('/dashboard')
    const events = card(page, 'Event stream').getByRole('listitem')
    await expect(events.first()).toBeVisible()
    const before = await events.count()

    await expect.poll(() => events.count(), { timeout: 6_000 }).toBeGreaterThan(before)
  })
})
