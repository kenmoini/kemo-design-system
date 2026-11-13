import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PostBody } from './post-body'

describe('PostBody', () => {
  it('renders markup in a paragraph as text, never as an element', () => {
    const { container } = render(
      <PostBody blocks={[{ type: 'paragraph', content: '<img src=x onerror=alert(1)>' }]} />,
    )
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })
})
