import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ForumLayout, type ForumLayoutProps } from './forum-layout'
import { ListStatus } from './list-status'
import { SearchField } from './search-field'
import { SearchResults } from './search-results'
import type { ForumCategory } from './types'

const base: Omit<ForumLayoutProps, 'children'> = {
  variant: 'boards',
  brand: 'Kemo',
  indexHref: '/forum',
  composerHref: (c?: ForumCategory) => (c ? `/new?c=${c.id}` : '/new'),
}
const renderLayout = (over: Partial<ForumLayoutProps> = {}) =>
  render(
    <ForumLayout {...base} {...over}>
      <p>body</p>
    </ForumLayout>,
  )

const realLocation = window.location
afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, value: realLocation })
})

describe('ForumLayout', () => {
  it('links the brand to indexHref with the section', () => {
    renderLayout()
    const link = screen.getByRole('link', { name: /Kemo/ })
    expect(link).toHaveAttribute('href', '/forum')
    expect(link).toHaveTextContent('/ Community')
  })

  it('marks the current nav item', () => {
    renderLayout({
      nav: [
        { label: 'Boards', href: '/forum', current: true },
        { label: 'Docs', href: '/docs' },
      ],
    })
    const nav = screen.getByRole('navigation', { name: 'Forum' })
    expect(nav.querySelector('[aria-current=page]')).toHaveTextContent('Boards')
    expect(screen.getByRole('link', { name: 'Docs' })).not.toHaveAttribute('aria-current')
  })

  it('omits the primary action with hidePrimary', () => {
    renderLayout({ hidePrimary: true })
    expect(screen.queryByRole('link', { name: 'New topic' })).toBeNull()
  })

  it('shows Sign in only with signInHref', () => {
    const { unmount } = renderLayout()
    expect(screen.queryByRole('link', { name: 'Sign in' })).toBeNull()
    unmount()
    renderLayout({ signInHref: '/login' })
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it.each([
    ['boards', 'New topic'],
    ['discussions', 'New discussion'],
    ['qa', 'Ask a question'],
  ] as const)('primary action for %s', (variant, label) => {
    renderLayout({ variant })
    expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', '/new')
  })

  it('links the primary action with the composer category', () => {
    const category = { id: 'console' } as ForumCategory
    renderLayout({ composerCategory: category })
    expect(screen.getByRole('link', { name: 'New topic' })).toHaveAttribute(
      'href',
      '/new?c=console',
    )
  })

  it('renders the search field with the variant placeholder when bound', () => {
    renderLayout({ search: { value: '', onChange: vi.fn(), onSubmit: vi.fn() } })
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Search topics')).toBeInTheDocument()
  })

  it('renders no field for qa', () => {
    renderLayout({
      variant: 'qa',
      search: { value: '', onChange: vi.fn(), onSubmit: vi.fn() },
      searchHref: (q) => `/?q=${q}`,
    })
    expect(screen.queryByRole('search')).toBeNull()
  })

  it('renders no field without search or searchHref', () => {
    renderLayout()
    expect(screen.queryByRole('search')).toBeNull()
  })

  it('bound mode forwards typing and Enter', async () => {
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    renderLayout({ search: { value: '', onChange, onSubmit } })
    const input = screen.getByRole('searchbox')
    await userEvent.type(input, 'c{Enter}')
    expect(onChange).toHaveBeenCalledWith('c')
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('navigating mode assigns the searchHref of the trimmed value', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    })
    renderLayout({ searchHref: (q) => `/forum?q=${q}` })
    await userEvent.type(screen.getByRole('searchbox'), ' crd {Enter}')
    expect(assign).toHaveBeenCalledWith('/forum?q=crd')
  })

  it('navigating mode ignores an empty value', async () => {
    const assign = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...window.location, assign },
    })
    renderLayout({ searchHref: (q) => `/forum?q=${q}` })
    await userEvent.type(screen.getByRole('searchbox'), '  {Enter}')
    expect(assign).not.toHaveBeenCalled()
  })

  it('renders the footer with the given year', () => {
    renderLayout({ year: 2031 })
    expect(screen.getByText('© 2031 Kemo')).toBeInTheDocument()
  })

  it('renders a custom footer slot', () => {
    renderLayout({ footer: <span>Legal</span> })
    expect(screen.getByText('Legal')).toBeInTheDocument()
  })
})

describe('SearchField', () => {
  const binding = { value: 'x', onChange: vi.fn(), onSubmit: vi.fn() }

  it('has no button at sm', () => {
    render(<SearchField variant="qa" binding={binding} label="Search questions" />)
    expect(screen.queryByRole('button', { name: 'Search' })).toBeNull()
    expect(screen.getByRole('searchbox', { name: 'Search questions' })).toHaveValue('x')
  })

  it('shows a Search button at lg that submits', () => {
    const onSubmit = vi.fn()
    render(
      <SearchField
        variant="qa"
        size="lg"
        binding={{ ...binding, onSubmit }}
        label="Search questions"
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it('uses the label as the accessible name', () => {
    render(<SearchField variant="boards" binding={binding} label="Find" />)
    expect(screen.getByRole('search', { name: 'Find' })).toBeInTheDocument()
    expect(screen.getByRole('searchbox', { name: 'Find' })).toBeInTheDocument()
  })
})

describe('ListStatus', () => {
  it.each([
    [12, 'topics', '12 topics'],
    [1, 'topics', '1 topic'],
    [1, 'discussions', '1 discussion'],
    [1, 'questions', '1 question'],
    [1, 'results', '1 result'],
    [0, 'topics', 'No topics yet'],
    [0, 'results', 'No results'],
  ] as const)('%s %s', (count, noun, text) => {
    render(<ListStatus count={count} noun={noun} />)
    expect(screen.getByRole('status')).toHaveTextContent(text)
  })
})

describe('SearchResults', () => {
  it('shows the heading, announces and renders children', () => {
    render(
      <SearchResults query="crd" count={3} noun="topics" onClear={vi.fn()}>
        <p>rows</p>
      </SearchResults>,
    )
    expect(
      screen.getByRole('heading', { level: 2, name: '3 results for “crd”' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('3 results')
    expect(screen.getByText('rows')).toBeInTheDocument()
  })

  it('uses the singular for one result and clears', () => {
    const onClear = vi.fn()
    render(
      <SearchResults query="crd" count={1} noun="topics" onClear={onClear}>
        <p>rows</p>
      </SearchResults>,
    )
    expect(screen.getByRole('heading', { name: '1 result for “crd”' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(onClear).toHaveBeenCalledTimes(1)
  })

  it('shows the empty state at zero', () => {
    const onClear = vi.fn()
    render(
      <SearchResults query="zz" count={0} noun="topics" onClear={onClear}>
        <p>rows</p>
      </SearchResults>,
    )
    expect(screen.getByRole('heading', { name: '0 results for “zz”' })).toBeInTheDocument()
    expect(screen.getByText('No topics match “zz”')).toBeInTheDocument()
    expect(screen.queryByText('rows')).toBeNull()
    const clears = screen.getAllByRole('button', { name: 'Clear' })
    fireEvent.click(clears[clears.length - 1]!)
    expect(onClear).toHaveBeenCalledTimes(1)
  })
})
