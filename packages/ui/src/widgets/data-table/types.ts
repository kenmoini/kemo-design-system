import type { ReactNode } from 'react'

/** A value and its label: a filter option, a `Select` item, a reference to another entity. */
export type Option = { value: string; label: string }

export interface DataTableColumn<T> {
  id: string
  header: string
  /** The value sorting uses, and the cell's text when there is no `cell`. */
  accessor?: (row: T) => string | number | boolean | null | undefined
  cell?: (row: T) => ReactNode
  /** Defaults to `true` when the column has an `accessor`. */
  sortable?: boolean
  align?: 'start' | 'end'
  /** A CSS width for the column, e.g. `'12rem'`. */
  width?: string
}

export interface DataTableFilter<T> {
  id: string
  label: string
  /** `checkbox`: one checkbox per value with its count; `select`: one value or all. */
  kind: 'checkbox' | 'select'
  accessor: (row: T) => string
  /** The values and their labels; omitted, the values found in the rows are listed as they are. */
  options?: Option[]
  /** The select's "no filter" item; defaults to "All". */
  allLabel?: string
}

export interface ActionItem {
  id: string
  label: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  onSelect: () => void
}

export interface DataTableProps<T extends { id: string }> {
  /** Lower-case nouns for the counts and empty states, e.g. `{ singular: 'user', plural: 'users' }`. */
  entity: { singular: string; plural: string }
  columns: DataTableColumn<T>[]
  rows: T[]
  filters?: DataTableFilter<T>[]
  /** The search box (placeholder "Search {plural}") over the text the keys return; omitted, no search box. */
  search?: { placeholder?: string; keys: ((row: T) => string)[] }
  /** Row checkboxes; defaults to `true` when `bulkActions` is given. */
  selectable?: boolean
  /** The selected row ids; omit it to let the table hold the selection (it drops ids whose rows
   * leave `rows`). When given, reflect every `onSelectionChange` back into it, or the checkboxes'
   * state drifts from what they show. */
  selectedIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  rowActions?: (row: T) => ActionItem[]
  /** How a row is named in labels ("Select {label}", "Actions for {label}"); defaults to `name`, then `id`. */
  rowLabel?: (row: T) => string
  /** The bulk menu's items for the selected rows, including rows hidden by filters or on other pages. */
  bulkActions?: (selected: T[]) => ActionItem[]
  /** A solid "+ {label}" button; `label` defaults to "Add {singular}". */
  addAction?: { label?: string; onSelect: () => void }
  toolbarStart?: ReactNode
  toolbarEnd?: ReactNode
  /** Rows per page; defaults to 10. */
  pageSize?: number
  initialSort?: { id: string; desc?: boolean }
  /** Replaces "No {plural} yet" when there are no rows at all. */
  emptyMessage?: string
}
