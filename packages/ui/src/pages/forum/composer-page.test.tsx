import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../test/layout'
import { ForumComposerPage } from './composer-page'
import { chrome, testCategories } from './test-data'
import type { ForumComposerPageProps, ForumVariant } from './types'

const renderComposer = (
  over: Partial<ForumComposerPageProps> = {},
  variant: ForumVariant = 'boards',
) => {
  const onCreateTopic = vi.fn().mockResolvedValue(undefined)
  render(
    <ForumComposerPage
      {...chrome}
      variant={variant}
      categories={testCategories}
      cancelHref="/forum"
      onCreateTopic={onCreateTopic}
      {...over}
    />,
  )
  return { onCreateTopic, user: userEvent.setup() }
}

const goodTitle = '  Schema browser is empty  '
const goodBody = '  The schema panel shows nothing after upgrading.  '

async function pickCategory(user: ReturnType<typeof userEvent.setup>, label: string) {
  await user.click(screen.getByRole('combobox', { name: 'Category' }))
  await user.click(await screen.findByRole('option', { name: label }))
}

describe('ForumComposerPage', () => {
  beforeEach(() => {
    stubLayout()
  })

  it.each([
    ['boards', 'New topic', 'Post topic'],
    ['discussions', 'New discussion', 'Start discussion'],
    ['qa', 'Ask a question', 'Post your question'],
  ] as const)('shows the %s heading and submit label', (variant, heading, submit) => {
    renderComposer({}, variant)
    expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: submit })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: heading })).toBeNull()
  })

  it('labels the title "Question" for qa', () => {
    renderComposer({}, 'qa')
    expect(screen.getByRole('textbox', { name: 'Question' })).toBeInTheDocument()
    expect(screen.getByText('End with a question mark.')).toBeInTheDocument()
  })

  it('refuses a 9-character title and focuses it', async () => {
    const { user, onCreateTopic } = renderComposer()
    await user.type(screen.getByRole('textbox', { name: 'Title' }), '123456789')
    await user.click(screen.getByRole('button', { name: 'Post topic' }))
    expect(await screen.findByText('Use at least 10 characters.')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveFocus()
    expect(onCreateTopic).not.toHaveBeenCalled()
  })

  it('asks for a category', async () => {
    const { user } = renderComposer()
    await user.type(screen.getByRole('textbox', { name: 'Title' }), goodTitle)
    await user.click(screen.getByRole('button', { name: 'Post topic' }))
    expect(await screen.findByText('Choose a category.')).toBeInTheDocument()
  })

  it('lower-cases tags and refuses a sixth', async () => {
    const { user } = renderComposer()
    const input = screen.getByRole('textbox', { name: 'Tags' })
    await user.type(input, 'YAML{Enter}')
    expect(screen.getByRole('button', { name: 'Delete tag yaml' })).toBeInTheDocument()
    for (const tag of ['a', 'b', 'c', 'd']) {
      await user.clear(input)
      await user.type(input, `${tag}{Enter}`)
    }
    await user.clear(input)
    await user.type(input, 'six{Enter}')
    expect(screen.queryByRole('button', { name: 'Delete tag six' })).toBeNull()
    expect(screen.getAllByRole('button', { name: /^Delete tag/ })).toHaveLength(5)
  })

  it('fails a 19-character body', async () => {
    const { user } = renderComposer()
    await user.type(screen.getByRole('textbox', { name: 'Body' }), '1234567890123456789')
    await user.click(screen.getByRole('button', { name: 'Post topic' }))
    expect(await screen.findByText('Write at least 20 characters.')).toBeInTheDocument()
  })

  it('submits trimmed values', async () => {
    const { user, onCreateTopic } = renderComposer()
    await user.type(screen.getByRole('textbox', { name: 'Title' }), goodTitle)
    await pickCategory(user, 'Kemo Console')
    await user.type(screen.getByRole('textbox', { name: 'Tags' }), 'crd{Enter}')
    await user.type(screen.getByRole('textbox', { name: 'Body' }), goodBody)
    await user.click(screen.getByRole('button', { name: 'Post topic' }))
    await waitFor(() =>
      expect(onCreateTopic).toHaveBeenCalledWith({
        title: goodTitle.trim(),
        categoryId: 'kemo-console',
        tags: ['crd'],
        body: goodBody.trim(),
      }),
    )
  })

  it('shows a rejection and keeps the values', async () => {
    const onCreateTopic = vi.fn().mockRejectedValue(new Error('Nope'))
    const { user } = renderComposer({ onCreateTopic, defaultCategoryId: 'kemo-console' })
    await user.type(screen.getByRole('textbox', { name: 'Title' }), goodTitle)
    await user.type(screen.getByRole('textbox', { name: 'Body' }), goodBody)
    await user.click(screen.getByRole('button', { name: 'Post topic' }))
    expect(await screen.findByText('Nope')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Title' })).toHaveValue(goodTitle)
  })

  it('preselects defaultCategoryId', () => {
    renderComposer({ defaultCategoryId: 'kemo-console' })
    expect(screen.getByRole('combobox', { name: 'Category' })).toHaveTextContent('Kemo Console')
  })

  it('links Cancel to cancelHref', () => {
    renderComposer()
    expect(screen.getByRole('link', { name: 'Cancel' })).toHaveAttribute('href', '/forum')
  })
})
