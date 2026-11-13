import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { chrome, testCategories, testTopics } from '../test-data'
import { QaIndex } from './index-page'

const props = {
  ...chrome,
  variant: 'qa' as const,
  title: 'Kemo Community',
  categories: testCategories,
  topics: testTopics,
}
const field = () => screen.getByRole('searchbox', { name: 'Search questions' })

describe('QaIndex', () => {
  it('renders one h1 and the ratio sentence', () => {
    render(<QaIndex {...props} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ask the community')
    expect(
      screen.getByText('1,146 of 1,248 questions have an accepted answer. Search first, then ask.'),
    ).toBeInTheDocument()
  })

  it('shows four category cards and the rest under Also', () => {
    render(<QaIndex {...props} />)
    const cards = screen.getByRole('region', { name: 'Categories' })
    for (const name of [
      'Kemo Console',
      'Deployments & GitOps',
      'Access & SSO',
      'Getting started',
    ]) {
      expect(within(cards).getByRole('heading', { level: 3, name })).toBeInTheDocument()
    }
    expect(within(cards).getAllByRole('heading', { level: 3 })).toHaveLength(4)
    const also = screen.getByText('Also:').parentElement!
    expect(
      within(also)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Announcements', 'Show and tell', 'Feature requests', 'Bug reports'])
  })

  it('gives each card a progressbar from its own counts', () => {
    render(<QaIndex {...props} />)
    const bar = screen.getByRole('progressbar', { name: /Kemo Console/ })
    expect(bar).toHaveAttribute('aria-valuenow', String(Math.round((477 / 486) * 100)))
    expect(screen.getByText('486 questions · 98% answered')).toBeInTheDocument()
  })

  it('lists only unsolved topics under Needs an answer, with the open count', () => {
    render(<QaIndex {...props} />)
    const section = screen.getByRole('heading', { name: 'Needs an answer' }).closest('section')!
    expect(within(section).getByText('102 open')).toBeInTheDocument()
    const rows = within(section).getAllByRole('article')
    expect(rows).toHaveLength(5)
    for (const row of rows) expect(within(row).queryByText('Solved')).not.toBeInTheDocument()
    expect(within(section).queryByText('Schema browser shows no CRD fields after 4.2')).toBeNull()
  })

  it('lists Trending this week by votes', () => {
    render(<QaIndex {...props} />)
    const section = screen.getByRole('heading', { name: 'Trending this week' }).closest('section')!
    expect(within(section).getAllByRole('article').length).toBeGreaterThan(0)
    expect(within(section).getAllByText(/votes?$/).length).toBeGreaterThan(0)
  })

  it('searches from a popular chip and clears back, focusing the field', async () => {
    const user = userEvent.setup()
    render(<QaIndex {...props} />)
    await user.click(screen.getByRole('button', { name: 'crd' }))
    expect(screen.getByRole('heading', { name: /results? for “crd”/ })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Needs an answer' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('heading', { name: 'Needs an answer' })).toBeInTheDocument()
    expect(field()).toHaveFocus()
  })

  it('searches on Enter', async () => {
    const user = userEvent.setup()
    render(<QaIndex {...props} />)
    await user.type(field(), 'crd{Enter}')
    expect(screen.getByRole('heading', { name: /results? for “crd”/ })).toBeInTheDocument()
  })

  it('links the primary action to the composer', () => {
    render(<QaIndex {...props} />)
    expect(screen.getByRole('link', { name: 'Ask a question' })).toHaveAttribute(
      'href',
      '/forum/boards/new',
    )
  })

  it('renders empty data without throwing', () => {
    render(<QaIndex {...props} categories={[]} topics={[]} />)
    expect(screen.getByText(/0 of 0 questions/)).toBeInTheDocument()
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument()
    expect(screen.getAllByText('No questions yet.')).toHaveLength(2)
  })
})
