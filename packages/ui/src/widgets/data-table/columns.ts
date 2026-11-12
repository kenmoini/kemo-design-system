import type { ColumnDef, ReactTable } from '@tanstack/react-table'
import type { DataTableFeatures } from './table-features'
import type { DataTableColumn, DataTableFilter } from './types'

/** The table instance `DataTable` builds; `DataTableFilters` and `DataTablePager` read it. */
export type DataTableInstance<T extends { id: string }> = ReactTable<DataTableFeatures, T>

/** The hidden column the global filter searches: the `search.keys` texts of a row, one per line. */
export const SEARCH_COLUMN_ID = '__search'

/** Filters get their own TanStack columns, so a filter and a column may share an id. */
export function filterColumnId(filterId: string): string {
  return `filter:${filterId}`
}

export function countNoun(count: number, entity: { singular: string; plural: string }): string {
  return count === 1 ? entity.singular : entity.plural
}

/** Every chip must be among the row's values. */
const hasEveryTag = (row: { getValue: <V>(id: string) => V }, id: string, chips: string[]) =>
  chips.every((chip) => row.getValue<string[]>(id).includes(chip))

function filterFnFor<T>(filter: DataTableFilter<T>) {
  if (filter.kind === 'checkbox') return 'arrHas' as const
  if (filter.kind === 'select') return 'equalsString' as const
  return hasEveryTag
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
      accessorFn: (row: T) => (filter.accessor as (row: T) => unknown)(row),
      enableSorting: false,
      enableColumnFilter: true,
      enableGlobalFilter: false,
      filterFn: filterFnFor(filter),
    })
  }
  if (searchKeys) {
    defs.push({
      id: SEARCH_COLUMN_ID,
      // A newline cannot be typed into the search box, so a query never spans two keys.
      accessorFn: (row: T) => searchKeys.map((key) => key(row)).join('\n'),
      enableSorting: false,
      enableColumnFilter: false,
      enableGlobalFilter: true,
    })
  }
  return defs
}

/** The active filters (one per checked/selected value set, one per tag chip) plus the search. */
export function activeFilterCount<T extends { id: string }>(table: DataTableInstance<T>): number {
  const columns = table.state.columnFilters.reduce((sum, f) => {
    const isTags = table.getColumn(f.id)?.columnDef.filterFn === hasEveryTag
    return sum + (isTags && Array.isArray(f.value) ? f.value.length : 1)
  }, 0)
  return columns + (table.state.globalFilter ? 1 : 0)
}

/** Clears every filter and the search and returns to the first page; the selection is kept. */
export function clearFilters<T extends { id: string }>(table: DataTableInstance<T>): void {
  table.setColumnFilters([])
  table.setGlobalFilter('')
  table.setPageIndex(0)
}
