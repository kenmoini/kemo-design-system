import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useQuery } from './use-query'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('useQuery uncontrolled', () => {
  it('commits the typed input after 300 ms', () => {
    const { result } = renderHook(() => useQuery({}))
    act(() => result.current.setInput('cr'))
    expect(result.current.input).toBe('cr')
    expect(result.current.query).toBe('')
    act(() => void vi.advanceTimersByTime(299))
    expect(result.current.query).toBe('')
    act(() => void vi.advanceTimersByTime(1))
    expect(result.current.query).toBe('cr')
  })

  it('restarts the delay on every keystroke', () => {
    const { result } = renderHook(() => useQuery({}))
    act(() => result.current.setInput('c'))
    act(() => void vi.advanceTimersByTime(200))
    act(() => result.current.setInput('cr'))
    act(() => void vi.advanceTimersByTime(200))
    expect(result.current.query).toBe('')
    act(() => void vi.advanceTimersByTime(100))
    expect(result.current.query).toBe('cr')
  })

  it('commit is immediate and cancels the pending commit', () => {
    const onQueryChange = vi.fn()
    const { result } = renderHook(() => useQuery({ onQueryChange }))
    act(() => result.current.setInput('cr'))
    act(() => result.current.commit())
    expect(result.current.query).toBe('cr')
    expect(onQueryChange).toHaveBeenCalledTimes(1)
    act(() => void vi.advanceTimersByTime(500))
    expect(onQueryChange).toHaveBeenCalledTimes(1)
  })

  it('commits whitespace as an empty query', () => {
    const { result } = renderHook(() => useQuery({ defaultQuery: 'x' }))
    expect(result.current.query).toBe('x')
    act(() => result.current.setInput('   '))
    act(() => result.current.commit())
    expect(result.current.query).toBe('')
  })

  it('clear empties both and notifies', () => {
    const onQueryChange = vi.fn()
    const { result } = renderHook(() => useQuery({ defaultQuery: 'x', onQueryChange }))
    act(() => result.current.clear())
    expect(result.current.input).toBe('')
    expect(result.current.query).toBe('')
    expect(onQueryChange).toHaveBeenCalledWith('')
  })

  it('does not commit after unmount', () => {
    const onQueryChange = vi.fn()
    const { result, unmount } = renderHook(() => useQuery({ onQueryChange }))
    act(() => result.current.setInput('cr'))
    unmount()
    act(() => void vi.advanceTimersByTime(500))
    expect(onQueryChange).not.toHaveBeenCalled()
  })
})

describe('useQuery controlled', () => {
  it('follows the prop and notifies, without holding its own query', () => {
    const onQueryChange = vi.fn()
    const { result, rerender } = renderHook(
      (p: { query: string }) => useQuery({ query: p.query, onQueryChange }),
      { initialProps: { query: 'a' } },
    )
    expect(result.current.query).toBe('a')
    act(() => result.current.setInput('ab'))
    act(() => void vi.advanceTimersByTime(300))
    expect(onQueryChange).toHaveBeenCalledWith('ab')
    expect(result.current.query).toBe('a')
    rerender({ query: 'ab' })
    expect(result.current.query).toBe('ab')
    expect(result.current.input).toBe('ab')
    rerender({ query: 'zz' })
    expect(result.current.input).toBe('zz')
  })
})
