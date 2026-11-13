import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { LinkComponent } from '../auth/types'
import { FaqPage } from './faq-page'
import type { FaqTopic } from './types'

const topics: FaqTopic[] = [
  {
    id: 'deployments',
    label: 'Deployments',
    questions: [
      {
        id: 'roll-back',
        question: 'How do I roll back a deployment?',
        answer: 'Open it and roll back.',
      },
      { id: 'canary', question: 'Why is my canary stuck at 10%?', answer: 'It waits for health.' },
    ],
  },
  {
    id: 'billing',
    label: 'Billing',
    questions: [{ id: 'invoice', question: 'Where is my invoice?', answer: 'Under Billing.' }],
  },
]

describe('FaqPage', () => {
  it('renders the default title and a topic index linking to every topic section', () => {
    const { container } = render(<FaqPage topics={topics} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Frequently asked questions' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Topics' })
    const links = within(nav).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(within(nav).getByRole('link', { name: 'Deployments' })).toHaveAttribute(
      'href',
      '#topic-deployments',
    )
    expect(within(nav).getByRole('link', { name: 'Billing' })).toHaveAttribute(
      'href',
      '#topic-billing',
    )
    for (const topic of topics) {
      const section = container.querySelector(`section#topic-${topic.id}`)
      expect(section).not.toBeNull()
      expect(
        within(section as HTMLElement).getByRole('heading', { level: 2, name: topic.label }),
      ).toBeInTheDocument()
    }
  })

  it('renders every question as an h3 with an id and an anchor link to it', () => {
    render(<FaqPage topics={topics} />)
    const questions = topics.flatMap((topic) => topic.questions)
    const headings = screen.getAllByRole('heading', { level: 3 })
    expect(headings).toHaveLength(questions.length)
    const anchors = screen.getAllByRole('link', { name: 'Link to this question' })
    expect(anchors).toHaveLength(questions.length)
    questions.forEach((q, i) => {
      const heading = screen.getByRole('heading', { level: 3, name: q.question })
      expect(heading).toHaveAttribute('id', `q-${q.id}`)
      expect(anchors[i]).toHaveAttribute('href', `#q-${q.id}`)
      expect(document.getElementById(`q-${q.id}`)).toBe(heading)
    })
    expect(screen.getByText('Open it and roll back.')).toBeInTheDocument()
  })

  it('marks the first topic current before any scrolling', () => {
    render(<FaqPage topics={topics} />)
    const nav = screen.getByRole('navigation', { name: 'Topics' })
    expect(within(nav).getByRole('link', { name: 'Deployments' })).toHaveAttribute(
      'aria-current',
      'true',
    )
    expect(within(nav).getByRole('link', { name: 'Billing' })).not.toHaveAttribute('aria-current')
  })

  it('shows a glyph beside the current topic only', () => {
    render(<FaqPage topics={topics} />)
    const nav = screen.getByRole('navigation', { name: 'Topics' })
    const glyphs = nav.querySelectorAll('[data-current-glyph]')
    expect(glyphs).toHaveLength(1)
    expect(glyphs[0]).toHaveAttribute('aria-hidden', 'true')
    expect(within(nav).getByRole('link', { name: 'Deployments' }).contains(glyphs[0]!)).toBe(true)
  })

  it('renders the header context and fires the action', async () => {
    const user = userEvent.setup()
    const onSelect = vi.fn()
    render(
      <FaqPage
        title="Help"
        description="Answers about accounts"
        topics={topics}
        action={{ label: 'Contact support', onSelect }}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Help' })).toBeInTheDocument()
    expect(screen.getByText('Answers about accounts')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Contact support' }))
    expect(onSelect).toHaveBeenCalledTimes(1)
  })

  it('renders an href action through the link component', () => {
    const HostLink: LinkComponent = ({ href, children, ...rest }) => (
      <a href={`/host${href}`} {...rest}>
        {children}
      </a>
    )
    render(
      <FaqPage
        topics={topics}
        action={{ label: 'Contact support', href: '/support' }}
        linkComponent={HostLink}
      />,
    )
    const link = screen.getByRole('link', { name: 'Contact support' })
    expect(link).toHaveAttribute('href', '/host/support')
    expect(link).toHaveClass(/button/)
  })

  it('renders an href action as a bare anchor styled as the button without a link component', () => {
    render(<FaqPage topics={topics} action={{ label: 'Contact support', href: '/support' }} />)
    const link = screen.getByRole('link', { name: 'Contact support' })
    expect(link).toHaveAttribute('href', '/support')
    expect(link).toHaveClass(/button/)
    expect(link).not.toHaveClass(/^link/)
  })

  it('renders the header and an empty index with no topics', () => {
    render(<FaqPage topics={[]} />)
    expect(
      screen.getByRole('heading', { level: 1, name: 'Frequently asked questions' }),
    ).toBeInTheDocument()
    const nav = screen.getByRole('navigation', { name: 'Topics' })
    expect(within(nav).queryAllByRole('link')).toHaveLength(0)
    expect(screen.queryAllByRole('heading', { level: 2 })).toHaveLength(0)
  })

  it('renders a topic without questions as its h2 only', () => {
    render(<FaqPage topics={[{ id: 'security', label: 'Security', questions: [] }]} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Security' })).toBeInTheDocument()
    expect(screen.queryAllByRole('heading', { level: 3 })).toHaveLength(0)
    expect(screen.queryByRole('link', { name: 'Link to this question' })).toBeNull()
  })
})
