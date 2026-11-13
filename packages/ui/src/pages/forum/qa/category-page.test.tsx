import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { isSolved } from '../content'
import { chrome, testCategories, testTopics } from '../test-data'
import { QaCategory } from './category-page'

const category = testCategories.find((c) => c.id === 'kemo-console')!
const props = {
  ...chrome,
  variant: 'qa' as const,
  category,
  categories: testCategories,
  topics: testTopics,
}
const rows = () => screen.getAllByRole('article')

describe('QaCategory', () => {
  it('renders the breadcrumb, one h1 and the ratio line', () => {
    render(<QaCategory {...props} />)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Questions' })).toHaveAttribute(
      'href',
      '/forum/boards',
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kemo Console')
    expect(screen.getByText('477 of 486 questions have an accepted answer')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ask a question' })).toHaveAttribute(
      'href',
      '/forum/boards/new?category=kemo-console',
    )
  })

  it('pins first, pages ten rows and shows the rest on page 2', async () => {
    const user = userEvent.setup()
    render(<QaCategory {...props} />)
    expect(screen.getByText('12 questions', { selector: 'p:not([role=status])' })).toBeVisible()
    expect(rows()).toHaveLength(10)
    expect(within(rows()[0]!).getByText('Read this before posting in Kemo Console')).toBeVisible()
    const pager = screen.getByRole('navigation', { name: 'Questions' })
    await user.click(within(pager).getByRole('button', { name: 'last page, page 2' }))
    expect(rows()).toHaveLength(2)
  })

  it('filters to Unanswered', async () => {
    const user = userEvent.setup()
    render(<QaCategory {...props} />)
    await user.click(screen.getByRole('button', { name: 'Unanswered' }))
    expect(screen.getByRole('button', { name: 'Unanswered' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(screen.queryByText('Schema browser shows no CRD fields after 4.2')).toBeNull()
    expect(screen.getByText('10 questions', { selector: 'p:not([role=status])' })).toBeVisible()
  })

  it('orders by votes and shows votes in the meta line', async () => {
    const user = userEvent.setup()
    render(<QaCategory {...props} />)
    await user.click(screen.getByRole('button', { name: 'Votes' }))
    expect(
      within(rows()[0]!).getByText('Schema browser shows no CRD fields after 4.2'),
    ).toBeVisible()
    expect(within(rows()[0]!).getByText(/18 votes/)).toBeVisible()
  })

  it('searches within the category and clears back', async () => {
    const user = userEvent.setup()
    render(<QaCategory {...props} />)
    const field = screen.getByRole('searchbox', { name: 'Search questions' })
    await user.type(field, 'crd{Enter}')
    expect(screen.getByRole('heading', { name: /results? for “crd”/ })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(field).toHaveFocus()
    expect(screen.getByRole('button', { name: 'Votes' })).toBeInTheDocument()
  })

  it('shows an empty state without questions', () => {
    render(<QaCategory {...props} topics={[]} />)
    expect(screen.getByText('No questions yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })

  it('titles the rows with h2, directly under the h1', () => {
    render(<QaCategory {...props} />)
    expect(within(rows()[0]!).getByRole('heading', { level: 2 })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
  })

  it('offers Show all when a filter matches nothing', async () => {
    const user = userEvent.setup()
    render(<QaCategory {...props} topics={testTopics.filter(isSolved)} />)
    await user.click(screen.getByRole('button', { name: 'Unanswered' }))
    expect(screen.getByText('No questions match this filter.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Show all' }))
    expect(screen.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true')
    expect(rows().length).toBeGreaterThan(0)
  })

  it('keeps "No questions yet." without an action when the category is empty', () => {
    render(<QaCategory {...props} topics={[]} />)
    expect(screen.getByText('No questions yet.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Show all' })).not.toBeInTheDocument()
  })
})
