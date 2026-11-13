'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Box, HStack, styled } from '../../../styled-system/jsx'
import { Button, IconButton, Pagination, Text } from '../../components/ui'
import type { DataTableInstance } from './columns'

export interface DataTablePagerProps<T extends { id: string }> {
  table: DataTableInstance<T>
  /** The rows across all pages: the filtered count. */
  total: number
}

/** "{from}–{to} of {total}" and Park's `Pagination`. */
export function DataTablePager<T extends { id: string }>({ table, total }: DataTablePagerProps<T>) {
  const { pageSize } = table.state.pagination
  // Rows can shrink under the current page before the table moves back: show the last real page.
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const pageIndex = Math.min(table.state.pagination.pageIndex, pageCount - 1)
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(total, pageIndex * pageSize + pageSize)
  // One page: the toolbar's count already says how many rows there are. An empty row of the pager's
  // height keeps the card from changing height when the rows grow to a second page.
  if (pageCount <= 1) return <Box aria-hidden="true" minH="8" data-pager-placeholder="" />

  return (
    <HStack justify="space-between" gap="3" flexWrap="wrap" minH="8">
      <Text textStyle="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
        {`${from}–${to} of ${total}`}
      </Text>
      <Pagination.Root
        count={total}
        pageSize={pageSize}
        page={pageIndex + 1}
        siblingCount={1}
        onPageChange={(details) => table.setPageIndex(details.page - 1)}
        display="flex"
        alignItems="center"
        gap="1"
      >
        <Pagination.PrevTrigger asChild>
          <IconButton variant="plain" size="xs" aria-label="Previous page">
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
            <Button variant={item.selected ? 'outline' : 'plain'} size="xs">
              {item.value}
            </Button>
          )}
        />
        <Pagination.NextTrigger asChild>
          <IconButton variant="plain" size="xs" aria-label="Next page">
            <ChevronRight />
          </IconButton>
        </Pagination.NextTrigger>
      </Pagination.Root>
    </HStack>
  )
}
