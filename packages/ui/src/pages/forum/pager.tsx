'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useState } from 'react'
import { styled } from '../../../styled-system/jsx'
import { IconButton, Pagination } from '../../components/ui'

/** Page state for a list; goes back to page one when `resetKey` changes. */
export function usePager(total: number, pageSize: number, resetKey: unknown) {
  const [state, setState] = useState({ key: resetKey, page: 1 })
  // Reset during render (not in an effect) so a changed key never paints a stale page.
  const current = Object.is(state.key, resetKey) ? state : { key: resetKey, page: 1 }
  if (current !== state) setState(current)

  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const page = Math.min(Math.max(current.page, 1), pageCount)
  const setPage = useCallback((p: number) => setState({ key: resetKey, page: p }), [resetKey])
  const range =
    total === 0
      ? { from: 0, to: 0 }
      : { from: (page - 1) * pageSize + 1, to: Math.min(page * pageSize, total) }

  return { page, setPage, pageCount, range }
}

export interface PagerProps {
  page: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  label: string
}

export function Pager({ page, pageSize, total, onPageChange, label }: PagerProps) {
  if (total <= pageSize) return null
  return (
    <Pagination.Root
      aria-label={label}
      count={total}
      pageSize={pageSize}
      page={page}
      siblingCount={1}
      onPageChange={(details) => onPageChange(details.page)}
      display="flex"
      alignItems="center"
      justifyContent="center"
      gap="1"
    >
      <Pagination.PrevTrigger asChild>
        <IconButton variant="plain" size="sm" aria-label="Previous page">
          <ChevronLeft />
        </IconButton>
      </Pagination.PrevTrigger>
      <Pagination.Items
        ellipsis={
          <styled.span px="1" color="fg.subtle" textStyle="sm">
            …
          </styled.span>
        }
        render={(item) => (
          <IconButton
            variant={item.selected ? 'solid' : 'plain'}
            size="sm"
            aria-current={item.selected ? 'page' : undefined}
          >
            {item.value}
          </IconButton>
        )}
      />
      <Pagination.NextTrigger asChild>
        <IconButton variant="plain" size="sm" aria-label="Next page">
          <ChevronRight />
        </IconButton>
      </Pagination.NextTrigger>
    </Pagination.Root>
  )
}
