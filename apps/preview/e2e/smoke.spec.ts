import { expect, type Locator, type Page, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'

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
  '/faq',
  '/blank',
  '/maintenance',
  '/errors/401',
  '/errors/403',
  '/errors/404',
  '/errors/500',
  '/errors/503',
  '/access',
  '/access/users',
  '/access/groups',
  '/access/roles',
  '/access/permissions',
  '/access/audit',
  '/access/oidc',
  '/access/service-accounts',
  '/access/oauth-apps',
  '/access/settings',
  '/deployments',
  '/deployments/new',
  '/deployments/prod-us-east/checkout/checkout-api',
  '/deployments/prod-us-east/checkout/checkout-api/yaml',
  '/deployments/prod-us-east/checkout/checkout-api/events',
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

test('panel closes from its close button', async ({ page }) => {
  await page.goto('/')
  const trigger = page.getByTestId('preview-panel-trigger')
  const dialog = page.getByRole('dialog', { name: 'Preview', exact: true })

  await trigger.click()
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: /close/i }).click()

  await expect(dialog).toBeHidden()
  await expect(trigger).toBeFocused()
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

    // The 4 s interval starts after hydration, so allow two ticks' worth.
    await expect.poll(() => events.count(), { timeout: 9_000 }).toBeGreaterThan(before)
  })
})

test.describe('status and console pages', () => {
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

  test('status page reads on the gradient', async ({ page }) => {
    await page.goto('/errors/404')
    const heading = page.getByRole('heading', {
      level: 1,
      name: "There's nothing at this address.",
    })

    await expect(heading).toBeVisible()
    await expect(page.getByRole('main')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Go to dashboard' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Go back' })).toBeVisible()
    const color = await heading.evaluate((el) => getComputedStyle(el).color)
    expect(parseColor(color).luminance).toBeGreaterThan(0.8)

    await page.setViewportSize({ width: 375, height: 812 })
    await expect(heading).toBeVisible()
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  })

  test('real 404 uses the status page', async ({ page, baseURL }) => {
    // The browser logs that the document itself came back 404: the status under test.
    expected = [`status of 404 (Not Found) [${baseURL}/this-page-does-not-exist]`]

    const response = await page.goto('/this-page-does-not-exist')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: "There's nothing at this address." }),
    ).toBeVisible()
  })

  test('real 404 "Go back" returns to the previous page', async ({ page, baseURL }) => {
    expected = [`status of 404 (Not Found) [${baseURL}/this-does-not-exist]`]
    await page.goto('/dashboard')
    await page.goto('/this-does-not-exist')
    await page.getByRole('button', { name: 'Go back' }).click()
    await expect(page).toHaveURL(/\/dashboard$/)
  })

  for (const [route, text] of [
    ['/errors/404', 'Kemo Console v0.3.0'],
    ['/login', 'v1.4.2'],
  ] as const) {
    test(`${route} footer version clears the panel trigger at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 812 })
      await page.goto(route)
      const version = page.getByText(text, { exact: true })
      await expect(version).toBeVisible()
      const trigger = page.getByTestId('preview-panel-trigger')
      const [a, b] = [await version.boundingBox(), await trigger.boundingBox()]
      expect(a && b).toBeTruthy()
      const overlap =
        a!.x < b!.x + b!.width &&
        b!.x < a!.x + a!.width &&
        a!.y < b!.y + b!.height &&
        b!.y < a!.y + a!.height
      expect(overlap).toBe(false)
    })
  }

  test('error boundary uses the status page', async ({ page, baseURL }) => {
    const intentional = 'intentional render error'
    expected = [
      // The page throws during the server render too, so the document comes back 500 and the
      // browser renders the boundary.
      `status of 500 (Internal Server Error) [${baseURL}/errors/throw]`,
      // React logs the error the boundary caught.
      intentional,
    ]
    const thrown = () => errors.filter((error) => error.includes(intentional)).length

    await page.goto('/errors/throw')

    const heading = page.getByRole('heading', {
      level: 1,
      name: 'Something went wrong on our side.',
    })
    await expect(heading).toBeVisible()
    const tryAgain = page.getByRole('button', { name: 'Try again' })
    await expect(tryAgain).toBeVisible()

    // "Try again" is Next's `reset`: the page renders again, throws again, and the boundary returns.
    await expect.poll(thrown).toBeGreaterThan(0)
    const before = thrown()
    await tryAgain.click()
    await expect.poll(thrown).toBeGreaterThan(before)
    await expect(heading).toBeVisible()
  })

  test('maintenance shows the window', async ({ page }) => {
    await page.goto('/maintenance')

    await expect(page.getByText('02:00 UTC')).toBeVisible()
    await expect(page.getByText('03:30 UTC')).toBeVisible()
    await expect(page.getByText('Scheduled maintenance')).toBeVisible()
    // The warning tone's amber dot sits before the label (decorative; the label carries the meaning).
    await expect(page.getByTestId('status-dot')).toBeVisible()
  })

  test('faq index links to topics', async ({ page }) => {
    await page.goto('/faq')
    const billing = page.getByRole('navigation', { name: 'Topics' }).getByRole('link', {
      name: 'Billing',
    })

    await billing.click()
    await expect(billing).toHaveAttribute('aria-current', 'true', { timeout: 2000 })
    await expect(page).toHaveURL(/#topic-billing$/)
    await expect(page.getByRole('heading', { level: 2, name: 'Billing' })).toBeInViewport()

    await page.getByRole('link', { name: 'Link to this question' }).first().click()
    await expect.poll(() => new URL(page.url()).hash).toMatch(/^#q-/)
  })

  test('faq index marks the last topic current when the page cannot scroll it to the top', async ({
    page,
  }) => {
    // A tall viewport: the page ends before "Security" reaches the top, so "Billing" stays in view.
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/faq')
    const security = page.getByRole('navigation', { name: 'Topics' }).getByRole('link', {
      name: 'Security',
    })

    await security.click()
    await expect(security).toHaveAttribute('aria-current', 'true', { timeout: 2000 })
    await expect(page).toHaveURL(/#topic-security$/)
  })
})

test.describe('access page', () => {
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

  // The toolbar's "{n} users" (the live region's copy goes on: "{n} users, 0 selected, …").
  const userCount = (page: Page) => page.getByText(/^\d+ users?$/)
  const countOf = async (page: Page) => Number.parseInt(await userCount(page).innerText(), 10)
  const search = (page: Page) => page.getByRole('searchbox', { name: 'Search users' })
  const bodyRows = (page: Page) => page.locator('tbody tr')
  // A click or keystroke in the few ms between `load` and hydration is lost, so the tests wait for
  // the root layout's marker (`<html data-hydrated>`, set once React has hydrated the page).
  const open = async (page: Page, path: string) => {
    await page.goto(path)
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
  }
  // Park's checkbox input is visually hidden inside its label: click the label, as a pointer would.
  const check = async (checkbox: Locator) => {
    await checkbox.locator('xpath=..').click()
    await expect(checkbox).toBeChecked()
  }

  test('access tabs are links', async ({ page }) => {
    await open(page, '/access')
    const users = page.getByRole('tab', { name: 'Users', exact: true })
    await expect(users).toHaveAttribute('href', '/access/users')

    await users.click()

    await expect(page).toHaveURL(/\/access\/users$/)
    await expect(users).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toHaveAttribute(
      'aria-selected',
      'false',
    )
    await expect(search(page)).toBeVisible()
  })

  test('users table searches and filters', async ({ page }) => {
    await open(page, '/access/users')
    const before = await countOf(page)

    await search(page).fill('priya')
    await expect(bodyRows(page)).toHaveCount(1)
    await expect(bodyRows(page)).toContainText('Priya Shah')
    await expect(userCount(page)).toHaveText('1 user')

    await search(page).fill('')
    await expect(userCount(page)).toHaveText(`${before} users`)
    await check(
      page
        .getByRole('complementary', { name: 'Filters' })
        .getByRole('checkbox', { name: /^Disabled/ }),
    )
    await expect(userCount(page)).not.toHaveText(`${before} users`)
    expect(await countOf(page)).toBeLessThan(before)
    for (const badge of await bodyRows(page)
      .getByText(/^(Active|Disabled)$/)
      .all()) {
      await expect(badge).toHaveText('Disabled')
    }
  })

  test('bulk actions follow the selection', async ({ page }) => {
    await open(page, '/access/users')
    const bulk = page.getByRole('button', { name: 'Bulk actions' })
    await expect(bulk).toHaveAttribute('aria-disabled', 'true')

    const rowBoxes = bodyRows(page).getByRole('checkbox', { name: /^Select / })
    await check(rowBoxes.nth(0))
    await check(rowBoxes.nth(1))

    await expect(bulk).not.toHaveAttribute('aria-disabled')
    await expect(page.getByText('· 2 selected')).toBeVisible()
    await bulk.click()
    const menu = page.getByRole('menu')
    await expect(menu.getByRole('group', { name: '2 users' })).toBeVisible()
    await expect(menu.getByRole('menuitem', { name: 'Add to group…' })).toBeVisible()
  })

  test('add user through the dialog', async ({ page }) => {
    await open(page, '/access/users')
    const before = await countOf(page)

    await page.getByRole('button', { name: '+ Add user' }).click()
    const dialog = page.getByRole('dialog', { name: 'Add user' })
    await expect(dialog).toBeVisible()
    await dialog.getByRole('textbox', { name: 'Full name' }).fill('Imani Okoro')
    await dialog.getByRole('textbox', { name: 'Email' }).fill('imani.okoro@acme.dev')
    await dialog.getByRole('combobox', { name: 'Role' }).click()
    await page.getByRole('option', { name: 'Deployer', exact: true }).click()
    await dialog.getByRole('button', { name: 'Add user', exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(userCount(page)).toHaveText(`${before + 1} users`)
    await search(page).fill('imani')
    await expect(bodyRows(page)).toHaveCount(1)
    await expect(bodyRows(page)).toContainText('Imani Okoro')
    await expect(bodyRows(page)).toContainText('Deployer')
  })

  test('row actions disable a user', async ({ page }) => {
    await open(page, '/access/users')
    await search(page).fill('priya')
    const row = page.getByRole('row', { name: /Priya Shah/ })
    await expect(row.getByText('Active', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Actions for Priya Shah' }).click()
    await page.getByRole('menuitem', { name: 'Disable' }).click()

    await expect(row.getByText('Disabled', { exact: true })).toBeVisible()
    await expect(row.getByText('Active', { exact: true })).toHaveCount(0)
  })

  test('overview shows the widgets', async ({ page }) => {
    await open(page, '/access')
    const stat = (label: string) =>
      page.locator('.card__root').filter({ has: page.getByText(label, { exact: true }) })

    await expect(stat('Internal users')).toContainText('231')
    await expect(stat('Groups')).toContainText('18')
    await expect(stat('OIDC users')).toContainText('412')
    await expect(stat('Active sessions')).toContainText('96')
    await expect(page.getByRole('heading', { level: 2, name: /^Sign-ins/ })).toBeVisible()
    await expect(
      page.getByRole('heading', { level: 2, name: /^Authenticated API calls/ }),
    ).toBeVisible()
  })

  test('audit layout and oidc badges', async ({ page }) => {
    await open(page, '/access/audit')
    const cardOf = (name: string | RegExp) =>
      page
        .locator('.card__root')
        .filter({ has: page.getByRole('heading', { level: 2, name }) })
        .boundingBox()
    // On lg the form spans two of the three columns and the stream the third, side by side.
    const form = await cardOf('Forward the audit log')
    const stream = await cardOf(/^API audit stream/)
    expect(form).not.toBeNull()
    expect(stream).not.toBeNull()
    expect(Math.abs(form!.y - stream!.y)).toBeLessThan(1)
    expect(form!.x).toBeLessThan(stream!.x)
    expect(form!.width / stream!.width).toBeGreaterThan(1.8)
    expect(form!.width / stream!.width).toBeLessThan(2.3)

    await open(page, '/access/oidc')
    await expect(page.getByText('Synced', { exact: true }).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText('Syncing · 61%', { exact: true })).toBeVisible()
    await expect(page.getByText('Error · invalid client secret', { exact: true })).toBeVisible()
    // Google Workspace's seeded sync finishes, so its "Sync now" works.
    await expect(page.getByText('Synced', { exact: true })).toHaveCount(2, { timeout: 5000 })
  })

  test('unknown access tab is a 404', async ({ page, baseURL }) => {
    // The browser logs that the document itself came back 404: the status under test.
    expected = [`status of 404 (Not Found) [${baseURL}/access/nope]`]

    const response = await page.goto('/access/nope')

    expect(response?.status()).toBe(404)
    await expect(
      page.getByRole('heading', { level: 1, name: "There's nothing at this address." }),
    ).toBeVisible()
  })

  test('access at 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const scrollWidth = () => page.evaluate(() => document.documentElement.scrollWidth)

    // The strip scrolls sideways, not the page: the last tab scrolls into view inside it.
    await open(page, '/access/users')
    const settings = page.getByRole('tab', { name: 'Settings', exact: true })
    await expect(settings).not.toBeInViewport()
    await settings.scrollIntoViewIfNeeded()
    await expect(settings).toBeVisible()
    await expect(settings).toBeInViewport()
    await expect(page.getByRole('tab', { name: 'Overview', exact: true })).not.toBeInViewport()
    expect(await scrollWidth()).toBe(375)

    await expect(page.getByRole('complementary', { name: 'Filters' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Filters' }).click()
    const drawer = page.getByRole('dialog', { name: 'Filters' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Status', { exact: true })).toBeVisible()
    await expect(drawer.getByRole('searchbox', { name: 'Search users' })).toBeVisible()
    expect(await scrollWidth()).toBe(375)
  })
})

test.describe('deployments', () => {
  // Every console error and uncaught error fails these tests.
  let errors: string[] = []
  test.beforeEach(({ page }) => {
    errors = []
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`${message.text()} [${message.location().url}]`)
    })
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
  })
  test.afterEach(() => {
    expect(errors).toEqual([])
  })

  const DETAIL = '/deployments/prod-us-east/checkout/checkout-api'
  // The toolbar's "{n} deployments in {c} clusters · {namespaces}".
  const countLine = (page: Page) => page.getByText(/^\d+ deployments? in \d+ clusters? · /)
  const bodyRows = (page: Page) => page.locator('tbody tr')
  // Wait for hydration (`<html data-hydrated>`): a click or keystroke before it is lost.
  const open = async (page: Page, path: string) => {
    await page.goto(path)
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
  }
  const tab = (page: Page, name: string) => page.getByRole('tab', { name, exact: true })
  // An Overview tile, named by its label.
  const tile = (page: Page, name: string) => page.getByRole('group', { name, exact: true })
  // CodeMirror loads lazily: until then the text sits in a `pre` and Save stays disabled.
  const editor = async (page: Page) => {
    const textbox = page.getByRole('textbox', { name: /yaml/i })
    await expect(textbox).toBeVisible()
    return textbox
  }
  // An editor line by its whole text (CodeMirror splits a line into token spans).
  const line = (textbox: Locator, text: RegExp) =>
    textbox.locator('.cm-line').filter({ hasText: text }).first()

  test('scope narrows the list', async ({ page }) => {
    await open(page, '/deployments')
    await expect(countLine(page)).toHaveText('45 deployments in 3 clusters · all namespaces')

    await page.getByRole('combobox', { name: 'Clusters' }).click()
    await page.getByRole('option', { name: 'prod-eu-west', exact: true }).click()
    await page.keyboard.press('Escape')

    await expect(countLine(page)).toHaveText(/^\d+ deployments in 1 cluster · all namespaces$/)
    const narrowed = await countLine(page).innerText()
    expect(narrowed).not.toBe('45 deployments in 3 clusters · all namespaces')
    for (const row of await bodyRows(page).all()) await expect(row).toContainText('prod-eu-west')

    await page.reload()
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
    await expect(countLine(page)).toHaveText(narrowed)
    await expect(page.getByRole('combobox', { name: 'Clusters' })).toContainText('prod-eu-west')
  })

  test('labels filter', async ({ page }) => {
    await open(page, '/deployments')
    const labels = page
      .getByRole('complementary', { name: 'Filters' })
      .getByRole('textbox', { name: 'Labels' })

    await labels.fill('app=checkout-api')
    await labels.press('Enter')

    await expect(bodyRows(page)).toHaveCount(1)
    await expect(bodyRows(page)).toContainText('checkout-api')
    await expect(countLine(page)).toHaveText('1 deployment in 3 clusters · all namespaces')
  })

  test('open a deployment', async ({ page }) => {
    await open(page, '/deployments')

    await page.getByRole('link', { name: 'checkout-api', exact: true }).click()

    await expect(page).toHaveURL(new RegExp(`${DETAIL}$`))
    await expect(page.getByRole('heading', { level: 1, name: 'checkout-api' })).toBeVisible()
    await expect(tab(page, 'Overview')).toHaveAttribute('aria-selected', 'true')
    await expect(tile(page, 'Ready')).toContainText('6 / 6')
    await expect(tile(page, 'Updated · Available')).toContainText('6 · 6')
    await expect(tile(page, 'Restarts')).toContainText('image 2.14.0')
  })

  test('overview switches related kinds', async ({ page }) => {
    await open(page, DETAIL)
    await expect(page.getByRole('columnheader', { name: 'Node' })).toBeVisible()

    await page.getByText(/^Services \d+$/).click()

    await expect(page.getByRole('columnheader', { name: 'Cluster IP' })).toBeVisible()
    await expect(page.getByRole('columnheader', { name: 'Node' })).toHaveCount(0)
  })

  test('yaml edit and save', async ({ page }) => {
    await open(page, `${DETAIL}/yaml`)
    const textbox = await editor(page)

    await line(textbox, /^\s*replicas: 6$/).click()
    await page.keyboard.press('End')
    await page.keyboard.press('Shift+ArrowLeft')
    await page.keyboard.type('8')
    await expect(page.getByText('● Unsaved changes')).toBeVisible()

    // The draft is the host's: it survives a trip to another tab.
    await tab(page, 'Overview').click()
    await expect(page).toHaveURL(new RegExp(`${DETAIL}$`))
    await expect(tile(page, 'Ready')).toContainText('6 / 6')
    await tab(page, 'YAML').click()
    await expect(page).toHaveURL(new RegExp(`${DETAIL}/yaml$`))
    await expect(page.getByText('● Unsaved changes')).toBeVisible()
    await expect(line(await editor(page), /^\s*replicas: 8$/)).toBeVisible()

    const save = page.getByRole('button', { name: 'Save', exact: true })
    await expect(save).toBeEnabled()
    await save.click()
    await expect(page.getByText('Saved', { exact: true })).toBeVisible()

    await tab(page, 'Overview').click()
    await expect(tile(page, 'Ready')).toContainText('8 / 8')
  })

  test('yaml schema problem blocks save', async ({ page }) => {
    await open(page, `${DETAIL}/yaml`)
    const textbox = await editor(page)

    await line(textbox, /^\s*type: RollingUpdate$/).click()
    await page.keyboard.press('End')
    await page.keyboard.press('Backspace')
    await expect(line(textbox, /^\s*type: RollingUpdat$/)).toBeVisible()

    await expect(page.getByText('1 problem', { exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    await expect(page.getByRole('list', { name: 'Problems' })).toContainText('Line')
  })

  test('schema drawer follows the cursor', async ({ page }) => {
    await open(page, `${DETAIL}/yaml`)
    const textbox = await editor(page)

    await page.getByRole('button', { name: 'Schema', exact: true }).click()
    const panel = page.getByRole('complementary', { name: 'Schema' })
    await expect(panel).toBeVisible()

    await line(textbox, /^\s*strategy:$/)
      .getByText('strategy', { exact: true })
      .click()

    await expect(panel.getByRole('navigation')).toContainText('strategy')
  })

  test('download clean yaml', async ({ page }) => {
    await open(page, `${DETAIL}/yaml`)
    await editor(page)

    await page.getByRole('button', { name: 'Download' }).click()
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('menuitem', { name: 'Download clean YAML' }).click(),
    ])

    expect(download.suggestedFilename()).toBe('checkout-api.clean.yaml')
    const text = await readFile(await download.path(), 'utf8')
    expect(text).toContain('name: checkout-api')
    expect(text).toContain('replicas: 6')
    expect(text).not.toContain('resourceVersion')
    expect(text).not.toMatch(/^status:/m)
  })

  test('events filter', async ({ page }) => {
    await open(page, `${DETAIL}/events`)
    const objects = page.locator('tbody tr td:nth-child(4)')
    await expect(bodyRows(page).first()).toBeVisible()

    await page.getByText(/^Warning \d+$/).click()
    await expect(bodyRows(page).first()).toContainText('Warning')
    for (const row of await bodyRows(page).all()) {
      await expect(row.locator('td').first()).toHaveText('Warning')
    }

    await page.getByText(/^All \d+$/).click()
    await page.getByText('Deployment only', { exact: true }).click()
    await expect(objects.first()).toHaveText(/^Deployment\//)
    for (const object of await objects.all()) await expect(object).not.toContainText('Pod/')
  })

  test('deployments at 375', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    const scrollWidth = () => page.evaluate(() => document.documentElement.scrollWidth)
    await open(page, '/deployments')

    // The scope pickers stack: Namespaces sits under Clusters, at the same left edge.
    const clusters = await page.getByRole('combobox', { name: 'Clusters' }).boundingBox()
    const namespaces = await page.getByRole('combobox', { name: 'Namespaces' }).boundingBox()
    expect(clusters).not.toBeNull()
    expect(namespaces).not.toBeNull()
    expect(namespaces!.y).toBeGreaterThanOrEqual(clusters!.y + clusters!.height)
    expect(Math.abs(namespaces!.x - clusters!.x)).toBeLessThan(1)
    expect(await scrollWidth()).toBe(375)

    await expect(page.getByRole('complementary', { name: 'Filters' })).toHaveCount(0)
    await page.getByRole('button', { name: 'Filters' }).click()
    const drawer = page.getByRole('dialog', { name: 'Filters' })
    await expect(drawer).toBeVisible()
    await expect(drawer.getByText('Status', { exact: true })).toBeVisible()
    await expect(drawer.getByRole('textbox', { name: 'Labels' })).toBeVisible()
    expect(await scrollWidth()).toBe(375)
  })
})
