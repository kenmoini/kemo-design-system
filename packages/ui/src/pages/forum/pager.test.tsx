import { act, render, renderHook, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Pager, usePager } from './pager'

describe('usePager', () => {
  it('computes the range and clamps the page', () => {
    const { result } = renderHook(() => usePager(25, 10, 'a'))
    expect(result.current.pageCount).toBe(3)
    expect(result.current.range).toEqual({ from: 1, to: 10 })
    act(() => result.current.setPage(9))
    expect(result.current.page).toBe(3)
    expect(result.current.range).toEqual({ from: 21, to: 25 })
  })

  it('has an empty range for no items', () => {
    const { result } = renderHook(() => usePager(0, 10, 'a'))
    expect(result.current.pageCount).toBe(1)
    expect(result.current.range).toEqual({ from: 0, to: 0 })
  })

  it('resets to page one when the key changes', () => {
    const { result, rerender } = renderHook(({ key }) => usePager(25, 10, key), {
      initialProps: { key: 'a' },
    })
    act(() => result.current.setPage(2))
    expect(result.current.page).toBe(2)
    rerender({ key: 'b' })
    expect(result.current.page).toBe(1)
  })
})

describe('Pager', () => {
  it('renders nothing when everything fits on one page', () => {
    const { container } = render(
      <Pager page={1} pageSize={10} total={10} onPageChange={() => {}} label="Topics" />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders a labelled nav and reports a chosen page', async () => {
    const onPageChange = vi.fn()
    render(<Pager page={1} pageSize={10} total={11} onPageChange={onPageChange} label="Topics" />)
    expect(screen.getByRole('navigation', { name: 'Topics' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'page 1' })).toHaveAttribute('aria-current', 'page')
    await userEvent.click(screen.getByRole('button', { name: 'last page, page 2' }))
    expect(onPageChange).toHaveBeenCalledWith(2)
  })
})
