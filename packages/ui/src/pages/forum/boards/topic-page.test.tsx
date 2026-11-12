import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { chrome, testCategories, testTopics } from '../test-data'
import { BoardsTopic } from './topic-page'

const topic = testTopics.find((t) => t.slug === 'schema-browser-crd')!
const category = testCategories.find((c) => c.id === topic.categoryId)!
const props = { ...chrome, variant: 'boards' as const, topic, category }
const posts = () => screen.getAllByRole('article')

describe('BoardsTopic', () => {
  it('renders the breadcrumb, one h1 and the meta line', () => {
    render(<BoardsTopic {...props} />)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Kemo Console' })).toHaveAttribute(
      'href',
      '/forum/boards/c/kemo-console',
    )
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(topic.title)
    expect(screen.getByText(/12 replies · 1\.2k views · started/)).toBeInTheDocument()
  })

  it('pages ten posts and shows three on page 2', async () => {
    const user = userEvent.setup()
    render(<BoardsTopic {...props} />)
    expect(screen.getAllByText('Posts 1–10 of 13')).toHaveLength(2)
    expect(posts()).toHaveLength(10)
    await user.click(screen.getAllByRole('button', { name: 'last page, page 2' })[0]!)
    expect(posts()).toHaveLength(3)
    expect(screen.getAllByText('Posts 11–13 of 13')).toHaveLength(2)
    expect(within(posts()[0]!).getByText(/#11/)).toBeInTheDocument()
  })

  it('marks the first post as the original post', () => {
    render(<BoardsTopic {...props} />)
    expect(within(posts()[0]!).getByText('#1 · original post')).toBeInTheDocument()
    expect(posts()[0]).toHaveAttribute('id', 'post-p1')
  })

  it('labels the accepted post and keeps its position', () => {
    render(<BoardsTopic {...props} />)
    const accepted = posts()[3]!
    expect(
      within(accepted).getByText('Accepted answer · marked by Jonas Lindqvist'),
    ).toBeInTheDocument()
    expect(within(accepted).getByText('#4')).toBeInTheDocument()
    expect(within(accepted).getAllByText('Staff').length).toBeGreaterThan(0)
  })

  it('renders the quote on a post that has one', () => {
    render(<BoardsTopic {...props} />)
    const third = posts()[2]!
    expect(within(third).getByText('Dan Okafor wrote')).toBeInTheDocument()
    expect(within(third).getByText('Which exact version, 4.2.0 or 4.2.1?')).toBeInTheDocument()
  })

  it('quotes a post into the composer and submits quoteOf', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<BoardsTopic {...props} onReply={onReply} />)
    await user.click(within(posts()[1]!).getByRole('button', { name: 'Quote' }))
    const form = screen.getByRole('textbox', { name: 'Reply' })
    expect(form).toHaveFocus()
    expect(screen.getAllByText('Dan Okafor wrote')).toHaveLength(2)
    await user.type(form, 'Thanks, that fixed it.')
    await user.click(screen.getByRole('button', { name: 'Post reply' }))
    await waitFor(() =>
      expect(onReply).toHaveBeenCalledWith({ body: 'Thanks, that fixed it.', quoteOf: 'p2' }),
    )
    await waitFor(() => expect(screen.getAllByText('Dan Okafor wrote')).toHaveLength(1))
  })

  it('focuses the composer from the Reply buttons', async () => {
    const user = userEvent.setup()
    render(<BoardsTopic {...props} onReply={vi.fn()} />)
    await user.click(within(posts()[0]!).getByRole('button', { name: 'Reply' }))
    expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveFocus()
    ;(document.activeElement as HTMLElement).blur()
    await user.click(screen.getAllByRole('button', { name: 'Reply' })[0]!)
    expect(screen.getByRole('textbox', { name: 'Reply' })).toHaveFocus()
  })

  it('reacts with a thumbs-up on every post', async () => {
    const user = userEvent.setup()
    const onReact = vi.fn().mockResolvedValue(undefined)
    render(<BoardsTopic {...props} onReact={onReact} />)
    expect(within(posts()[1]!).getByRole('button', { name: '👍 0, react' })).toBeInTheDocument()
    await user.click(within(posts()[3]!).getByRole('button', { name: '👍 18, react' }))
    expect(onReact).toHaveBeenCalledWith('p4', '👍')
  })

  it('toggles Watch to Watching', async () => {
    const user = userEvent.setup()
    const onFollow = vi.fn().mockResolvedValue(undefined)
    render(<BoardsTopic {...props} onFollow={onFollow} />)
    await user.click(screen.getByRole('button', { name: 'Watch' }))
    expect(onFollow).toHaveBeenCalledWith(topic.id, true)
    expect(await screen.findByRole('button', { name: 'Watching' })).toBeInTheDocument()
  })

  it('shows a sign-in line instead of the composer without onReply', () => {
    render(<BoardsTopic {...props} />)
    expect(screen.queryByRole('textbox', { name: 'Reply' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Quote' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reply' })).not.toBeInTheDocument()
    const line = screen.getByText(/to reply\./)
    expect(line).toHaveTextContent('Sign in to reply.')
    expect(within(line).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it('renders an empty topic with the composer', () => {
    render(<BoardsTopic {...props} topic={{ ...topic, posts: [] }} onReply={vi.fn()} />)
    expect(screen.getByText('Posts 0–0 of 0')).toBeInTheDocument()
    expect(screen.getByText('No replies yet.')).toBeInTheDocument()
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Reply' })).toBeInTheDocument()
  })
})
