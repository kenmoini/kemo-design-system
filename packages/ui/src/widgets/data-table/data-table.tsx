'use client'
import {
  functionalUpdate,
  type RowSelectionState,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { Box, Grid, Stack, styled } from '../../../styled-system/jsx'
import { Button, Card, Checkbox, Table, Text } from '../../components/ui'
import { MEDIA_LG, useMediaQuery } from '../../layouts/app-shell'
import { ActionMenu } from './action-menu'
import {
  clearFilters,
  countNoun,
  type DataTableInstance,
  SEARCH_COLUMN_ID,
  toColumnDefs,
} from './columns'
import { DataTableFilters } from './data-table-filters'
import { DataTablePager } from './data-table-pager'
import { DataTableFiltersDrawer, DataTableToolbar } from './data-table-toolbar'
import { dataTableFeatures } from './table-features'
import type { DataTableColumn, DataTableProps } from './types'

const SortButton = styled('button', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1',
    mx: '-1',
    px: '1',
    borderRadius: 'l1',
    cursor: 'pointer',
    focusVisibleRing: 'outside',
    _hover: { color: 'fg.default' },
    _icon: { boxSize: '3.5', flexShrink: '0' },
  },
})

const subscribeToNothing = () => () => {}

/** `false` on the server and while hydrating, `true` once the client has taken over. */
function useHydrated(): boolean {
  return useSyncExternalStore(
    subscribeToNothing,
    () => true,
    () => false,
  )
}

function defaultRowLabel<T extends { id: string }>(row: T): string {
  return String((row as { name?: string }).name ?? row.id)
}

function toSelection(ids: string[]): RowSelectionState {
  const selection: RowSelectionState = {}
  for (const id of ids) selection[id] = true
  return selection
}

function cellContent<T>(column: DataTableColumn<T>, row: T): ReactNode {
  if (column.cell) return column.cell(row)
  const value = column.accessor?.(row)
  return value == null ? '' : String(value)
}

function ColumnHeader<T extends { id: string }>({
  table,
  column,
}: {
  table: DataTableInstance<T>
  column: DataTableColumn<T>
}) {
  const tableColumn = table.getColumn(column.id)
  const sorted = tableColumn?.getIsSorted() ?? false
  const end = column.align === 'end'
  return (
    <Table.Header
      textAlign={end ? 'end' : 'start'}
      aria-sort={sorted === 'asc' ? 'ascending' : sorted === 'desc' ? 'descending' : undefined}
      style={column.width ? { width: column.width } : undefined}
    >
      {tableColumn?.getCanSort() ? (
        <SortButton
          type="button"
          color={sorted ? 'fg.default' : undefined}
          flexDirection={end ? 'row-reverse' : 'row'}
          onClick={() => {
            tableColumn.toggleSorting(tableColumn.getNextSortingOrder() === 'desc')
            table.setPageIndex(0)
          }}
        >
          {column.header}
          {sorted === 'asc' ? (
            <ArrowUp />
          ) : sorted === 'desc' ? (
            <ArrowDown />
          ) : (
            <styled.span display="inline-flex" color="fg.subtle">
              <ArrowUpDown />
            </styled.span>
          )}
        </SortButton>
      ) : (
        column.header
      )}
    </Table.Header>
  )
}

/**
 * A data table on Park's `Table`, with TanStack Table v9 holding its state: sortable headers, a
 * search box and faceted filters (a rail on `lg`, a drawer below it), row selection with a bulk
 * actions menu, per-row action menus and pagination. Selection is kept by id across filters and pages.
 * Pass stable `columns`, `filters` and `rows` arrays (module constants or memoised).
 */
export function DataTable<T extends { id: string }>({
  entity,
  columns,
  rows,
  filters,
  search,
  selectable: selectableProp,
  selectedIds,
  onSelectionChange,
  rowActions,
  rowLabel = defaultRowLabel,
  bulkActions,
  addAction,
  toolbarStart,
  toolbarEnd,
  pageSize = 10,
  initialSort,
  emptyMessage,
}: DataTableProps<T>) {
  const selectable = selectableProp ?? bulkActions !== undefined
  const isLg = useMediaQuery(MEDIA_LG)
  const hydrated = useHydrated()

  const searchKeys = search?.keys
  const columnDefs = useMemo(
    () => toColumnDefs(columns, filters ?? [], searchKeys),
    [columns, filters, searchKeys],
  )

  const controlledSelection = useMemo(
    () => (selectedIds ? toSelection(selectedIds) : undefined),
    [selectedIds],
  )
  const [ownSelection, setOwnSelection] = useState<RowSelectionState>({})
  const rowSelection = controlledSelection ?? ownSelection

  const table = useTable({
    features: dataTableFeatures,
    columns: columnDefs,
    data: rows,
    getRowId: (row) => row.id,
    initialState: {
      sorting: initialSort ? [{ id: initialSort.id, desc: initialSort.desc ?? false }] : [],
      pagination: { pageIndex: 0, pageSize },
    },
    state: { rowSelection },
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
      const next = functionalUpdate(updater, rowSelection)
      if (!controlledSelection) setOwnSelection(next)
      onSelectionChange?.(Object.keys(next))
    },
    enableRowSelection: selectable,
    enableMultiSort: false,
    enableSortingRemoval: false,
    // Filters, search and sorting go back to the first page themselves; a change to `rows` (a row
    // edited or disabled) keeps the page.
    autoResetPageIndex: false,
    globalFilterFn: 'includesString',
    getColumnCanGlobalFilter: (column) => column.id === SEARCH_COLUMN_ID,
  })

  const { pageIndex } = table.state.pagination
  const pageCount = table.getPageCount()
  useEffect(() => {
    // Rows removed from under the current page: show the last page that still has rows.
    if (pageIndex > 0 && pageIndex >= pageCount) table.setPageIndex(Math.max(0, pageCount - 1))
  }, [pageIndex, pageCount, table])

  const filteredCount = table.getFilteredRowModel().rows.length
  const pageRows = table.getRowModel().rows
  // Every selected row, including those hidden by filters or on other pages.
  const selectedRows = selectable ? table.getSelectedRowModel().rows.map((row) => row.original) : []
  const selectedCount = selectedRows.length
  const count = `${filteredCount} ${countNoun(filteredCount, entity)}`

  const sort = table.state.sorting[0]
  const sortedHeader = sort ? columns.find((column) => column.id === sort.id)?.header : undefined
  const announcement = [
    count,
    selectable ? `${selectedCount} selected` : null,
    sort && sortedHeader
      ? `sorted by ${sortedHeader} ${sort.desc ? 'descending' : 'ascending'}`
      : null,
  ]
    .filter(Boolean)
    .join(', ')

  const hasFilters = (filters?.length ?? 0) > 0 || search !== undefined
  const filterProps = {
    table,
    filters: filters ?? [],
    search: search ? { placeholder: search.placeholder ?? `Search ${entity.plural}` } : undefined,
  }
  // The rail is CSS-hidden below `lg`, so the server render is right at every width; after
  // hydration it leaves the DOM below `lg`, where the toolbar's "Filters" drawer takes over.
  const showRail = hasFilters && (isLg || !hydrated)

  const addLabel = `+ ${addAction?.label ?? `Add ${entity.singular}`}`
  const columnCount = columns.length + (selectable ? 1 : 0) + (rowActions ? 1 : 0)
  const allPageSelected = table.getIsAllPageRowsSelected()
  const empty = rows.length === 0 ? 'data' : filteredCount === 0 ? 'filtered' : null

  const main = (
    <Stack gap="3" minW="0">
      <DataTableToolbar
        count={count}
        selected={selectable ? selectedCount : undefined}
        start={toolbarStart}
      >
        {hasFilters && !isLg ? <DataTableFiltersDrawer {...filterProps} /> : null}
        {toolbarEnd}
        {selectable && bulkActions ? (
          <ActionMenu
            trigger="button"
            buttonLabel="Bulk actions"
            disabled={selectedCount === 0}
            groupLabel={`${selectedCount} ${countNoun(selectedCount, entity)}`}
            items={selectedCount > 0 ? bulkActions(selectedRows) : []}
            footerItems={[
              {
                id: 'clear-selection',
                label: 'Clear selection',
                onSelect: () => table.setRowSelection({}),
              },
            ]}
          />
        ) : null}
        {addAction ? (
          <Button variant="solid" size="sm" onClick={addAction.onSelect}>
            {addLabel}
          </Button>
        ) : null}
      </DataTableToolbar>
      <Box srOnly aria-live="polite">
        {announcement}
      </Box>
      <Card.Root variant="outline">
        <Box overflowX="auto">
          <Table.Root>
            <Table.Head>
              <Table.Row>
                {selectable ? (
                  <Table.Header w="10" pe="0">
                    <Checkbox.Root
                      size="sm"
                      verticalAlign="middle"
                      disabled={pageRows.length === 0}
                      checked={
                        allPageSelected
                          ? true
                          : table.getIsSomePageRowsSelected()
                            ? 'indeterminate'
                            : false
                      }
                      onCheckedChange={() => table.toggleAllPageRowsSelected(!allPageSelected)}
                    >
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                      <Checkbox.Label srOnly>Select all on this page</Checkbox.Label>
                      <Checkbox.HiddenInput />
                    </Checkbox.Root>
                  </Table.Header>
                ) : null}
                {columns.map((column) => (
                  <ColumnHeader key={column.id} table={table} column={column} />
                ))}
                {rowActions ? (
                  <Table.Header w="12">
                    <styled.span srOnly>Actions</styled.span>
                  </Table.Header>
                ) : null}
              </Table.Row>
            </Table.Head>
            <Table.Body>
              {empty ? (
                <Table.Row>
                  <Table.Cell colSpan={columnCount} py="10" whiteSpace="normal">
                    <Stack align="center" gap="3" textAlign="center">
                      <Text textStyle="sm" color="fg.muted">
                        {empty === 'filtered'
                          ? `No ${entity.plural} match these filters`
                          : (emptyMessage ?? `No ${entity.plural} yet`)}
                      </Text>
                      {empty === 'filtered' ? (
                        <Button variant="plain" size="sm" onClick={() => clearFilters(table)}>
                          Clear filters
                        </Button>
                      ) : addAction ? (
                        <Button variant="solid" size="sm" onClick={addAction.onSelect}>
                          {addLabel}
                        </Button>
                      ) : null}
                    </Stack>
                  </Table.Cell>
                </Table.Row>
              ) : (
                pageRows.map((row) => {
                  const selected = row.getIsSelected()
                  const label = rowLabel(row.original)
                  const actions = rowActions?.(row.original) ?? []
                  return (
                    <Table.Row
                      key={row.id}
                      data-selected={selected ? '' : undefined}
                      _selected={{ bg: 'gray.subtle.bg' }}
                    >
                      {selectable ? (
                        <Table.Cell w="10" pe="0">
                          <Checkbox.Root
                            size="sm"
                            verticalAlign="middle"
                            checked={selected}
                            onCheckedChange={(details) =>
                              row.toggleSelected(details.checked === true)
                            }
                          >
                            <Checkbox.Control>
                              <Checkbox.Indicator />
                            </Checkbox.Control>
                            <Checkbox.Label srOnly>{`Select ${label}`}</Checkbox.Label>
                            <Checkbox.HiddenInput />
                          </Checkbox.Root>
                        </Table.Cell>
                      ) : null}
                      {columns.map((column) => (
                        <Table.Cell
                          key={column.id}
                          textAlign={column.align === 'end' ? 'end' : 'start'}
                        >
                          {cellContent(column, row.original)}
                        </Table.Cell>
                      ))}
                      {rowActions ? (
                        <Table.Cell textAlign="end" py="1.5">
                          {actions.length > 0 ? (
                            <ActionMenu label={`Actions for ${label}`} items={actions} />
                          ) : null}
                        </Table.Cell>
                      ) : null}
                    </Table.Row>
                  )
                })
              )}
            </Table.Body>
          </Table.Root>
        </Box>
        <Box px="3" py="2" borderTopWidth="1px">
          <DataTablePager table={table} total={filteredCount} />
        </Box>
      </Card.Root>
    </Stack>
  )

  if (!hasFilters) return main
  return (
    <Grid
      gridTemplateColumns={{ base: '1fr', lg: '12rem minmax(0, 1fr)' }}
      gap="6"
      alignItems="start"
    >
      {showRail ? (
        <styled.aside aria-label="Filters" display={{ base: 'none', lg: 'block' }}>
          <DataTableFilters {...filterProps} />
        </styled.aside>
      ) : null}
      {main}
    </Grid>
  )
}
