import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlogProse } from './blog-prose'
import type { BlogBlock } from './types'

describe('BlogProse', () => {
  it('renders every block type', () => {
    const blocks: BlogBlock[] = [
      { type: 'paragraph', content: 'A plain paragraph.' },
      { type: 'list', items: ['First item', 'Second item'] },
      { type: 'quote', content: 'A pulled quote.', cite: 'Ada' },
      { type: 'code', code: 'print("hi")', language: 'python', caption: 'Hello snippet' },
      { type: 'callout', content: 'Mind the gap.' },
      { type: 'stats', items: [{ value: '42 ms', label: 'p95 latency' }] },
      { type: 'figure', cover: { preset: 2 }, caption: 'A figure caption' },
    ]
    const { container } = render(<BlogProse blocks={blocks} />)
    expect(screen.getByText('A plain paragraph.').tagName).toBe('P')
    const list = screen.getByRole('list')
    expect(within(list).getAllByRole('listitem')).toHaveLength(2)
    expect(container.querySelector('blockquote')).toHaveTextContent('A pulled quote.')
    expect(container.querySelector('cite')).toHaveTextContent('Ada')
    expect(container.querySelector('pre code')).toHaveTextContent('print("hi")')
    expect(screen.getByText('python')).toBeInTheDocument()
    expect(screen.getByText('Hello snippet').tagName).toBe('FIGCAPTION')
    expect(screen.getByText('Note')).toBeInTheDocument()
    expect(screen.getByText('Mind the gap.')).toBeInTheDocument()
    expect(screen.getByText('42 ms').tagName).toBe('DD')
    expect(screen.getByText('p95 latency').tagName).toBe('DT')
    expect(screen.getByText('A figure caption').tagName).toBe('FIGCAPTION')
    expect(container.querySelector('[data-preset="2"]')).toBeInTheDocument()
  })

  it('renders at sm without changing md', () => {
    const blocks: BlogBlock[] = [{ type: 'paragraph', content: 'Body.' }]
    const { container: md } = render(<BlogProse blocks={blocks} />)
    const { container: sm } = render(<BlogProse blocks={blocks} size="sm" />)
    const { container: explicit } = render(<BlogProse blocks={blocks} size="md" />)
    const mdClass = md.firstElementChild?.className
    expect(explicit.firstElementChild?.className).toBe(mdClass)
    expect(sm.firstElementChild?.className).not.toBe(mdClass)
    expect(sm.firstElementChild?.className).toContain('sm')
  })

  it('gives headings the ids from tocOf', () => {
    const blocks: BlogBlock[] = [
      { type: 'heading', level: 2, text: 'Results' },
      { type: 'heading', level: 3, text: 'Results' },
    ]
    render(<BlogProse blocks={blocks} />)
    expect(screen.getAllByRole('heading').map((h) => [h.tagName, h.id])).toEqual([
      ['H2', 'results'],
      ['H3', 'results-2'],
    ])
  })

  it('renders ordered lists as ol', () => {
    const { container } = render(
      <BlogProse blocks={[{ type: 'list', ordered: true, items: ['One', 'Two'] }]} />,
    )
    expect(container.querySelector('ol')).toBeInTheDocument()
    expect(container.querySelector('ul')).not.toBeInTheDocument()
  })

  it('marks a warning callout with a label, not only colour', () => {
    const { container } = render(
      <BlogProse blocks={[{ type: 'callout', tone: 'warning', content: 'Careful.' }]} />,
    )
    expect(screen.getByText('Warning')).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.queryByText('Note')).not.toBeInTheDocument()
  })

  it('uses a custom callout label', () => {
    render(<BlogProse blocks={[{ type: 'callout', label: 'Heads up', content: 'Text' }]} />)
    expect(screen.getByText('Heads up')).toBeInTheDocument()
  })

  it('makes the code block a focusable, named group', () => {
    render(<BlogProse blocks={[{ type: 'code', code: 'x = 1', language: 'python' }]} />)
    const pre = screen.getByRole('group', { name: 'Code example, python' })
    expect(pre.tagName).toBe('PRE')
    expect(pre).toHaveAttribute('tabindex', '0')
  })

  it('names a code block without a language', () => {
    render(<BlogProse blocks={[{ type: 'code', code: 'x = 1' }]} />)
    expect(screen.getByRole('group', { name: 'Code example' })).toHaveAttribute('tabindex', '0')
  })

  it('renders at most three stats', () => {
    const items = [1, 2, 3, 4].map((n) => ({ value: `v${n}`, label: `l${n}` }))
    render(<BlogProse blocks={[{ type: 'stats', items }]} />)
    expect(screen.getAllByText(/^v\d$/)).toHaveLength(3)
    expect(screen.queryByText('v4')).not.toBeInTheDocument()
  })

  it('renders nothing for an empty body', () => {
    render(<BlogProse blocks={[]} />)
    expect(screen.queryAllByRole('heading')).toHaveLength(0)
  })
})
