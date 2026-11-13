import { expect, type Page, test } from '@playwright/test'

const SAMPLE = 'Schema browser shows no CRD fields after 4.2'
const THREAD = 'schema-browser-crd'

const PAGES = [
  ['/forum/boards', 'Kemo Community'],
  ['/forum/boards/c/kemo-console', 'Kemo Console'],
  [`/forum/boards/t/${THREAD}`, SAMPLE],
  ['/forum/boards/new', 'New topic'],
  ['/forum/discussions', 'Kemo Community'],
  ['/forum/discussions/c/kemo-console', 'Kemo Console'],
  [`/forum/discussions/t/${THREAD}`, SAMPLE],
  ['/forum/discussions/new', 'New discussion'],
  ['/forum/qa', 'Ask the community'],
  ['/forum/qa/c/kemo-console', 'Kemo Console'],
  [`/forum/qa/t/${THREAD}`, SAMPLE],
  ['/forum/qa/new', 'Ask a question'],
] as const

/** The Discussions front page names itself with a visually hidden h1 (the mockup has no heading). */
const HIDDEN_H1 = '/forum/discussions'

const VARIANTS = ['boards', 'discussions', 'qa'] as const
type Variant = (typeof VARIANTS)[number]

const FRONT_H1: Record<Variant, string> = {
  boards: 'Kemo Community',
  discussions: 'Kemo Community',
  qa: 'Ask the community',
}

/** Each variation's words for its search, reply and composer. */
const WORDS: Record<
  Variant,
  {
    search: string
    noun: string
    replySubmit: string
    replyPosted: string
    titleLabel: string
    composerSubmit: string
  }
> = {
  boards: {
    search: 'Search topics',
    noun: 'topics',
    replySubmit: 'Post reply',
    replyPosted: 'Reply posted.',
    titleLabel: 'Title',
    composerSubmit: 'Post topic',
  },
  discussions: {
    search: 'Search discussions',
    noun: 'discussions',
    replySubmit: 'Comment',
    replyPosted: 'Reply posted.',
    titleLabel: 'Title',
    composerSubmit: 'Start discussion',
  },
  qa: {
    search: 'Search questions',
    noun: 'questions',
    replySubmit: 'Post your answer',
    replyPosted: 'Answer posted.',
    titleLabel: 'Question',
    composerSubmit: 'Post your question',
  },
}

const hydrated = (page: Page) => page.locator('html[data-hydrated]').waitFor({ state: 'attached' })

/** The page-number button of a pager (Ark names the last one "last page, page 2"). */
const pageButton = (n: number) => ({ name: new RegExp(`\\bpage ${n}$`) })

test.describe('forum routes', () => {
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
      await hydrated(page)

      expect(response?.status()).toBe(200)
      const heading = page.getByRole('heading', { level: 1 })
      await expect(heading).toHaveCount(1)
      await expect(heading).toHaveText(h1)
      if (route !== HIDDEN_H1) await expect(heading).toBeVisible()
    })

    test(`${route} has no horizontal scroll at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      await page.goto(route)
      await hydrated(page)

      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
    })
  }

  test('/forum redirects to Boards', async ({ page }) => {
    await page.goto('/forum')

    await expect(page).toHaveURL(/\/forum\/boards$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Kemo Community' })).toBeVisible()
  })

  test('an unknown topic shows the 404 page once hydrated', async ({ page }) => {
    // The server can't know the topics created in the browser, so it answers 200 with an empty
    // page and the browser decides it is a 404.
    const response = await page.goto('/forum/boards/t/nope')
    await hydrated(page)

    expect(response?.status()).toBe(200)
    await expect(
      page.getByRole('heading', { level: 1, name: "There's nothing at this address." }),
    ).toBeVisible()
  })

  test('the preview panel lists the forum after the blog', async ({ page }) => {
    await page.goto('/forum/boards')
    await hydrated(page)
    await page.getByTestId('preview-panel-trigger').click()
    const dialog = page.getByRole('dialog', { name: 'Preview', exact: true })
    await expect(dialog).toBeVisible()

    const sections = await dialog.getByRole('heading', { level: 3 }).allInnerTexts()
    expect(sections.slice(0, 5)).toEqual(['Pages', 'Blog', 'Forum', 'Status pages', 'Components'])
    const forum = dialog
      .locator('section')
      .filter({ has: page.getByRole('heading', { name: 'Forum', exact: true }) })
    await expect(forum.getByRole('link')).toHaveText([
      'Boards',
      'Boards: category',
      'Boards: topic',
      'Discussions feed',
      'Discussions feed: category',
      'Discussions feed: topic',
      'Q&A desk',
      'Q&A desk: category',
      'Q&A desk: topic',
    ])

    await forum.getByRole('link', { name: 'Q&A desk: topic', exact: true }).click()
    await expect(page).toHaveURL(new RegExp(`/forum/qa/t/${THREAD}$`))
    await expect(page.getByRole('heading', { level: 1, name: SAMPLE })).toBeVisible()
  })

  for (const variant of VARIANTS) {
    test(`${variant}: front to category to topic and back`, async ({ page }) => {
      await page.goto(`/forum/${variant}`)
      await hydrated(page)
      const h1 = page.getByRole('heading', { level: 1 })
      const main = page.getByRole('main')
      await expect(h1).toHaveText(FRONT_H1[variant])

      await main.getByRole('link', { name: 'Kemo Console', exact: true }).first().click()
      await expect(page).toHaveURL(new RegExp(`/forum/${variant}/c/kemo-console$`))
      await expect(h1).toHaveText('Kemo Console')

      await main.getByRole('link', { name: SAMPLE }).first().click()
      await expect(page).toHaveURL(new RegExp(`/forum/${variant}/t/${THREAD}$`))
      await expect(h1).toHaveText(SAMPLE)

      await page.getByRole('banner').getByRole('link', { name: /Kemo/ }).first().click()
      await expect(page).toHaveURL(new RegExp(`/forum/${variant}$`))
      await expect(h1).toHaveText(FRONT_H1[variant])
    })
  }

  test('boards: the Solved chip narrows the category', async ({ page }) => {
    await page.goto('/forum/boards/c/kemo-console')
    await hydrated(page)
    const main = page.getByRole('main')
    const filters = main.getByRole('group', { name: 'Filter topics' })
    const solved = filters.getByRole('button', { name: 'Solved' })
    await expect(main.getByRole('article')).toHaveCount(10)

    await solved.click()

    await expect(solved).toHaveAttribute('aria-pressed', 'true')
    await expect(filters.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    await expect(main.getByRole('status')).toHaveText('3 topics')
    await expect(main.getByRole('article').getByRole('heading', { level: 2 })).toHaveText([
      SAMPLE,
      'Keeping Deployment drafts when the tab is closed',
      'Registering a schema for a CRD with several versions',
    ])
  })

  test('discussions: the Unanswered chip shows its count', async ({ page }) => {
    await page.goto('/forum/discussions')
    await hydrated(page)
    const main = page.getByRole('main')
    const unanswered = main.getByRole('group', { name: 'Filter' }).getByRole('button', {
      name: 'Unanswered',
    })

    await unanswered.click()

    await expect(unanswered).toHaveAttribute('aria-pressed', 'true')
    await expect(main.getByText('2 unanswered', { exact: true })).toBeVisible()
    await expect(main.getByRole('status')).toHaveText('2 discussions')
    await expect(main.getByRole('article').getByRole('heading', { level: 2 })).toHaveText([
      'Minimum RBAC for a read-only console account?',
      'Events tab stops updating after a laptop sleep',
    ])
  })

  test('qa: the Votes chip orders the category by score', async ({ page }) => {
    await page.goto('/forum/qa/c/kemo-console')
    await hydrated(page)
    const main = page.getByRole('main')
    const titles = main.getByRole('article').getByRole('heading', { level: 2 })
    const votes = main.getByRole('group', { name: 'Filter' }).getByRole('button', { name: 'Votes' })
    // Newest first: the sample thread is the newest question.
    await expect(titles.nth(0)).toHaveText(SAMPLE)

    await votes.click()

    await expect(votes).toHaveAttribute('aria-pressed', 'true')
    // The most voted question (25) is older than the sample thread (18), so the first row changes.
    await expect(titles.nth(0)).toHaveText('A warning before editing a Deployment Argo CD manages')
    await expect(titles.nth(1)).toHaveText(SAMPLE)
    await expect(titles.nth(2)).toHaveText('Keeping Deployment drafts when the tab is closed')
    await expect(main.getByRole('article').first()).toContainText('25 votes')
  })

  for (const variant of VARIANTS) {
    test(`${variant}: search finds a topic, shows an empty result and clears`, async ({ page }) => {
      await page.goto(`/forum/${variant}`)
      await hydrated(page)
      const { search: name, noun } = WORDS[variant]
      const main = page.getByRole('main')
      const field = page.getByRole('searchbox', { name })
      // The Q&A hero has a Search button; the other fields submit on Enter.
      const searchButton = main.getByRole('button', { name: 'Search', exact: true })
      const submit = async (query: string) => {
        await field.fill(query)
        if (variant === 'qa') await searchButton.click()
        else await field.press('Enter')
      }

      await submit('crd')
      const results = main
        .locator('section')
        .filter({ has: page.getByRole('heading', { level: 2, name: /results? for “crd”/ }) })
      await expect(results.getByRole('link', { name: SAMPLE })).toBeVisible()

      await submit('zzzz')
      await expect(
        main.getByRole('heading', { level: 2, name: '0 results for “zzzz”' }),
      ).toBeVisible()
      await expect(main.getByText(`No ${noun} match “zzzz”`)).toBeVisible()

      await main.getByRole('button', { name: 'Clear' }).first().click()
      await expect(main.getByRole('heading', { level: 2, name: /results? for/ })).toHaveCount(0)
      await expect(field).toHaveValue('')
      const restored = {
        boards: main.getByRole('heading', { level: 2, name: 'Latest' }),
        discussions: main.getByRole('group', { name: 'Filter' }),
        qa: main.getByRole('heading', { level: 2, name: 'Needs an answer' }),
      }[variant]
      await expect(restored).toBeVisible()
    })
  }

  for (const [variant, label] of [
    ['boards', 'Topics'],
    ['qa', 'Questions'],
  ] as const) {
    test(`${variant}: the category pages at ten`, async ({ page }) => {
      await page.goto(`/forum/${variant}/c/kemo-console`)
      await hydrated(page)
      const rows = page.getByRole('main').getByRole('article')
      const pager = page.getByRole('navigation', { name: label })
      await expect(rows).toHaveCount(10)

      await pager.getByRole('button', pageButton(2)).click()

      await expect(pager.getByRole('button', pageButton(2))).toHaveAttribute('aria-current', 'page')
      await expect(rows).toHaveCount(3)
    })
  }

  test('boards: the thread pages at ten posts', async ({ page }) => {
    await page.goto(`/forum/boards/t/${THREAD}`)
    await hydrated(page)
    const main = page.getByRole('main')
    await expect(main.getByText('Posts 1–10 of 13')).toHaveCount(2)
    await expect(main.getByRole('article')).toHaveCount(10)

    await main
      .getByRole('navigation', { name: 'Posts' })
      .first()
      .getByRole('button', pageButton(2))
      .click()

    await expect(main.getByText('Posts 11–13 of 13')).toHaveCount(2)
    await expect(main.getByRole('article')).toHaveCount(3)
    await expect(main.getByRole('article').first()).toContainText('#11')
  })

  test('boards: a link to a post past the first page opens on its page', async ({ page }) => {
    await page.goto(`/forum/boards/t/${THREAD}#post-p12`)
    await hydrated(page)
    const main = page.getByRole('main')

    await expect(main.locator('#post-p12')).toBeVisible()
    await expect(main.locator('#post-p12')).toBeInViewport()
    await expect(main.getByText('Posts 11–13 of 13')).toHaveCount(2)
  })

  for (const variant of VARIANTS) {
    test(`${variant}: a reply appears and is announced`, async ({ page }) => {
      await page.goto(`/forum/${variant}/t/${THREAD}`)
      await hydrated(page)
      const { replySubmit, replyPosted } = WORDS[variant]
      const main = page.getByRole('main')
      const text = `Registered with the apiVersion and it works in ${variant} too.`
      const composer = main.getByRole('textbox', { name: 'Reply' })

      await composer.fill(text)
      await main.getByRole('button', { name: replySubmit, exact: true }).click()

      await expect(main.getByRole('status').filter({ hasText: replyPosted })).toBeVisible()
      await expect(composer).toHaveValue('')
      if (variant === 'boards') {
        // The fourteenth post starts the second page, and the thread moves there by itself.
        await expect(main.getByText('Posts 11–14 of 14')).toHaveCount(2)
      }
      const post = main.getByRole('article').filter({ hasText: text })
      await expect(post).toBeVisible()
      await expect(post).toContainText('just now')
      if (variant === 'boards') {
        await expect(post).toContainText('#14')
        await expect(post).toBeInViewport()
      }
    })
  }

  test('discussions: a nested reply lands under its parent', async ({ page }) => {
    await page.goto(`/forum/discussions/t/${THREAD}`)
    await hydrated(page)
    const main = page.getByRole('main')
    const dan = main.locator('#post-p2')
    const thread = main
      .getByRole('list', { name: 'Replies' })
      .getByRole('listitem')
      .filter({ has: page.locator('#post-p2') })
    const text = 'It was 4.2.1 here as well, on two clusters.'
    const opener = dan.getByRole('button', { name: 'Reply to Dan Okafor', exact: true })

    await opener.click()
    const inline = thread.getByRole('textbox', { name: 'Reply' })
    await expect(inline).toBeFocused()
    await inline.fill(text)
    await thread.getByRole('button', { name: 'Comment', exact: true }).click()

    await expect(thread.getByRole('textbox', { name: 'Reply' })).toHaveCount(0)
    const nested = dan.getByRole('listitem').filter({ hasText: text })
    await expect(nested).toBeVisible()
    await expect(nested).toContainText('just now')
    // The composer is gone, so the page announces the reply and focus goes back to "Reply".
    await expect(main.getByRole('status').filter({ hasText: 'Reply posted.' })).toHaveCount(1)
    await expect(opener).toBeFocused()
  })

  test('discussions: a reaction from the menu', async ({ page }) => {
    await page.goto(`/forum/discussions/t/${THREAD}`)
    await hydrated(page)
    const original = page.getByRole('main').locator('#post-p1')
    await expect(original.getByRole('button', { name: /^🎉/ })).toHaveCount(0)

    await original.getByRole('button', { name: 'Add reaction' }).click()
    await page.getByRole('menuitem', { name: '🎉' }).click()

    const pill = original.getByRole('button', { name: '🎉 1, react' })
    await expect(pill).toBeVisible()
    await expect(pill).toHaveAttribute('aria-pressed', 'true')
  })

  test('qa: an upvote', async ({ page }) => {
    await page.goto(`/forum/qa/t/${THREAD}`)
    await hydrated(page)
    const priya = page.getByRole('main').locator('#post-p4')

    await priya.getByRole('button', { name: 'Upvote, score 18' }).click()

    const upvote = priya.getByRole('button', { name: 'Upvote, score 19' })
    await expect(upvote).toBeVisible()
    await expect(upvote).toHaveAttribute('aria-pressed', 'true')
  })

  test('qa: the asker accepts another answer', async ({ page }) => {
    await page.goto(`/forum/qa/t/${THREAD}`)
    await hydrated(page)
    const answers = page.getByRole('main').getByRole('list', { name: 'Answers' })
    const tomas = answers.locator('#post-p7')
    await expect(answers.getByRole('listitem').first().locator('#post-p4')).toHaveCount(1)

    await tomas.getByRole('button', { name: 'Accept this answer' }).click()

    const accepted = tomas.getByRole('button', { name: 'Accepted answer' })
    await expect(accepted).toBeVisible()
    await expect(accepted).toHaveAttribute('aria-pressed', 'true')
    await expect(answers.getByRole('listitem').first().locator('#post-p7')).toHaveCount(1)
    await expect(answers.getByRole('listitem').first()).toContainText('Accepted answer')
    await expect(
      answers.locator('#post-p4').getByRole('button', { name: 'Accept this answer' }),
    ).toBeVisible()
  })

  test('qa: the asker takes the accepted mark back', async ({ page }) => {
    await page.goto(`/forum/qa/t/${THREAD}`)
    await hydrated(page)
    const main = page.getByRole('main')
    const header = main.getByRole('heading', { level: 1 }).locator('..')
    const priya = main.locator('#post-p4')
    const accepted = priya.getByRole('button', { name: 'Accepted answer' })
    await expect(header.getByText('Solved', { exact: true })).toHaveCount(1)
    await expect(accepted).toHaveAttribute('aria-pressed', 'true')

    await accepted.click()

    const accept = priya.getByRole('button', { name: 'Accept this answer' })
    await expect(accept).toBeVisible()
    await expect(accept).toHaveAttribute('aria-pressed', 'false')
    await expect(header.getByText('Solved', { exact: true })).toHaveCount(0)
  })

  test('boards: Watch toggles', async ({ page }) => {
    await page.goto(`/forum/boards/t/${THREAD}`)
    await hydrated(page)
    const main = page.getByRole('main')
    // Jonas already watches his own thread.
    await main.getByRole('button', { name: 'Watching', exact: true }).click()
    const watch = main.getByRole('button', { name: 'Watch', exact: true })
    await expect(watch).toHaveAttribute('aria-pressed', 'false')

    await watch.click()

    const watching = main.getByRole('button', { name: 'Watching', exact: true })
    await expect(watching).toBeVisible()
    await expect(watching).toHaveAttribute('aria-pressed', 'true')
  })

  test('qa: a comment on the question', async ({ page }) => {
    await page.goto(`/forum/qa/t/${THREAD}`)
    await hydrated(page)
    const main = page.getByRole('main')
    const question = main.locator('#post-p1')
    const text = 'Which registry do you call this on?'

    await question.getByRole('button', { name: 'Add a comment' }).click()
    const field = question.getByRole('textbox', { name: 'Comment' })
    await expect(field).toBeFocused()
    await field.fill(text)
    await question.getByRole('button', { name: 'Post', exact: true }).click()

    const comment = question.getByRole('list', { name: 'Comments' }).getByRole('listitem')
    await expect(comment).toHaveCount(1)
    await expect(comment).toContainText(`Jonas Lindqvist ${text} · just now`)
    await expect(main.getByRole('status').filter({ hasText: 'Comment posted.' })).toHaveCount(1)
    await expect(question.getByRole('button', { name: 'Add a comment' })).toBeVisible()
  })

  const NEW_TITLES: Record<Variant, string> = {
    boards: 'Pinning the schema browser open by default',
    discussions: 'What do you put in a Deployment description?',
    qa: 'How do I register a schema for a CRD in a test?',
  }

  for (const variant of VARIANTS) {
    test(`${variant}: create a topic, land on it and find it on the front page`, async ({
      page,
    }) => {
      await page.goto(`/forum/${variant}/new`)
      await hydrated(page)
      const { titleLabel, composerSubmit } = WORDS[variant]
      const main = page.getByRole('main')
      const title = NEW_TITLES[variant]

      await main.getByRole('textbox', { name: titleLabel }).fill(title)
      await main.getByRole('combobox', { name: 'Category' }).click()
      await page.getByRole('option', { name: 'Kemo Console', exact: true }).click()
      const tags = main.getByRole('textbox', { name: 'Tags' })
      await tags.fill('e2e')
      await tags.press('Enter')
      await main
        .getByRole('textbox', { name: 'Body' })
        .fill('Written by the e2e suite to check that a new topic lands where it should.')
      await main.getByRole('button', { name: composerSubmit, exact: true }).click()

      await expect(page).toHaveURL(new RegExp(`/forum/${variant}/t/[a-z0-9-]+-\\d+$`))
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
      await expect(main.getByText('e2e', { exact: true }).first()).toBeVisible()

      // Through the brand link, a client-side navigation: the demo keeps its state in the browser.
      await page.getByRole('banner').getByRole('link', { name: /Kemo/ }).first().click()
      await expect(page).toHaveURL(new RegExp(`/forum/${variant}$`))
      if (variant === 'boards') {
        const latest = main.getByRole('region', { name: 'Latest' }).getByRole('article')
        await expect(latest.first().getByRole('heading')).toHaveText(title)
      } else if (variant === 'discussions') {
        // The pinned guidelines lead the feed; the new discussion comes straight after.
        const titles = main.getByRole('article').getByRole('heading', { level: 2 })
        await expect(titles.nth(0)).toHaveText(
          'Forum guidelines and how to ask a question that gets answered',
        )
        await expect(titles.nth(1)).toHaveText(title)
      } else {
        const needs = main.getByRole('region', { name: 'Needs an answer' }).getByRole('article')
        await expect(needs.first().getByRole('heading')).toHaveText(title)
      }
    })
  }

  test('boards: the top-bar search on a topic page keeps the demo state', async ({ page }) => {
    const title = 'Searching from a topic keeps this one'
    await page.goto('/forum/boards/new')
    await hydrated(page)
    const main = page.getByRole('main')
    await main.getByRole('textbox', { name: 'Title' }).fill(title)
    await main.getByRole('combobox', { name: 'Category' }).click()
    await page.getByRole('option', { name: 'Kemo Console', exact: true }).click()
    await main
      .getByRole('textbox', { name: 'Body' })
      .fill('Written by the e2e suite to check that a search keeps the new topic.')
    await main.getByRole('button', { name: 'Post topic', exact: true }).click()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)

    const field = page.getByRole('banner').getByRole('searchbox', { name: 'Search topics' })
    await field.fill('crd')
    await field.press('Enter')

    await expect(page).toHaveURL(/\/forum\/boards\?q=crd$/)
    const results = main
      .locator('section')
      .filter({ has: page.getByRole('heading', { level: 2, name: /results? for “crd”/ }) })
    await expect(results.getByRole('link', { name: SAMPLE })).toBeVisible()

    // A full page load would have reset the demo: the new topic is still there.
    await page.getByRole('banner').getByRole('link', { name: /Kemo/ }).first().click()
    await expect(page).toHaveURL(/\/forum\/boards$/)
    const latest = main.getByRole('region', { name: 'Latest' }).getByRole('article')
    await expect(latest.first().getByRole('heading')).toHaveText(title)
  })

  test('a failed reply keeps its text', async ({ page }) => {
    await page.goto(`/forum/boards/t/${THREAD}`)
    await hydrated(page)
    const main = page.getByRole('main')
    const composer = main.getByRole('textbox', { name: 'Reply' })

    await composer.fill('please fail this one')
    await main.getByRole('button', { name: 'Post reply', exact: true }).click()

    await expect(main.getByRole('alert')).toHaveText('The forum could not save that. Try again.')
    await expect(composer).toHaveValue('please fail this one')
    await expect(main.getByText('Posts 1–10 of 13')).toHaveCount(2)
  })

  for (const variant of VARIANTS) {
    test(`${variant}: a long unbroken reply does not widen the page at 375px`, async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 800 })
      // A short thread, so the reply lands on the page in every variation.
      await page.goto(`/forum/${variant}/t/namespaces-per-environment`)
      await hydrated(page)
      const main = page.getByRole('main')
      const long = 'a'.repeat(300)

      await main.getByRole('textbox', { name: 'Reply' }).fill(long)
      await main.getByRole('button', { name: WORDS[variant].replySubmit, exact: true }).click()

      await expect(main.getByRole('article').filter({ hasText: long })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(375)
    })
  }

  test('dark theme renders a page of each variation', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    for (const route of [
      '/forum/boards',
      `/forum/discussions/t/${THREAD}`,
      '/forum/qa/c/kemo-console',
    ]) {
      await page.goto(route)
      await hydrated(page)

      await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
      const luminance = await page.evaluate(() => {
        const [r, g, b] = getComputedStyle(document.body)
          .backgroundColor.match(/[\d.]+/g)!
          .map(Number)
        return (0.2126 * r! + 0.7152 * g! + 0.0722 * b!) / 255
      })
      expect(luminance, route).toBeLessThan(0.2)
    }
  })
})
