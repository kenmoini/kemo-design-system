import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { isSolved, replyCountOf, topContributors, weekStats } from '../content'
import { chrome, testCategories, testTopics, TEST_NOW } from '../test-data'
import { DiscussionsCategory } from './category-page'
import { DiscussionsIndex } from './index-page'

const base = { ...chrome, variant: 'discussions' as const, categories: testCategories }
const indexProps = {
  ...base,
  title: 'Kemo Community',
  description: 'Questions, answers and release talk.',
  topics: testTopics,
}
const consoleCategory = testCategories.find((c) => c.id === 'kemo-console')!
const categoryProps = { ...base, category: consoleCategory, topics: testTopics }

const rowsOf = () => screen.getAllByRole('article')
const titlesOf = () => rowsOf().map((r) => within(r).getByRole('heading', { level: 2 }).textContent)
const pinnedTitle = 'Read this before posting in Kemo Console'
const unanswered = testTopics.filter((t) => replyCountOf(t) === 0)

describe('DiscussionsIndex', () => {
  it('offers Show all when a filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<DiscussionsIndex {...indexProps} topics={testTopics.filter((t) => !isSolved(t))} />)
    await user.click(screen.getByRole('button', { name: 'Solved' }))
    expect(screen.getByText('No discussions match this filter.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'true')
    expect(rowsOf().length).toBeGreaterThan(0)
  })

  it('moves focus to the first revealed row when Load more is used', async () => {
    const user = userEvent.setup()
    render(<DiscussionsIndex {...indexProps} />)
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
    expect(document.activeElement).toBe(
      within(within(rowsOf()[8]!).getByRole('heading')).getByRole('link'),
    )
  })

  it('renders exactly one h1, visually hidden', () => {
    render(<DiscussionsIndex {...indexProps} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    const h1 = screen.getByRole('heading', { level: 1 })
    expect(h1).toHaveTextContent('Kemo Community')
    expect(h1.className).toMatch(/sr_true/)
  })

  it('lists the pinned topic first with "Pinned", only under Latest', async () => {
    const user = userEvent.setup()
    render(<DiscussionsIndex {...indexProps} />)
    expect(within(rowsOf()[0]!).getByText('Pinned')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Top' }))
    expect(screen.getByRole('button', { name: 'Top' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'false')
    expect(titlesOf()[0]).not.toBe(pinnedTitle)
    expect(rowsOf()[0]!.closest('li')!.className).not.toMatch(/bg_gray/)
  })

  it('Unanswered shows the count and only zero-reply topics', async () => {
    const user = userEvent.setup()
    render(<DiscussionsIndex {...indexProps} />)
    await user.click(screen.getByRole('button', { name: 'Unanswered' }))
    expect(screen.getByText(`${unanswered.length} unanswered`)).toBeInTheDocument()
    expect(rowsOf()).toHaveLength(Math.min(8, unanswered.length))
    for (const row of rowsOf()) expect(row).toHaveTextContent('0 replies')
  })

  it('shows 8 rows then reveals the rest with Load more', async () => {
    const user = userEvent.setup()
    render(<DiscussionsIndex {...indexProps} />)
    expect(rowsOf()).toHaveLength(8)
    expect(
      screen.getByText(`${testTopics.length} discussions`, { selector: 'p:not([role])' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(rowsOf()).toHaveLength(testTopics.length)
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })

  it('shows the call to action linking to the composer', () => {
    render(<DiscussionsIndex {...indexProps} />)
    const cta = screen.getByRole('region', { name: 'Start a discussion' })
    expect(within(cta).getByRole('link', { name: 'New discussion' })).toHaveAttribute(
      'href',
      '/forum/boards/new',
    )
  })

  it('lists every category with its count, and All', () => {
    render(<DiscussionsIndex {...indexProps} />)
    const nav = screen.getByRole('navigation', { name: 'Categories' })
    expect(nav).toHaveAttribute('id', 'categories')
    expect(within(nav).getByRole('link', { name: /^All/ })).toHaveAttribute('href', '/forum/boards')
    expect(within(nav).getByRole('link', { name: /^All/ })).toHaveTextContent('1,248')
    for (const c of testCategories) {
      const link = within(nav).getByRole('link', { name: new RegExp(`^${c.label}`) })
      expect(link).toHaveAttribute('href', `/forum/boards/c/${c.id}`)
      expect(link).toHaveTextContent(new RegExp(`${c.topicCount}$`))
      expect(link).not.toHaveAttribute('aria-current')
    }
  })

  it('shows the week numbers computed from the topics', () => {
    render(<DiscussionsIndex {...indexProps} />)
    const stats = weekStats(testTopics, TEST_NOW)
    const block = screen.getByRole('heading', { name: 'This week' }).parentElement!
    for (const [label, value] of [
      ['new topics', stats.topics],
      ['replies', stats.replies],
      ['solved', stats.solved],
    ] as const) {
      expect(within(block).getByText(label).previousElementSibling).toHaveTextContent(String(value))
    }
  })

  it('lists four top contributors, Staff instead of a count for staff', () => {
    render(<DiscussionsIndex {...indexProps} />)
    const block = screen.getByRole('heading', { name: 'Top contributors' }).parentElement!
    const items = within(block).getAllByRole('listitem')
    expect(items).toHaveLength(4)
    for (const { user, count } of topContributors(testTopics, 4)) {
      const item = items.find((i) => i.textContent?.includes(user.name))!
      if (user.role === 'staff') {
        expect(within(item).getByText('Staff')).toBeInTheDocument()
        expect(item).not.toHaveTextContent(new RegExp(`${count}$`))
      } else {
        expect(item).toHaveTextContent(new RegExp(`${count}$`))
      }
    }
    expect(within(block).getAllByText('Staff').length).toBeGreaterThan(0)
  })

  it('searches, shows results in rows, and Clear restores the feed', async () => {
    const user = userEvent.setup()
    render(<DiscussionsIndex {...indexProps} />)
    const field = screen.getAllByRole('searchbox')[0]!
    await user.type(field, 'rbac{Enter}')
    expect(screen.getByRole('heading', { name: /1 result for/ })).toBeInTheDocument()
    expect(rowsOf()).toHaveLength(1)
    expect(screen.queryByRole('group', { name: 'Filter' })).not.toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: 'Categories' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('group', { name: 'Filter' })).toBeInTheDocument()
    expect(field).toHaveValue('')
    expect(rowsOf()).toHaveLength(8)
  })

  it('shows the category badge on index search results but not on a category page', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<DiscussionsIndex {...indexProps} />)
    await user.type(screen.getAllByRole('searchbox')[0]!, 'schema{Enter}')
    expect(within(rowsOf()[0]!).getByRole('link', { name: 'Kemo Console' })).toBeInTheDocument()
    unmount()
    render(<DiscussionsCategory {...categoryProps} />)
    await user.type(screen.getAllByRole('searchbox')[0]!, 'schema{Enter}')
    expect(rowsOf().length).toBeGreaterThan(0)
    for (const row of rowsOf()) {
      expect(within(row).queryByRole('link', { name: 'Kemo Console' })).not.toBeInTheDocument()
    }
  })

  it('shows an empty state with no topics', () => {
    render(<DiscussionsIndex {...indexProps} topics={[]} />)
    expect(screen.getByText('No discussions yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Load more' })).not.toBeInTheDocument()
  })
})

describe('DiscussionsCategory', () => {
  it('offers Show all when a filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<DiscussionsCategory {...categoryProps} topics={[]} />)
    expect(screen.getByText('No discussions yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Solved' }))
    expect(screen.getByText('No discussions match this filter.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByRole('button', { name: 'Latest' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('renders the category h1 and description', () => {
    render(<DiscussionsCategory {...categoryProps} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1, name: 'Kemo Console' }).className).not.toMatch(
      /sr_true/,
    )
    expect(screen.getByText(consoleCategory.description)).toBeInTheDocument()
  })

  it('limits rows to the category, pinned first, without the other pinned topic', async () => {
    const user = userEvent.setup()
    render(<DiscussionsCategory {...categoryProps} />)
    const own = testTopics.filter((t) => t.categoryId === 'kemo-console')
    expect(
      screen.getByText(`${own.length} discussions`, { selector: 'p:not([role])' }),
    ).toBeInTheDocument()
    expect(titlesOf()[0]).toBe(pinnedTitle)
    await user.click(screen.getByRole('button', { name: 'Load more' }))
    expect(rowsOf()).toHaveLength(own.length)
    expect(screen.queryByText(/Forum guidelines and how to ask/)).not.toBeInTheDocument()
  })

  it('marks the current category in the rail', () => {
    render(<DiscussionsCategory {...categoryProps} />)
    const nav = screen.getByRole('navigation', { name: 'Categories' })
    const current = within(nav).getAllByRole('link', { current: 'page' })
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveTextContent('Kemo Console')
  })

  it('shows an empty state and zero week stats with no topics', () => {
    render(<DiscussionsCategory {...categoryProps} topics={[]} />)
    expect(screen.getByText('No discussions yet.')).toBeInTheDocument()
    const block = screen.getByRole('heading', { name: 'This week' }).parentElement!
    for (const label of ['new topics', 'replies', 'solved']) {
      expect(within(block).getByText(label).previousElementSibling).toHaveTextContent('0')
    }
  })
})
