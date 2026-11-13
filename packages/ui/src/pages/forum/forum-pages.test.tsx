import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ForumComposerPage } from './composer-page'
import { ForumCategoryPage } from './forum-category-page'
import { ForumIndexPage } from './forum-index-page'
import { ForumTopicPage } from './forum-topic-page'
import { chrome, sampleThread, testCategories, testTopics } from './test-data'
import type { ForumVariant } from './types'

const variants = ['boards', 'discussions', 'qa'] as const
const consoleCategory = testCategories.find((c) => c.id === 'kemo-console')!

const pages: [string, (variant: ForumVariant, year?: number) => React.ReactElement][] = [
  [
    'ForumIndexPage',
    (variant, year) => (
      <ForumIndexPage
        {...chrome}
        variant={variant}
        year={year}
        title="Kemo Community"
        categories={testCategories}
        topics={testTopics}
      />
    ),
  ],
  [
    'ForumCategoryPage',
    (variant, year) => (
      <ForumCategoryPage
        {...chrome}
        variant={variant}
        year={year}
        category={consoleCategory}
        categories={testCategories}
        topics={testTopics}
      />
    ),
  ],
  [
    'ForumTopicPage',
    (variant, year) => (
      <ForumTopicPage
        {...chrome}
        variant={variant}
        year={year}
        topic={sampleThread}
        category={consoleCategory}
      />
    ),
  ],
  [
    'ForumComposerPage',
    (variant, year) => (
      <ForumComposerPage
        {...chrome}
        variant={variant}
        year={year}
        categories={testCategories}
        cancelHref="/forum"
        onCreateTopic={vi.fn()}
      />
    ),
  ],
]

describe.each(pages)('%s', (_name, build) => {
  it.each(variants)('renders the %s variation with one h1', (variant) => {
    render(build(variant))
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })

  it.each(variants)('passes year to the %s footer', (variant) => {
    render(build(variant, 2031))
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2031 Kemo')
  })
})
