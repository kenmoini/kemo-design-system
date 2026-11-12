import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as ui from '../../index'
import { BlogIndexPage } from './blog-index-page'
import { BlogPostPage } from './blog-post-page'
import { chrome, testPosts } from './test-posts'

describe('BlogIndexPage', () => {
  it.each([
    ['editorial-list', 'Featured'],
    ['magazine-grid', 'All posts'],
    ['journal-rail', 'Load older posts'],
  ] as const)('renders the %s variation', (variant, marker) => {
    render(<BlogIndexPage {...chrome} variant={variant} title="Notes" posts={testPosts} />)
    expect(screen.getAllByText(marker).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('BlogPostPage', () => {
  it.each(['editorial-list', 'magazine-grid', 'journal-rail'] as const)(
    'renders the %s variation with one h1 and one article body',
    (variant) => {
      render(<BlogPostPage {...chrome} variant={variant} posts={testPosts} post={testPosts[0]!} />)
      expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(testPosts[0]!.title)
      expect(screen.getByText('Where the time went', { selector: 'h2' })).toBeInTheDocument()
    },
  )
})

describe('package index', () => {
  it('exports the public API', () => {
    for (const name of [
      'BlogIndexPage',
      'BlogPostPage',
      'BlogLayout',
      'BlogProse',
      'BlogCover',
      'BlogComments',
      'SubscribeForm',
    ] as const) {
      expect(typeof ui[name]).toBe('function')
    }
    expect(Object.keys(ui.blogVariants)).toHaveLength(3)
  })
})
