import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Crumbs } from './crumbs'

describe('Crumbs', () => {
  it('links the earlier items and marks the last as the current page', () => {
    render(
      <Crumbs
        items={[
          { label: 'Community', href: '/c' },
          { label: 'Console', href: '/c/console' },
          { label: 'Topic', href: '/t' },
        ]}
      />,
    )
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Community' })).toHaveAttribute('href', '/c')
    expect(screen.queryByRole('link', { name: 'Topic' })).not.toBeInTheDocument()
    expect(screen.getByText('Topic')).toHaveAttribute('aria-current', 'page')
  })

  it('with currentIsLast false links every item and marks none current', () => {
    render(
      <Crumbs
        currentIsLast={false}
        items={[
          { label: 'Discussions', href: '/d' },
          { label: 'Console', href: '/d/console' },
        ]}
      />,
    )
    expect(screen.getByRole('link', { name: 'Console' })).toHaveAttribute('href', '/d/console')
    expect(document.querySelector('[aria-current]')).toBeNull()
  })
})
