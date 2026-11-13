import { expect, type Page, test } from '@playwright/test'

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

  test('the preview panel lists the blog between pages and the forum', async ({ page }) => {
    await page.goto('/blog/editorial-list')
    await page.locator('html[data-hydrated]').waitFor({ state: 'attached' })
    await page.getByTestId('preview-panel-trigger').click()
    const dialog = page.getByRole('dialog', { name: 'Preview', exact: true })
    await expect(dialog).toBeVisible()

    const sections = await dialog.getByRole('heading', { level: 3 }).allInnerTexts()
    expect(sections.slice(0, 5)).toEqual(['Pages', 'Blog', 'Forum', 'Status pages', 'Components'])
    const blog = dialog
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Blog', exact: true }) })
    await expect(blog.getByRole('link')).toHaveCount(6)

    await blog.getByRole('link', { name: 'Magazine grid: post', exact: true }).click()
    await expect(page).toHaveURL(/\/blog\/magazine-grid\/cold-start-62$/)
  })

  const VARIANTS = ['editorial-list', 'magazine-grid', 'journal-rail'] as const
  const YAML = 'Console 4.2: schema-aware YAML editing'
  const hydrated = (page: Page) =>
    page.locator('html[data-hydrated]').waitFor({ state: 'attached' })

  for (const variant of VARIANTS) {
    test(`${variant}: index to post and back`, async ({ page }) => {
      await page.goto(`/blog/${variant}`)
      await hydrated(page)
      const index = await page.getByRole('heading', { level: 1 }).innerText()

      await page.getByRole('link', { name: YAML }).first().click()
      await expect(page).toHaveURL(new RegExp(`/blog/${variant}/console-4-2$`))
      await expect(page.getByRole('heading', { level: 1, name: YAML })).toBeVisible()

      await page.getByRole('banner').getByRole('link', { name: /Kemo/ }).first().click()
      await expect(page).toHaveURL(new RegExp(`/blog/${variant}$`))
      await expect(page.getByRole('heading', { level: 1, name: index })).toBeVisible()
    })

    test(`${variant}: topic filter narrows the list`, async ({ page }) => {
      await page.goto(`/blog/${variant}`)
      await hydrated(page)

      await page
        .getByRole(variant === 'magazine-grid' ? 'tab' : 'button', { name: /^Releases/ })
        .click()

      const articles = page.getByRole('main').getByRole('article')
      await expect(articles).toHaveCount(2)
      await expect(articles.getByRole('heading')).toHaveText([
        YAML,
        'Console 4.1: deployments, rewritten',
      ])
    })
  }

  test('magazine grid paginates', async ({ page }) => {
    await page.goto('/blog/magazine-grid')
    await hydrated(page)
    await expect(page.getByRole('link', { name: YAML })).toBeVisible()
    await expect(
      page.getByRole('link', { name: 'Console 4.1: deployments, rewritten' }),
    ).toHaveCount(0)

    await page
      .getByRole('link', { name: /page 2/i })
      .or(page.getByRole('button', { name: /page 2/i }))
      .first()
      .click()

    await expect(
      page.getByRole('link', { name: 'Console 4.1: deployments, rewritten' }),
    ).toBeVisible()
    await expect(page.getByRole('link', { name: YAML })).toHaveCount(0)
  })

  test('subscribe through the dialog', async ({ page }) => {
    await page.goto('/blog/editorial-list')
    await hydrated(page)
    await page.getByRole('button', { name: 'Subscribe' }).click()
    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Email').fill('ada@example.com')
    await dialog.getByRole('button', { name: 'Subscribe' }).click()

    await expect(dialog.getByText('Thanks. Check ada@example.com to confirm.')).toBeVisible()
    // The form, and the button that held focus, are gone: focus stays in the dialog.
    await expect(dialog.getByRole('status')).toBeFocused()
  })

  test('subscribe failure keeps the form', async ({ page }) => {
    await page.goto('/blog/editorial-list')
    await hydrated(page)
    await page.getByRole('button', { name: 'Subscribe' }).click()
    const dialog = page.getByRole('dialog')

    await dialog.getByLabel('Email').fill('fail@example.com')
    await dialog.getByRole('button', { name: 'Subscribe' }).click()

    await expect(dialog.getByRole('alert')).toHaveText(
      'We could not subscribe that address. Try again.',
    )
    await expect(dialog.getByLabel('Email')).toBeVisible()
  })

  test('subscribe from the journal rail', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/blog/journal-rail')
    await hydrated(page)
    const rail = page.getByRole('complementary')

    await rail.getByLabel('Email').fill('ada@example.com')
    await rail.getByRole('button', { name: 'Subscribe' }).click()

    await expect(rail.getByText('Thanks. Check ada@example.com to confirm.')).toBeVisible()
    await expect(rail.getByRole('status')).toBeFocused()
  })

  for (const variant of VARIANTS) {
    test(`${variant}: post a comment and a reply`, async ({ page }) => {
      await page.setViewportSize({ width: 1280, height: 900 })
      await page.goto(`/blog/${variant}/cold-start-62`)
      await hydrated(page)
      const comments = page.getByRole('region', { name: /^Comments/ })
      const heading = comments.getByRole('heading', { level: 2 })
      await expect(heading).toHaveAccessibleName('Comments (4)')

      await comments.getByLabel('Name').fill('Ada')
      await comments.getByLabel('Comment').fill('Great write-up.')
      await comments.getByRole('button', { name: 'Post comment' }).click()

      await expect(comments.getByRole('status')).toHaveText('Comment posted.')
      await expect(heading).toHaveAccessibleName('Comments (5)')
      const posted = comments.getByRole('article').filter({ hasText: 'Great write-up.' })
      await expect(posted).toBeVisible()

      await posted.getByRole('button', { name: 'Reply' }).click()
      await comments.getByPlaceholder('Reply to Ada').fill('Thanks!')
      await comments.getByRole('button', { name: 'Post reply' }).click()

      await expect(heading).toHaveAccessibleName('Comments (6)')
      await expect(posted.getByRole('button', { name: 'Reply' })).toBeFocused()
      await expect(comments.getByRole('status')).toHaveCount(1)
      const item = comments.getByRole('listitem').filter({ hasText: 'Great write-up.' }).first()
      await expect(item.getByRole('list').getByRole('article')).toContainText('Thanks!')
    })
  }

  test('a failed comment keeps its text', async ({ page }) => {
    await page.goto('/blog/editorial-list/cold-start-62')
    await hydrated(page)
    const comments = page.getByRole('region', { name: /^Comments/ })

    await comments.getByLabel('Name').fill('Ada')
    await comments.getByLabel('Comment').fill('please fail')
    await comments.getByRole('button', { name: 'Post comment' }).click()

    await expect(comments.getByRole('alert')).toHaveText(
      'Your comment could not be posted. Try again.',
    )
    await expect(comments.getByLabel('Comment')).toHaveValue('please fail')
  })

  test('a post without comments shows the empty state', async ({ page }) => {
    await page.goto('/blog/editorial-list/streaming-events')
    await hydrated(page)
    const comments = page.getByRole('region', { name: /^Comments/ })

    await expect(comments.getByText('No comments yet.')).toBeVisible()
    await expect(comments.getByRole('button', { name: 'Post comment' })).toBeVisible()
  })

  test('a long unbroken comment does not widen the page at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/blog/editorial-list/streaming-events')
    await hydrated(page)
    const comments = page.getByRole('region', { name: /^Comments/ })

    await comments.getByLabel('Name').fill('Ada')
    await comments.getByLabel('Comment').fill('a'.repeat(300))
    await comments.getByRole('button', { name: 'Post comment' }).click()

    await expect(comments.getByRole('article')).toContainText('a'.repeat(300))
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
  })

  test('journal post tracks the current section', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/blog/journal-rail/cold-start-62')
    await hydrated(page)

    const link = page
      .getByRole('navigation', { name: 'On this page' })
      .getByRole('link', { name: 'Results' })
    await link.click()

    await expect(page).toHaveURL(/#results$/)
    await expect(link).toHaveAttribute('aria-current', 'location')
  })

  test('the journal rail stays reachable by role at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/blog/journal-rail')
    await hydrated(page)

    const topics = page.getByRole('navigation', { name: 'Topics' })
    await expect(topics).toBeVisible()
    await expect(topics.getByRole('button', { name: /^Releases/ })).toBeVisible()
    await expect(page.getByRole('heading', { level: 1, name: 'Platform journal' })).toBeVisible()
  })

  /**
   * Tabs from the top of the page until focus leaves the blog's header, main and footer, and returns
   * each stop's label and its top edge in page coordinates.
   */
  async function tabStops(page: Page) {
    const stops: { name: string; top: number }[] = []
    for (let i = 0; i < 100; i++) {
      await page.keyboard.press('Tab')
      const stop = await page.evaluate(() => {
        const el = document.activeElement
        if (!el?.closest('header, main, footer')) return null
        const name = (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
        return { name, top: el.getBoundingClientRect().top + window.scrollY }
      })
      if (!stop) break
      stops.push(stop)
    }
    return stops
  }

  const JOURNAL_STOPS = [
    ['index', '/blog/journal-rail', ['Engineering 4', YAML, 'Load older posts', 'Subscribe']],
    [
      'post',
      '/blog/journal-rail/cold-start-62',
      ['← Platform journal', 'Copy link', 'Post comment', `← ${YAML}`],
    ],
  ] as const

  for (const [kind, route, landmarks] of JOURNAL_STOPS) {
    test(`journal ${kind}: at 375px Tab moves down the page`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto(route)
      await hydrated(page)

      const stops = await tabStops(page)

      expect(stops.map((stop) => stop.name)).toEqual(expect.arrayContaining([...landmarks]))
      // Each stop is level with the one before (a row of chips) or below it.
      const upward = stops.filter((stop, i) => i > 0 && stop.top < stops[i - 1]!.top - 1)
      expect(upward).toEqual([])
    })
  }

  test('journal post at 375px puts Copy link between the prose and the comments', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 })
    await page.goto('/blog/journal-rail/cold-start-62')
    await hydrated(page)
    const main = page.getByRole('main')

    const prose = (await main.getByRole('article').first().boundingBox())!
    const copy = (await main.getByRole('button', { name: 'Copy link' }).boundingBox())!
    const comments = (await main.getByRole('region', { name: /^Comments/ }).boundingBox())!

    expect(copy.y).toBeGreaterThanOrEqual(prose.y + prose.height)
    expect(copy.y + copy.height).toBeLessThanOrEqual(comments.y)
  })

  test('journal post at 1280px: the rail follows the post and rests above Copy link', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/blog/journal-rail/cold-start-62')
    await hydrated(page)
    const rail = page.getByRole('complementary')
    const copy = page.getByRole('button', { name: 'Copy link' })

    await page.evaluate(() => window.scrollTo(0, 1000))
    expect((await rail.boundingBox())!.y).toBeCloseTo(24, 0)

    // Scroll until the post's last lines are mid-screen: the rail has come to rest on Copy link.
    await page.evaluate(() => {
      const article = document.querySelector('main article')!
      window.scrollTo(0, article.getBoundingClientRect().bottom + window.scrollY - 350)
    })
    const railBox = (await rail.boundingBox())!
    const copyBox = (await copy.boundingBox())!
    expect(copyBox.x).toBeCloseTo(railBox.x, 0)
    expect(railBox.y + railBox.height).toBeLessThanOrEqual(copyBox.y)
    expect(copyBox.y - (railBox.y + railBox.height)).toBeLessThan(40)
  })

  test('a comment posts where crypto.randomUUID is missing (plain http)', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Crypto.prototype, 'randomUUID', { value: undefined })
    })
    await page.goto('/blog/editorial-list/streaming-events')
    await hydrated(page)
    const comments = page.getByRole('region', { name: /^Comments/ })

    await comments.getByLabel('Name').fill('Ada')
    await comments.getByLabel('Comment').fill('Posted over plain http.')
    await comments.getByRole('button', { name: 'Post comment' }).click()

    await expect(comments.getByRole('status')).toHaveText('Comment posted.')
    await expect(comments.getByRole('article')).toContainText('Posted over plain http.')
  })

  test('magazine grid post centres the prose, the tags row and the comments', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/blog/magazine-grid/cold-start-62')
    await hydrated(page)
    const main = page.getByRole('main')
    const box = async (locator: ReturnType<Page['locator']>) => (await locator.boundingBox())!
    const near = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1)

    const title = await box(main.getByRole('heading', { level: 1 }))
    const prose = await box(main.getByRole('article').first().locator('> *'))
    const tagsRow = await box(main.getByRole('list', { name: 'Tags' }).locator('..'))
    const comments = await box(main.getByRole('region', { name: /^Comments/ }))

    for (const column of [tagsRow, comments]) {
      near(column.x, prose.x)
      near(column.width, prose.width)
    }
    near(prose.x + prose.width / 2, title.x + title.width / 2)
  })

  test('copy link confirms', async ({ page, context, baseURL }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: baseURL })
    await page.setViewportSize({ width: 1280, height: 900 })
    await page.goto('/blog/editorial-list/cold-start-62')
    await hydrated(page)

    await page.getByRole('button', { name: 'Copy link' }).first().click()

    await expect(page.getByRole('button', { name: 'Copied' }).first()).toBeVisible()
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(page.url())
  })

  test('dark theme renders an index and a post', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    for (const route of ['/blog/editorial-list', '/blog/editorial-list/cold-start-62']) {
      await page.goto(route)
      await hydrated(page)

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const luminance = await page.evaluate(() => {
        const [r, g, b] = getComputedStyle(document.body)
          .backgroundColor.match(/[\d.]+/g)!
          .map(Number)
        return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255
      })
      expect(luminance).toBeLessThan(0.2)
    }
  })
})
