'use client'
import { Portal } from '@ark-ui/react/portal'
import { createListCollection } from '@ark-ui/react/select'
import { Search } from 'lucide-react'
import { useId, useMemo } from 'react'
import { Stack } from '../../../styled-system/jsx'
import { Button, Checkbox, Input, InputGroup, Select, Text } from '../../components/ui'
import { activeFilterCount, clearFilters, type DataTableInstance, filterColumnId } from './columns'
import type { DataTableFilter, Option } from './types'

export interface DataTableFiltersProps<T extends { id: string }> {
  table: DataTableInstance<T>
  filters: DataTableFilter<T>[]
  /** Renders the search box; `placeholder` (also its label) defaults to "Search". */
  search?: { placeholder?: string }
}

type FilterColumn<T extends { id: string }> = NonNullable<
  ReturnType<DataTableInstance<T>['getColumn']>
>

const ALL = '__all__'

/** The filter's options, or the values found in the rows plus any value still filtered on. */
function optionsFor(
  options: Option[] | undefined,
  facets: Map<unknown, number>,
  selected: string[],
): Option[] {
  if (options) return options
  const values = new Set<string>(selected)
  for (const key of facets.keys()) values.add(String(key))
  return [...values].sort().map((value) => ({ value, label: value }))
}

function FilterLabel({ id, children }: { id: string; children: string }) {
  return (
    <Text id={id} textStyle="xs" color="fg.muted" fontWeight="medium">
      {children}
    </Text>
  )
}

function CheckboxFilter<T extends { id: string }>({
  table,
  column,
  filter,
}: {
  table: DataTableInstance<T>
  column: FilterColumn<T>
  filter: DataTableFilter<T>
}) {
  const labelId = useId()
  // Counts over the rows that pass the search and every other filter (not this one).
  const facets = column.getFacetedUniqueValues()
  const filterValue = column.getFilterValue() as string[] | undefined
  const selected = filterValue ?? []
  // TanStack memoises the facet map, so the options are rebuilt only when rows or filters change.
  const options = useMemo(
    () => optionsFor(filter.options, facets, filterValue ?? []),
    [filter.options, facets, filterValue],
  )
  const toggle = (value: string, checked: boolean) => {
    const next = checked ? [...selected, value] : selected.filter((v) => v !== value)
    column.setFilterValue(next.length > 0 ? next : undefined)
    table.setPageIndex(0)
  }

  return (
    <Stack gap="2" role="group" aria-labelledby={labelId}>
      <FilterLabel id={labelId}>{filter.label}</FilterLabel>
      {options.map((option) => (
        <Checkbox.Root
          key={option.value}
          size="sm"
          checked={selected.includes(option.value)}
          onCheckedChange={(details) => toggle(option.value, details.checked === true)}
        >
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          <Checkbox.Label>
            {option.label}{' '}
            <Text as="span" color="fg.subtle" fontWeight="normal" fontVariantNumeric="tabular-nums">
              {facets.get(option.value) ?? 0}
            </Text>
          </Checkbox.Label>
          <Checkbox.HiddenInput />
        </Checkbox.Root>
      ))}
    </Stack>
  )
}

function SelectFilter<T extends { id: string }>({
  table,
  column,
  filter,
}: {
  table: DataTableInstance<T>
  column: FilterColumn<T>
  filter: DataTableFilter<T>
}) {
  const value = column.getFilterValue() as string | undefined
  const facets = column.getFacetedUniqueValues()
  const options = useMemo(
    () => optionsFor(filter.options, facets, value ? [value] : []),
    [filter.options, facets, value],
  )
  const allLabel = filter.allLabel ?? 'All'
  const collection = useMemo(
    () => createListCollection({ items: [{ value: ALL, label: allLabel }, ...options] }),
    [allLabel, options],
  )

  return (
    <Select.Root
      collection={collection}
      value={[value ?? ALL]}
      onValueChange={(details) => {
        const next = details.value[0]
        column.setFilterValue(next && next !== ALL ? next : undefined)
        table.setPageIndex(0)
      }}
      size="sm"
      positioning={{ sameWidth: true }}
    >
      <Select.Label textStyle="xs" color="fg.muted" fontWeight="medium">
        {filter.label}
      </Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
          <Select.Indicator />
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  )
}

/**
 * The filter controls of a `DataTable`: the search box, one checkbox group (with counts) or select
 * per filter, and "Clear filters" while anything is filtered. The rail on `lg` and the "Filters"
 * drawer below it both render this, bound to the same table.
 */
export function DataTableFilters<T extends { id: string }>({
  table,
  filters,
  search,
}: DataTableFiltersProps<T>) {
  const placeholder = search?.placeholder ?? 'Search'
  const globalFilter = (table.state.globalFilter as string | undefined) ?? ''

  return (
    <Stack gap="5">
      {search ? (
        <InputGroup size="sm" startElement={<Search />}>
          <Input
            type="search"
            size="sm"
            aria-label={placeholder}
            placeholder={placeholder}
            value={globalFilter}
            onChange={(event) => {
              table.setGlobalFilter(event.target.value)
              table.setPageIndex(0)
            }}
          />
        </InputGroup>
      ) : null}
      {filters.map((filter) => {
        const column = table.getColumn(filterColumnId(filter.id))
        if (!column) return null
        return filter.kind === 'checkbox' ? (
          <CheckboxFilter key={filter.id} table={table} column={column} filter={filter} />
        ) : (
          <SelectFilter key={filter.id} table={table} column={column} filter={filter} />
        )
      })}
      {activeFilterCount(table) > 0 ? (
        <Button
          variant="plain"
          size="sm"
          alignSelf="flex-start"
          onClick={() => clearFilters(table)}
        >
          Clear filters
        </Button>
      ) : null}
    </Stack>
  )
}
