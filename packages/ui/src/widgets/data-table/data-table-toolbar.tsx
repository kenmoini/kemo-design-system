'use client'
import { Portal } from '@ark-ui/react/portal'
import { SlidersHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'
import { HStack } from '../../../styled-system/jsx'
import { Badge, Button, CloseButton, Drawer, Text } from '../../components/ui'
import { activeFilterCount } from './columns'
import { DataTableFilters, type DataTableFiltersProps } from './data-table-filters'

export interface DataTableToolbarProps {
  /** "{n} {plural}": the rows that pass the filters. */
  count: ReactNode
  /** Selected rows, including hidden ones; `undefined` when the table is not selectable. */
  selected?: number
  start?: ReactNode
  /** The right-hand controls, in order. */
  children?: ReactNode
}

/** The row above the table: the count (and selection) on the left, the controls on the right. */
export function DataTableToolbar({ count, selected, start, children }: DataTableToolbarProps) {
  return (
    <HStack justify="space-between" gap="3" flexWrap="wrap">
      <HStack gap="3" minW="0" flexWrap="wrap">
        <Text textStyle="sm" color="fg.muted">
          {count}
          {selected ? (
            <Text as="span" color="fg.default" fontWeight="medium">
              {` · ${selected} selected`}
            </Text>
          ) : null}
        </Text>
        {start}
      </HStack>
      <HStack gap="2" flexWrap="wrap">
        {children}
      </HStack>
    </HStack>
  )
}

/**
 * Below `lg`: the "Filters" button (with a count of active filters) and the start-side Drawer that
 * holds the same `DataTableFilters` as the rail, bound to the same table.
 */
export function DataTableFiltersDrawer<T extends { id: string }>(props: DataTableFiltersProps<T>) {
  const active = activeFilterCount(props.table)
  return (
    <Drawer.Root placement="start" size="xs">
      <Drawer.Trigger asChild>
        <Button
          variant="outline"
          size="sm"
          hideFrom="lg"
          aria-label={active > 0 ? `Filters (${active} active)` : undefined}
        >
          <SlidersHorizontal />
          Filters
          {active > 0 ? (
            <Badge size="sm" variant="solid" aria-hidden="true">
              {active}
            </Badge>
          ) : null}
        </Button>
      </Drawer.Trigger>
      <Portal>
        <Drawer.Backdrop />
        <Drawer.Positioner>
          <Drawer.Content>
            <Drawer.Header>
              <Drawer.Title>Filters</Drawer.Title>
            </Drawer.Header>
            <Drawer.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Drawer.CloseTrigger>
            <Drawer.Body alignItems="stretch">
              <DataTableFilters {...props} />
            </Drawer.Body>
          </Drawer.Content>
        </Drawer.Positioner>
      </Portal>
    </Drawer.Root>
  )
}
