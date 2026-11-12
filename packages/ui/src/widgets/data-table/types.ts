import type { ReactNode } from 'react'
import type { LinkComponent } from '../../pages/auth/types'

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

interface FilterBase {
  id: string
  label: string
}

/** One checkbox per value with its count. */
export interface CheckboxFilter<T> extends FilterBase {
  kind: 'checkbox'
  accessor: (row: T) => string
  /** The values and their labels; omitted, the values found in the rows are listed as they are. */
  options?: Option[]
}

/** One value or all. */
export interface SelectFilter<T> extends FilterBase {
  kind: 'select'
  accessor: (row: T) => string
  /** The values and their labels; omitted, the values found in the rows are listed as they are. */
  options?: Option[]
  /** The select's "no filter" item; defaults to "All". */
  allLabel?: string
}

/** `key=value` chips; a row passes when it carries every chip. */
export interface TagsFilter<T> extends FilterBase {
  kind: 'tags'
  accessor: (row: T) => string[]
  /** Defaults to "key=value…". */
  placeholder?: string
}

export type DataTableFilter<T> = CheckboxFilter<T> | SelectFilter<T> | TagsFilter<T>

interface ActionItemBase {
  id: string
  label: string
  tone?: 'default' | 'danger'
  disabled?: boolean
}

/** A command: choosing it calls `onSelect`. */
export interface ActionCommandItem extends ActionItemBase {
  onSelect: () => void
  href?: undefined
}

/** A link: the item is an anchor to `href` (through the menu's `linkComponent` when there is one);
 * `onSelect` also runs when it is chosen. A disabled link is a plain, inert item. */
export interface ActionLinkItem extends ActionItemBase {
  href: string
  onSelect?: () => void
}

export type ActionItem = ActionCommandItem | ActionLinkItem

/** Filter values by filter id: a checkbox or tags filter's values, a select filter's value. */
export type DataTableFilterValues = Record<string, string | string[]>

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
  /** The filters' values by filter id; omit it to let the table hold them. When given, reflect
   * every `onFilterValuesChange` back into it. A filter without a value is absent from the record. */
  filterValues?: DataTableFilterValues
  onFilterValuesChange?: (values: DataTableFilterValues) => void
  /** The host's link (Next's `Link`, say) for action items with an `href`; defaults to an anchor. */
  linkComponent?: LinkComponent
}
