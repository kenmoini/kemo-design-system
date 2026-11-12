import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { chrome, testCategories, testTopics } from '../test-data'
import { BoardsIndex } from './index-page'

const props = {
  ...chrome,
  variant: 'boards' as const,
  title: 'Kemo Community',
  description: 'Questions, answers and release talk.',
  categories: testCategories,
  topics: testTopics,
  memberCount: 412,
}
const sample = 'Schema browser shows no CRD fields after 4.2'
const field = () => screen.getAllByRole('searchbox')[0]!

describe('BoardsIndex', () => {
  it('renders one h1, the stats and the two sections', () => {
    render(<BoardsIndex {...props} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Kemo Community')
    for (const [label, value] of [
      ['topics', '1,248'],
      ['posts', '9,310'],
      ['members', '412'],
    ] as const) {
      expect(screen.getByText(label).previousElementSibling).toHaveTextContent(value)
    }
    expect(screen.getByRole('heading', { name: 'Product' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Community' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Product' })).toBeInTheDocument()
  })

  it('lists each category once, linking to categoryHref', () => {
    render(<BoardsIndex {...props} />)
    for (const c of testCategories) {
      const links = screen.getAllByRole('link', { name: c.label })
      expect(links).toHaveLength(1)
      expect(links[0]).toHaveAttribute('href', `/forum/boards/c/${c.id}`)
    }
  })

  it('shows the newest topic in the Kemo Console row', () => {
    render(<BoardsIndex {...props} />)
    const row = screen.getByRole('heading', { name: 'Kemo Console' }).closest('article')!
    expect(within(row).getByRole('link', { name: sample })).toHaveAttribute(
      'href',
      '/forum/boards/t/schema-browser-crd',
    )
    expect(within(row).getByText(/Jonas Lindqvist/)).toBeInTheDocument()
  })

  it('shows three Latest cards', () => {
    render(<BoardsIndex {...props} />)
    const latest = screen.getByRole('region', { name: 'Latest' })
    expect(within(latest).getAllByRole('article')).toHaveLength(3)
  })

  it('searches on Enter and clears back to the page, focusing the input', async () => {
    const user = userEvent.setup()
    render(<BoardsIndex {...props} />)
    await user.type(field(), 'crd{Enter}')
    expect(screen.getByRole('heading', { name: /results? for “crd”/ })).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(1)
    expect(screen.getByRole('link', { name: sample })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('1 result')
    expect(screen.queryByRole('heading', { name: 'Product' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.getByRole('heading', { name: 'Product' })).toBeInTheDocument()
    expect(field()).toHaveValue('')
    expect(field()).toHaveFocus()
  })

  it('treats a blank query as no search', async () => {
    const user = userEvent.setup()
    render(<BoardsIndex {...props} />)
    await user.type(field(), '   {Enter}')
    expect(screen.getByRole('heading', { name: 'Product' })).toBeInTheDocument()
  })

  it('renders without topics', () => {
    render(<BoardsIndex {...props} topics={[]} />)
    expect(screen.getAllByText('No topics yet')).toHaveLength(testCategories.length)
    expect(screen.queryByRole('heading', { name: 'Latest' })).not.toBeInTheDocument()
  })
})
