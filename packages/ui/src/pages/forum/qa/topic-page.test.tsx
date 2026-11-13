import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { groupReplies } from '../content'
import { chrome, testCategories, testTopics } from '../test-data'
import { QaTopic } from './topic-page'

const topic = testTopics.find((t) => t.slug === 'schema-browser-crd')!
const category = testCategories.find((c) => c.id === topic.categoryId)!
const props = { ...chrome, variant: 'qa' as const, topic, category }
const post = (id: string) => document.getElementById(`post-${id}`)!
const answersList = () => screen.getByRole('list', { name: 'Answers' })
const answerIds = () =>
  Array.from(answersList().children)
    .map((li) => li.querySelector(':scope article')?.id)
    .filter(Boolean)
const answerCount = groupReplies(topic.posts!).replies.length

describe('QaTopic', () => {
  it('renders the breadcrumb, one h1 and the meta line', () => {
    render(<QaTopic {...props} />)
    const crumbs = screen.getByRole('navigation', { name: 'Breadcrumb' })
    expect(within(crumbs).getByRole('link', { name: 'Questions' })).toHaveAttribute(
      'href',
      '/forum/boards',
    )
    expect(within(crumbs).getByRole('link', { name: 'Kemo Console' })).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(topic.title)
    expect(screen.getByText(/Asked/)).toBeInTheDocument()
    expect(screen.getByText(/Modified/)).toBeInTheDocument()
    expect(screen.getByText(/Viewed/)).toHaveTextContent('Viewed 1.2k')
  })

  it('without onReply has no composer or comment buttons and links to sign in', () => {
    render(<QaTopic {...props} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Add a comment' })).not.toBeInTheDocument()
    const line = screen.getByText(/to answer\./)
    expect(line).toHaveTextContent('Sign in to answer.')
    expect(within(line).getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login')
  })

  it("shows the topic score on the question's vote column", () => {
    render(<QaTopic {...props} />)
    expect(within(post('p1')).getByText('18')).toBeInTheDocument()
    expect(post('p1').parentElement).not.toBe(answersList())
  })

  it('counts the answers', () => {
    render(<QaTopic {...props} />)
    expect(answerCount).toBe(9)
    expect(screen.getByRole('heading', { level: 2, name: '9 answers' })).toBeInTheDocument()
  })

  it('pins the accepted answer first with its label', () => {
    render(<QaTopic {...props} />)
    expect(answerIds()[0]).toBe('post-p4')
    expect(screen.getByText('Accepted answer', { selector: 'p, span, div' })).toBeInTheDocument()
    expect(within(post('p4')).getByRole('img', { name: 'Accepted answer' })).toBeInTheDocument()
  })

  it('shows a reply to the accepted answer as a comment under it', () => {
    render(<QaTopic {...props} />)
    const comments = within(post('p4')).getByRole('list', { name: 'Comments' })
    expect(within(comments).getByText(/That was it\./)).toBeInTheDocument()
    expect(within(comments).getByText('Jonas Lindqvist')).toBeInTheDocument()
    expect(answerIds()).not.toContain('post-p5')
  })

  it("keeps Dan's question as an answer with Jonas's 4.2.1 as its comment", () => {
    render(<QaTopic {...props} />)
    expect(answerIds()).toContain('post-p2')
    expect(post('p3')).toBeNull()
    expect(
      within(within(post('p2')).getByRole('list', { name: 'Comments' })).getByText(/4\.2\.1\./),
    ).toBeInTheDocument()
  })

  it('reorders with Oldest and Newest, keeping the accepted answer first', async () => {
    const user = userEvent.setup()
    render(<QaTopic {...props} />)
    const votes = screen.getByRole('button', { name: 'Votes' })
    expect(votes).toHaveAttribute('aria-pressed', 'true')
    expect(answerIds().slice(0, 2)).toEqual(['post-p4', 'post-p2'])
    await user.click(screen.getByRole('button', { name: 'Newest' }))
    expect(screen.getByRole('button', { name: 'Newest' })).toHaveAttribute('aria-pressed', 'true')
    expect(votes).toHaveAttribute('aria-pressed', 'false')
    expect(answerIds().slice(0, 2)).toEqual(['post-p4', 'post-p13'])
    await user.click(screen.getByRole('button', { name: 'Oldest' }))
    expect(answerIds().slice(0, 2)).toEqual(['post-p4', 'post-p2'])
    await user.click(votes)
    expect(answerIds()[0]).toBe('post-p4')
  })

  it("upvoting Priya's answer calls onVote", async () => {
    const user = userEvent.setup()
    const onVote = vi.fn().mockResolvedValue(undefined)
    render(<QaTopic {...props} onVote={onVote} />)
    await user.click(within(post('p4')).getByRole('button', { name: /^Upvote/ }))
    expect(onVote).toHaveBeenCalledWith('p4', 'up')
  })

  it('offers to accept every answer when onAcceptAnswer is given', async () => {
    const user = userEvent.setup()
    const onAcceptAnswer = vi.fn().mockResolvedValue(undefined)
    render(<QaTopic {...props} onAcceptAnswer={onAcceptAnswer} />)
    expect(screen.getAllByRole('button', { name: 'Accept this answer' })).toHaveLength(8)
    expect(screen.getByRole('button', { name: 'Accepted answer' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(within(post('p1')).queryByRole('button', { name: /accept/i })).not.toBeInTheDocument()
    await user.click(within(post('p2')).getByRole('button', { name: 'Accept this answer' }))
    expect(onAcceptAnswer).toHaveBeenCalledWith('p2')
  })

  it('renders a post replying to the question as its comment, not an answer', () => {
    const extra = {
      id: 'pc',
      parentId: 'p1',
      author: topic.author,
      postedAt: topic.lastActivityAt,
      body: [{ type: 'paragraph' as const, content: 'Cluster is 1.30.' }],
    }
    render(<QaTopic {...props} topic={{ ...topic, posts: [...topic.posts!, extra] }} />)
    expect(
      within(within(post('p1')).getByRole('list', { name: 'Comments' })).getByText(
        /Cluster is 1\.30\./,
      ),
    ).toBeInTheDocument()
    expect(answerIds()).not.toContain('post-pc')
    expect(screen.getByRole('heading', { level: 2, name: '9 answers' })).toBeInTheDocument()
  })

  it('posts a comment under the question', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<QaTopic {...props} onReply={onReply} />)
    await user.click(within(post('p1')).getByRole('button', { name: 'Add a comment' }))
    await user.type(within(post('p1')).getByRole('textbox'), 'Which cluster version?')
    await user.click(within(post('p1')).getByRole('button', { name: 'Post' }))
    await waitFor(() =>
      expect(onReply).toHaveBeenCalledWith({ body: 'Which cluster version?', parentId: 'p1' }),
    )
    expect(await screen.findByText('Comment posted.')).toBeInTheDocument()
    await waitFor(() =>
      expect(within(post('p1')).getByRole('button', { name: 'Add a comment' })).toHaveFocus(),
    )
  })

  it('gives focus back to "Add a comment" on Cancel', async () => {
    const user = userEvent.setup()
    render(<QaTopic {...props} onReply={vi.fn()} />)
    await user.click(within(post('p4')).getByRole('button', { name: 'Add a comment' }))
    expect(within(post('p4')).getByRole('textbox', { name: 'Comment' })).toHaveFocus()
    await user.click(within(post('p4')).getByRole('button', { name: 'Cancel' }))
    expect(within(post('p4')).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(post('p4')).getByRole('button', { name: 'Add a comment' })).toHaveFocus()
  })

  it('opens one comment composer at a time and posts an answer', async () => {
    const user = userEvent.setup()
    const onReply = vi.fn().mockResolvedValue(undefined)
    render(<QaTopic {...props} onReply={onReply} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Your answer' })).toBeInTheDocument()
    await user.click(within(post('p1')).getByRole('button', { name: 'Add a comment' }))
    await user.click(within(post('p2')).getByRole('button', { name: 'Add a comment' }))
    expect(within(post('p1')).queryByRole('textbox')).not.toBeInTheDocument()
    expect(within(post('p2')).getByRole('textbox')).toBeInTheDocument()
    await user.click(within(post('p2')).getByRole('button', { name: 'Cancel' }))
    await user.type(screen.getByRole('textbox'), 'Use the apiVersion key.')
    await user.click(screen.getByRole('button', { name: 'Post your answer' }))
    await waitFor(() => expect(onReply).toHaveBeenCalledWith({ body: 'Use the apiVersion key.' }))
  })

  it('links hot tags through searchHref and omits them without it', () => {
    const { unmount } = render(<QaTopic {...props} related={testTopics} />)
    const rail = screen.getByRole('complementary', { name: 'About this question' })
    const tags = within(within(rail).getByRole('region', { name: 'Hot tags' }))
    expect(tags.getAllByRole('link').length).toBeGreaterThan(0)
    expect(tags.getByRole('link', { name: 'crd' })).toHaveAttribute('href', '/forum/boards?q=crd')
    unmount()
    render(<QaTopic {...props} searchHref={undefined} />)
    expect(screen.queryByRole('region', { name: 'Hot tags' })).not.toBeInTheDocument()
  })

  it('lists related questions and linked docs, omitting docs when empty', () => {
    const docs = [{ label: 'Schema registry', href: '/docs/schema', description: 'Keys' }]
    const { unmount } = render(<QaTopic {...props} related={testTopics} docs={docs} />)
    expect(screen.getByRole('region', { name: 'Related questions' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Schema registry/ })).toHaveAttribute(
      'href',
      '/docs/schema',
    )
    unmount()
    render(<QaTopic {...props} docs={[]} />)
    expect(screen.queryByRole('region', { name: 'Linked docs' })).not.toBeInTheDocument()
  })

  it('shows an empty state without posts', () => {
    render(<QaTopic {...props} topic={{ ...topic, posts: [] }} />)
    expect(screen.getByRole('heading', { level: 2, name: '0 answers' })).toBeInTheDocument()
    expect(screen.getByText('No answers yet.')).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()
  })
})
