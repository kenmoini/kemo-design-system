'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { HStack, styled } from '../../../styled-system/jsx'
import { Button, IconButton, Pagination, Text } from '../../components/ui'
import type { DataTableInstance } from './columns'

export interface DataTablePagerProps<T extends { id: string }> {
  table: DataTableInstance<T>
  /** The rows across all pages: the filtered count. */
  total: number
}

/** "{from}–{to} of {total}" and, when there is more than one page, Park's `Pagination`. */
export function DataTablePager<T extends { id: string }>({ table, total }: DataTablePagerProps<T>) {
  const { pageIndex, pageSize } = table.state.pagination
  const from = total === 0 ? 0 : pageIndex * pageSize + 1
  const to = Math.min(total, pageIndex * pageSize + pageSize)

  return (
    <HStack justify="space-between" gap="3" flexWrap="wrap" minH="8">
      <Text textStyle="sm" color="fg.muted" fontVariantNumeric="tabular-nums">
        {`${from}–${to} of ${total}`}
      </Text>
      {table.getPageCount() > 1 ? (
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
      ) : null}
    </HStack>
  )
}
