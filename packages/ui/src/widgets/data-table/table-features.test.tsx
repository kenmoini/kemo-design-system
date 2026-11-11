import { act, render, screen } from '@testing-library/react'
import { useTable } from '@tanstack/react-table'
import { describe, expect, it } from 'vitest'
import { dataTableFeatures } from './table-features'

type Row = { id: string; name: string }

const data: Row[] = [
  { id: '1', name: 'b' },
  { id: '2', name: 'a' },
]

let tableRef: ReturnType<typeof useProbe> | undefined

function useProbe() {
  return useTable({
    features: dataTableFeatures,
    columns: [{ accessorKey: 'name', header: 'Name' }],
    data,
    getRowId: (r: Row) => r.id,
    initialState: { sorting: [{ id: 'name', desc: false }] },
  })
}

function Probe() {
  const table = useProbe()
  tableRef = table
  return (
    <p data-testid="out">
      {table
        .getRowModel()
        .rows.map((r) => r.getValue('name'))
        .join(',')}
    </p>
  )
}

describe('dataTableFeatures', () => {
  it('sorts both ways and applies the global filter', () => {
    render(<Probe />)
    expect(screen.getByTestId('out').textContent).toBe('a,b')

    act(() => tableRef!.setSorting([{ id: 'name', desc: true }]))
    expect(screen.getByTestId('out').textContent).toBe('b,a')

    act(() => tableRef!.setGlobalFilter('a'))
    expect(screen.getByTestId('out').textContent).toBe('a')
  })
})
