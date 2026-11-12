import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlogCover } from './blog-cover'
import type { BlogPost } from './types'

const post: BlogPost = {
  slug: 'ship-it',
  title: 'Ship it',
  summary: 'Summary',
  topic: { id: 'ops', label: 'Ops' },
  author: { id: 'a', name: 'Ada' },
  publishedAt: '2026-11-11T09:00:00Z',
  readingMinutes: 4,
  body: [],
}

describe('BlogCover', () => {
  it('renders a decorative preset derived from the post', () => {
    const { container, rerender } = render(<BlogCover post={post} h="40" />)
    const first = container.querySelector('[data-preset]')
    expect(first).toHaveAttribute('aria-hidden', 'true')
    const preset = first?.getAttribute('data-preset')
    expect(preset).toMatch(/^[1-6]$/)
    rerender(<BlogCover post={{ ...post, title: 'Other title' }} h="40" />)
    expect(container.querySelector('[data-preset]')).toHaveAttribute('data-preset', preset)
  })

  it('uses an explicit preset', () => {
    const { container } = render(<BlogCover cover={{ preset: 4 }} h="40" />)
    expect(container.querySelector('[data-preset]')).toHaveAttribute('data-preset', '4')
  })

  it('applies a different gradient class per preset', () => {
    const { container, rerender } = render(<BlogCover cover={{ preset: 1 }} h="40" />)
    const one = container.querySelector('[data-preset]')?.className
    rerender(<BlogCover cover={{ preset: 4 }} h="40" />)
    const four = container.querySelector('[data-preset]')?.className
    expect(one).toContain('cover1')
    expect(four).toContain('cover4')
  })

  it('renders an image cover with its alt text', () => {
    render(<BlogCover cover={{ src: '/team.png', alt: 'Team photo' }} h="40" />)
    expect(screen.getByRole('img', { name: 'Team photo' })).toHaveAttribute('src', '/team.png')
  })
})
