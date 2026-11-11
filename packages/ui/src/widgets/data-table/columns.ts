import type { ColumnDef, ReactTable } from '@tanstack/react-table'
import type { DataTableFeatures } from './table-features'
import type { DataTableColumn, DataTableFilter } from './types'

/** The table instance `DataTable` builds; `DataTableFilters` and `DataTablePager` read it. */
export type DataTableInstance<T extends { id: string }> = ReactTable<DataTableFeatures, T>

/** The hidden column the global filter searches: the `search.keys` text of a row, joined. */
export const SEARCH_COLUMN_ID = '__search'

/** Filters get their own TanStack columns, so a filter and a column may share an id. */
export function filterColumnId(filterId: string): string {
  return `filter:${filterId}`
}

export function countNoun(count: number, entity: { singular: string; plural: string }): string {
  return count === 1 ? entity.singular : entity.plural
}

/**
 * Our columns, filters and search as TanStack column definitions. Display columns sort through
 * their `accessor`; filter columns use `arrHas` (checkbox: the row's value is one of the checked
 * values) or `equalsString` (select); only the search column takes part in the global filter.
 */
export function toColumnDefs<T extends { id: string }>(
  columns: DataTableColumn<T>[],
  filters: DataTableFilter<T>[],
  searchKeys: ((row: T) => string)[] | undefined,
): ColumnDef<DataTableFeatures, T>[] {
  const defs: ColumnDef<DataTableFeatures, T>[] = columns.map((column) => {
    const { accessor } = column
    const base = {
      id: column.id,
      header: column.header,
      enableColumnFilter: false,
      enableGlobalFilter: false,
    }
    return accessor
      ? {
          ...base,
          accessorFn: (row: T) => accessor(row),
          enableSorting: column.sortable ?? true,
          sortUndefined: 'last' as const,
        }
      : { ...base, enableSorting: false }
  })
  for (const filter of filters) {
    defs.push({
      id: filterColumnId(filter.id),
      header: filter.label,
      accessorFn: (row: T) => filter.accessor(row),
      enableSorting: false,
      enableColumnFilter: true,
      enableGlobalFilter: false,
      filterFn: filter.kind === 'checkbox' ? 'arrHas' : 'equalsString',
    })
  }
  if (searchKeys) {
    defs.push({
      id: SEARCH_COLUMN_ID,
      accessorFn: (row: T) => searchKeys.map((key) => key(row)).join(' '),
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: true,
    })
  }
  return defs
}

/** The active column filters plus the search, when it has text. */
export function activeFilterCount<T extends { id: string }>(table: DataTableInstance<T>): number {
  return table.state.columnFilters.length + (table.state.globalFilter ? 1 : 0)
}

/** Clears every filter and the search and returns to the first page; the selection is kept. */
export function clearFilters<T extends { id: string }>(table: DataTableInstance<T>): void {
  table.setColumnFilters([])
  table.setGlobalFilter('')
  table.setPageIndex(0)
}
