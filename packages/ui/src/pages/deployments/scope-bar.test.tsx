import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import type { ScopeValue } from '../../lib/kubernetes'
import { stubLayout } from '../../test/layout'
import { ScopeBar } from './scope-bar'
import { clusters } from './test-fixtures'

function Host({
  initial = { clusters: [], namespaces: [] },
  onChange,
}: {
  initial?: ScopeValue
  onChange: (value: ScopeValue) => void
}) {
  const [value, setValue] = useState(initial)
  return (
    <ScopeBar
      clusters={clusters}
      value={value}
      onChange={(next) => {
        onChange(next)
        setValue(next)
      }}
    />
  )
}

const clustersPicker = () => screen.getByRole('combobox', { name: 'Clusters' })
const namespacesPicker = () => screen.getByRole('combobox', { name: 'Namespaces' })

async function closeList(user: ReturnType<typeof userEvent.setup>) {
  await user.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
}

let layout: MockInstance
beforeEach(() => {
  layout = stubLayout()
})
afterEach(() => {
  layout.mockRestore()
})

describe('ScopeBar', () => {
  it('reads "All clusters" and "All namespaces" when nothing is chosen', () => {
    render(<Host onChange={() => {}} />)
    expect(clustersPicker()).toHaveTextContent('All clusters')
    expect(namespacesPicker()).toHaveTextContent('All namespaces')
  })

  it('offers every namespace of every cluster, once and sorted, when no cluster is chosen', async () => {
    const user = userEvent.setup()
    render(<Host onChange={() => {}} />)
    await user.click(namespacesPicker())
    const list = await screen.findByRole('listbox')
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['auth', 'billing', 'checkout', 'platform', 'search'])
  })

  it('shows two chosen clusters as chips and offers the union of their namespaces', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(value: ScopeValue) => void>()
    render(<Host onChange={onChange} />)
    await user.click(clustersPicker())
    await user.click(await screen.findByRole('option', { name: 'prod-us-east' }))
    expect(onChange).toHaveBeenLastCalledWith({ clusters: ['prod-us-east'], namespaces: [] })
    await user.click(screen.getByRole('option', { name: 'prod-eu-west' }))
    expect(onChange).toHaveBeenLastCalledWith({
      clusters: ['prod-us-east', 'prod-eu-west'],
      namespaces: [],
    })
    await closeList(user)

    expect(within(clustersPicker()).getByText('prod-us-east')).toBeInTheDocument()
    expect(within(clustersPicker()).getByText('prod-eu-west')).toBeInTheDocument()
    expect(clustersPicker()).not.toHaveTextContent('All clusters')

    await user.click(namespacesPicker())
    const list = await screen.findByRole('listbox')
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['billing', 'checkout', 'platform', 'search'])
  })

  it('counts chips past two as +N', async () => {
    const user = userEvent.setup()
    render(<Host onChange={() => {}} />)
    await user.click(clustersPicker())
    for (const name of ['prod-us-east', 'prod-eu-west', 'staging-us-east']) {
      await user.click(await screen.findByRole('option', { name }))
    }
    await closeList(user)
    expect(within(clustersPicker()).getByText('prod-us-east')).toBeInTheDocument()
    expect(within(clustersPicker()).getByText('prod-eu-west')).toBeInTheDocument()
    expect(within(clustersPicker()).queryByText('staging-us-east')).toBeNull()
    expect(within(clustersPicker()).getByText('+1')).toBeInTheDocument()
  })

  it('reports chosen namespaces', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(value: ScopeValue) => void>()
    render(<Host initial={{ clusters: ['prod-us-east'], namespaces: [] }} onChange={onChange} />)
    await user.click(namespacesPicker())
    await user.click(await screen.findByRole('option', { name: 'checkout' }))
    expect(onChange).toHaveBeenLastCalledWith({
      clusters: ['prod-us-east'],
      namespaces: ['checkout'],
    })
  })

  it('drops chosen namespaces that leave the union when the clusters change', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn<(value: ScopeValue) => void>()
    render(
      <Host
        initial={{ clusters: ['prod-us-east', 'prod-eu-west'], namespaces: ['billing', 'search'] }}
        onChange={onChange}
      />,
    )
    await user.click(clustersPicker())
    // Unchoose prod-us-east: billing lives only there, search stays with prod-eu-west.
    await user.click(await screen.findByRole('option', { name: 'prod-us-east' }))
    expect(onChange).toHaveBeenLastCalledWith({
      clusters: ['prod-eu-west'],
      namespaces: ['search'],
    })
  })
})
