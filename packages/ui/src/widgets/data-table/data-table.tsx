'use client'
import {
  type ColumnFiltersState,
  functionalUpdate,
  type RowSelectionState,
  type Updater,
  useTable,
} from '@tanstack/react-table'
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'
import {
  type ReactNode,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import { Box, Grid, Stack, styled } from '../../../styled-system/jsx'
import { Button, Card, Checkbox, Table, Text } from '../../components/ui'
import { MEDIA_LG, useMediaQuery } from '../../layouts/app-shell'
import { ActionMenu } from './action-menu'
import {
  clearFilters,
  countNoun,
  type DataTableInstance,
  filterColumnId,
  SEARCH_COLUMN_ID,
  toColumnDefs,
} from './columns'
import { DataTableFilters } from './data-table-filters'
import { DataTablePager } from './data-table-pager'
import { DataTableFiltersDrawer, DataTableToolbar } from './data-table-toolbar'
import { dataTableFeatures } from './table-features'
import type { DataTableColumn, DataTableFilterValues, DataTableProps } from './types'

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

/** The selection without ids whose rows are gone; the same object when nothing was dropped. */
function pruneSelection(selection: RowSelectionState, rowIds: Set<string>): RowSelectionState {
  const ids = Object.keys(selection)
  const kept = ids.filter((id) => rowIds.has(id))
  return kept.length === ids.length ? selection : toSelection(kept)
}

const isEmptyValue = (value: unknown) =>
  value === undefined || value === '' || (Array.isArray(value) && value.length === 0)

/** A host's filter values as TanStack column filters on the filters' own columns. */
function toColumnFilters(values: DataTableFilterValues): ColumnFiltersState {
  return Object.entries(values)
    .filter(([, value]) => !isEmptyValue(value))
    .map(([id, value]) => ({ id: filterColumnId(id), value }))
}

/** TanStack column filters back as filter values by filter id. */
function toFilterValues(filters: ColumnFiltersState): DataTableFilterValues {
  const values: DataTableFilterValues = {}
  const prefix = filterColumnId('')
  for (const filter of filters) {
    if (!filter.id.startsWith(prefix) || isEmptyValue(filter.value)) continue
    values[filter.id.slice(prefix.length)] = filter.value as string | string[]
  }
  return values
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
  countLabel,
  toolbarStart,
  toolbarEnd,
  pageSize = 10,
  initialSort,
  emptyMessage,
  filterValues,
  onFilterValuesChange,
  linkComponent,
}: DataTableProps<T>) {
  const selectable = selectableProp ?? bulkActions !== undefined
  const isLg = useMediaQuery(MEDIA_LG)
  const hydrated = useHydrated()

  const searchKeys = search?.keys
  const columnDefs = useMemo(
    () => toColumnDefs(columns, filters ?? [], searchKeys),
    [columns, filters, searchKeys],
  )
  // TanStack caches each row's values per column id until `data` changes; a new array whenever the
  // definitions change makes new accessors (labels from a new lookup, say) sort and filter at once.
  const data = useMemo(() => rows.slice(), [rows, columnDefs])
  const rowIds = useMemo(() => new Set(rows.map((row) => row.id)), [rows])

  const controlledSelection = useMemo(
    () => (selectedIds ? toSelection(selectedIds) : undefined),
    [selectedIds],
  )
  const [ownSelection, setOwnSelection] = useState<RowSelectionState>({})
  const rowSelection = controlledSelection ?? ownSelection

  // Host-held filter values: the table reads them as its column filters and reports changes.
  const controlledFilters = useMemo(
    () => (filterValues ? toColumnFilters(filterValues) : undefined),
    [filterValues],
  )
  // A host's change to the values goes back to the first page, as a change in the rail does. By
  // content, so a new record with the same values (an inline object) keeps the page.
  const filterKey = controlledFilters ? JSON.stringify(controlledFilters) : undefined
  const shownFilterKey = useRef(filterKey)
  const filterState = controlledFilters
    ? {
        state: { rowSelection, columnFilters: controlledFilters },
        onColumnFiltersChange: (updater: Updater<ColumnFiltersState>) =>
          onFilterValuesChange?.(toFilterValues(functionalUpdate(updater, controlledFilters))),
      }
    : // Uncontrolled, the table's own column filter state and updater stay in charge.
      { state: { rowSelection } }

  const table = useTable({
    features: dataTableFeatures,
    columns: columnDefs,
    data,
    getRowId: (row) => row.id,
    initialState: {
      sorting: initialSort ? [{ id: initialSort.id, desc: initialSort.desc ?? false }] : [],
      pagination: { pageIndex: 0, pageSize },
    },
    ...filterState,
    onRowSelectionChange: (updater: Updater<RowSelectionState>) => {
      const updated = functionalUpdate(updater, rowSelection)
      // The table's own selection holds only rows that exist; a host's `selectedIds` is its own.
      const next = controlledSelection ? updated : pruneSelection(updated, rowIds)
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

  useEffect(() => {
    // Rows that leave `rows` leave the table's own selection too. Rows hidden by filters or on
    // other pages are still in `rows`, so they stay selected.
    if (controlledSelection) return
    const kept = pruneSelection(ownSelection, rowIds)
    if (kept === ownSelection) return
    setOwnSelection(kept)
    onSelectionChange?.(Object.keys(kept))
  }, [controlledSelection, ownSelection, rowIds, onSelectionChange])

  // Before paint, so the old page of the new filter result never shows.
  useLayoutEffect(() => {
    if (shownFilterKey.current === filterKey) return
    shownFilterKey.current = filterKey
    table.setPageIndex(0)
  }, [filterKey, table])

  const pagination = table.state.pagination
  // Rows can shrink under the current page (the last rows of the last page deleted): render the
  // last page that still has rows in this very render, and move the table there after the commit.
  const pageIndex = Math.min(pagination.pageIndex, Math.max(0, table.getPageCount() - 1))
  useEffect(() => {
    if (pageIndex !== pagination.pageIndex) table.setPageIndex(pageIndex)
  }, [pageIndex, pagination.pageIndex, table])

  const filteredCount = table.getFilteredRowModel().rows.length
  const pageRows =
    pageIndex === pagination.pageIndex
      ? table.getRowModel().rows
      : table
          .getPrePaginatedRowModel()
          .rows.slice(pageIndex * pagination.pageSize, (pageIndex + 1) * pagination.pageSize)
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
  const allPageSelected = pageRows.length > 0 && pageRows.every((row) => row.getIsSelected())
  const somePageSelected = pageRows.some((row) => row.getIsSelected())
  const empty = rows.length === 0 ? 'data' : filteredCount === 0 ? 'filtered' : null

  const main = (
    <Stack gap="3" minW="0">
      <DataTableToolbar
        count={countLabel ? countLabel(filteredCount) : count}
        selected={selectable ? selectedCount : undefined}
        start={toolbarStart}
      >
        {hasFilters && !isLg ? <DataTableFiltersDrawer {...filterProps} /> : null}
        {toolbarEnd}
        {selectable && bulkActions ? (
          <ActionMenu
            trigger="button"
            buttonLabel="Bulk actions"
            linkComponent={linkComponent}
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
        {/* Only the table scrolls sideways, inside the card, when it is wider than the card: the row
            actions at its end stay reachable, and the toolbar, pager and rail stay put. */}
        <Box overflowX="auto">
          <Table.Root minW="full">
            <Table.Head>
              <Table.Row>
                {selectable ? (
                  <Table.Header w="10" pe="0">
                    <Checkbox.Root
                      size="sm"
                      verticalAlign="middle"
                      disabled={pageRows.length === 0}
                      checked={allPageSelected ? true : somePageSelected ? 'indeterminate' : false}
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
                            <ActionMenu
                              label={`Actions for ${label}`}
                              items={actions}
                              linkComponent={linkComponent}
                            />
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
