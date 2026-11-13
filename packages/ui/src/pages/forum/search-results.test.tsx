import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SearchResults } from './search-results'

describe('SearchResults', () => {
  it('keeps one live region mounted across query changes', () => {
    const props = { noun: 'topics' as const, onClear: vi.fn() }
    const { rerender } = render(
      <SearchResults {...props} query="crd" count={3}>
        <ul />
      </SearchResults>,
    )
    const status = screen.getByRole('status')
    expect(status).toHaveTextContent('3 results')
    rerender(
      <SearchResults {...props} query="oidc" count={0}>
        <ul />
      </SearchResults>,
    )
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent('No results')
    rerender(
      <SearchResults {...props} query="crd" count={1}>
        <ul />
      </SearchResults>,
    )
    expect(screen.getByRole('status')).toBe(status)
    expect(status).toHaveTextContent('1 result')
  })
})
