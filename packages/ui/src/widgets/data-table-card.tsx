'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { Box, styled } from '../../styled-system/jsx'
import { Button, Card, IconButton, Pagination, Table, Tabs, Text } from '../components/ui'
import type { Column } from './types'

export interface DataTableCardProps<T extends { id: string }> {
  title: string
  caption?: string
  tabs?: { id: string; label: string }[]
  /** The selected tab id; omit it to let the tabs hold their own state (first tab selected). */
  activeTab?: string
  onTabChange?: (id: string) => void
  columns: Column<T>[]
  rows: T[]
  /** `index` is 1-based; `size` rows per page; `total` rows across all pages. */
  page: { index: number; size: number; total: number }
  onPageChange?: (index: number) => void
}

function cellContent<T extends { id: string }>(column: Column<T>, row: T): ReactNode {
  return column.cell ? column.cell(row) : String(row[column.id as keyof T] ?? '')
}

function DataTable<T extends { id: string }>({
  columns,
  rows,
}: Pick<DataTableCardProps<T>, 'columns' | 'rows'>) {
  return (
    <Box overflowX="auto">
      <Table.Root>
        <Table.Head>
          <Table.Row>
            {columns.map((column) => (
              <Table.Header key={column.id} textAlign={column.align === 'end' ? 'end' : 'start'}>
                {column.header}
              </Table.Header>
            ))}
          </Table.Row>
        </Table.Head>
        <Table.Body>
          {rows.length === 0 ? (
            <Table.Row>
              <Table.Cell colSpan={columns.length} textAlign="center" color="fg.subtle">
                No rows
              </Table.Cell>
            </Table.Row>
          ) : (
            rows.map((row) => (
              <Table.Row key={row.id}>
                {columns.map((column) => (
                  <Table.Cell key={column.id} textAlign={column.align === 'end' ? 'end' : 'start'}>
                    {cellContent(column, row)}
                  </Table.Cell>
                ))}
              </Table.Row>
            ))
          )}
        </Table.Body>
      </Table.Root>
    </Box>
  )
}

/**
 * A card around a Park table: optional tabs that filter it (the host owns the filtering), the rows
 * of the current page and a pager. Column cells render through `cell` or fall back to the row field.
 */
export function DataTableCard<T extends { id: string }>({
  title,
  caption,
  tabs,
  activeTab,
  onTabChange,
  columns,
  rows,
  page,
  onPageChange,
}: DataTableCardProps<T>) {
  const table = <DataTable columns={columns} rows={rows} />
  return (
    <Card.Root variant="outline">
      <Card.Header>
        <Card.Title>{title}</Card.Title>
        {caption ? (
          <Text color="fg.muted" textStyle="sm">
            {caption}
          </Text>
        ) : null}
      </Card.Header>
      <Card.Body>
        {tabs && tabs.length > 0 ? (
          <Tabs.Root
            size="sm"
            value={activeTab}
            defaultValue={tabs[0]?.id}
            onValueChange={(details) => onTabChange?.(details.value)}
          >
            <Tabs.List>
              {tabs.map((tab) => (
                <Tabs.Trigger key={tab.id} value={tab.id}>
                  {tab.label}
                </Tabs.Trigger>
              ))}
              <Tabs.Indicator />
            </Tabs.List>
            {/* One table serves every tab: it is always the selected tab's panel. */}
            <Tabs.Context>
              {(api) => <Tabs.Content value={api.value ?? ''}>{table}</Tabs.Content>}
            </Tabs.Context>
          </Tabs.Root>
        ) : (
          table
        )}
      </Card.Body>
      <Card.Footer justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <Text textStyle="xs" color="fg.muted">
          {`Showing ${rows.length} of ${page.total}`}
        </Text>
        <Pagination.Root
          count={page.total}
          pageSize={page.size}
          page={page.index}
          siblingCount={1}
          onPageChange={(details) => onPageChange?.(details.page)}
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
      </Card.Footer>
    </Card.Root>
  )
}
