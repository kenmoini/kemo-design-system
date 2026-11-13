import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { isSolved } from '../content'
import { chrome, testCategories, testTopics } from '../test-data'
import { BoardsCategory } from './category-page'

const category = testCategories.find((c) => c.id === 'kemo-console')!
const props = {
  ...chrome,
  variant: 'boards' as const,
  category,
  categories: testCategories,
  topics: testTopics,
}
const rows = () => screen.getAllByRole('article')

describe('BoardsCategory', () => {
  it('renders the breadcrumb and one h1', () => {
    render(<BoardsCategory {...props} />)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Boards' })).toHaveAttribute(
      'href',
      '/forum/boards',
    )
    expect(within(crumbs).getByText('Kemo Console')).toHaveAttribute('aria-current', 'page')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kemo Console')
  })

  it('pins first, pages ten rows and shows the rest on page 2', async () => {
    const user = userEvent.setup()
    render(<BoardsCategory {...props} />)
    expect(screen.getByText('12 topics', { selector: 'p:not([role=status])' })).toBeVisible()
    expect(rows()).toHaveLength(10)
    expect(within(rows()[0]!).getByText('Read this before posting in Kemo Console')).toBeVisible()
    const pager = screen.getByRole('navigation', { name: 'Topics' })
    await user.click(within(pager).getByRole('button', { name: 'last page, page 2' }))
    expect(rows()).toHaveLength(2)
  })

  it('filters to Solved and returns to page 1', async () => {
    const user = userEvent.setup()
    render(<BoardsCategory {...props} />)
    await user.click(
      within(screen.getByRole('navigation', { name: 'Topics' })).getByRole('button', {
        name: 'last page, page 2',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Solved' }))
    expect(screen.getByRole('button', { name: 'Solved' })).toHaveAttribute('aria-pressed', 'true')
    expect(rows()).toHaveLength(1)
    expect(screen.getByRole('status')).toHaveTextContent('1 topic')
    expect(screen.queryByRole('navigation', { name: 'Topics' })).not.toBeInTheDocument()
  })

  it('names the reply and view counts of a row for assistive technology', () => {
    render(<BoardsCategory {...props} />)
    const pinned = rows()[0]!
    expect(within(pinned).getByText('replies').parentElement).toHaveTextContent(/^2 replies$/)
    expect(within(pinned).getByText('views').parentElement).toHaveTextContent(/^5\.4k views$/)
  })

  it('searches this category only, without category badges', async () => {
    const user = userEvent.setup()
    render(<BoardsCategory {...props} />)
    const field = screen.getAllByRole('searchbox')[0]!
    // "rbac" is a Getting started topic: not in Kemo Console's results.
    await user.type(field, 'rbac{Enter}')
    expect(screen.getByRole('heading', { name: '0 results for “rbac”' })).toBeInTheDocument()
    await user.clear(field)
    await user.type(field, 'shell{Enter}')
    expect(screen.getByRole('heading', { name: '1 result for “shell”' })).toBeInTheDocument()
    expect(rows()).toHaveLength(1)
    expect(within(rows()[0]!).queryByText('Kemo Console')).not.toBeInTheDocument()
  })

  it('shows an empty state without topics', () => {
    render(<BoardsCategory {...props} topics={[]} />)
    expect(screen.getByText('No topics yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('titles the rows with h2, directly under the h1', () => {
    render(<BoardsCategory {...props} />)
    expect(within(rows()[0]!).getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('offers Show all when a filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<BoardsCategory {...props} topics={testTopics.filter((t) => !isSolved(t))} />)
    await user.click(screen.getByRole('button', { name: 'Solved' }))
    expect(screen.getByText('No topics match this filter.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'true')
    expect(rows().length).toBeGreaterThan(0)
  })

  it('keeps "No topics yet." without an action when the category is empty', () => {
    render(<BoardsCategory {...props} topics={[]} />)
    expect(screen.getByText('No topics yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument()
  })
})
