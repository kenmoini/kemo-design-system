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

describe('footer year', () => {
  it('reaches the footer from every index and post variation', () => {
    for (const variant of ['editorial-list', 'magazine-grid', 'journal-rail'] as const) {
      const index = render(
        <BlogIndexPage {...chrome} variant={variant} title="Notes" posts={testPosts} year={2031} />,
      )
      expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2031')
      index.unmount()
      const post = render(
        <BlogPostPage
          {...chrome}
          variant={variant}
          posts={testPosts}
          post={testPosts[0]!}
          year={2031}
        />,
      )
      expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2031')
      post.unmount()
    }
  })
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
