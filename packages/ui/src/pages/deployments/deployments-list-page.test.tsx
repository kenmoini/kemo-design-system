import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { MEDIA_LG } from '../../layouts/app-shell'
import type { DeploymentSummary, ScopeValue } from '../../lib/kubernetes'
import { stubLayout } from '../../test/layout'
import { setMediaMatches } from '../../test/media'
import { DeploymentsListPage, type DeploymentsListPageProps } from './deployments-list-page'
import { clusters, NOW, rows } from './test-fixtures'

const ALL: ScopeValue = { clusters: [], namespaces: [] }
const detailHref = (row: DeploymentSummary) => `/deployments/${row.id}`

function pageElement(props: Partial<DeploymentsListPageProps> = {}) {
  return (
    <DeploymentsListPage
      scope={ALL}
      onScopeChange={() => {}}
      clusters={clusters}
      rows={rows}
      now={NOW}
      detailHref={detailHref}
      createHref="/deployments/new"
      onScale={() => {}}
      onRestart={() => {}}
      onSetPaused={() => {}}
      onDelete={() => {}}
      {...props}
    />
  )
}

function renderPage(props: Partial<DeploymentsListPageProps> = {}) {
  const handlers = {
    onScale: vi.fn<(id: string, replicas: number) => void>(),
    onRestart: vi.fn<(ids: string[]) => void>(),
    onSetPaused: vi.fn<(ids: string[], paused: boolean) => void>(),
    onDelete: vi.fn<(ids: string[]) => void>(),
  }
  const view = render(pageElement({ ...handlers, ...props }))
  return { ...view, ...handlers }
}

const table = () => screen.getByRole('table')
const bodyRows = () => within(table()).getAllByRole('row').slice(1)
const rowOf = (name: string) =>
  bodyRows().find((row) => within(row).queryByRole('link', { name }) !== null)!

async function rowAction(user: ReturnType<typeof userEvent.setup>, name: string, item: string) {
  await user.click(screen.getByRole('button', { name: `Actions for ${name}` }))
  const menu = await screen.findByRole('menu')
  await user.click(within(menu).getByRole('menuitem', { name: item }))
}

let layout: MockInstance
beforeEach(() => {
  layout = stubLayout()
  setMediaMatches(MEDIA_LG, true)
})
afterEach(() => {
  layout.mockRestore()
})

describe('DeploymentsListPage', () => {
  it('renders the header with the create link and the scope pickers', () => {
    renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Deployments' })).toBeInTheDocument()
    expect(
      screen.getByText('apps/v1 Deployments across the clusters you can see'),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '+ Create deployment' })).toHaveAttribute(
      'href',
      '/deployments/new',
    )
    expect(screen.getByRole('combobox', { name: 'Clusters' })).toHaveTextContent('All clusters')
    expect(screen.getByRole('combobox', { name: 'Namespaces' })).toHaveTextContent('All namespaces')
  })

  it('lists the rows by name with links, cluster and namespace, and names the scope', () => {
    renderPage()
    expect(bodyRows().map((row) => within(row).getAllByRole('link')[0]!.textContent)).toEqual([
      'auth-service',
      'billing-worker',
      'checkout-api',
      'search-indexer',
      'web-frontend',
    ])
    const checkout = rowOf('checkout-api')
    expect(within(checkout).getByRole('link', { name: 'checkout-api' })).toHaveAttribute(
      'href',
      '/deployments/prod-us-east/checkout/checkout-api',
    )
    expect(within(checkout).getByText('prod-us-east · checkout')).toBeInTheDocument()
    // One line names the count and the scope.
    expect(screen.getByText('5 deployments in 3 clusters · all namespaces')).toBeInTheDocument()
    expect(screen.queryByText('5 deployments')).toBeNull()
  })

  it('shows status by word and colour, ready counts, label chips and age', () => {
    renderPage()
    const checkout = rowOf('checkout-api')
    expect(within(checkout).getByText('Available')).toBeInTheDocument()
    expect(within(checkout).getByText('6/6')).toBeInTheDocument()
    expect(within(checkout).getByText('app=checkout-api')).toBeInTheDocument()
    expect(within(checkout).getByText('tier=api')).toBeInTheDocument()
    expect(within(checkout).queryByText('team=payments')).toBeNull()
    expect(within(checkout).queryByText('app.kubernetes.io/part-of=checkout')).toBeNull()
    expect(within(checkout).getByText('+2')).toBeInTheDocument()
    expect(within(checkout).getByText('42d')).toBeInTheDocument()

    expect(within(rowOf('web-frontend')).getByText('Progressing')).toBeInTheDocument()
    expect(within(rowOf('web-frontend')).getByText('3/5')).toBeInTheDocument()
    expect(within(rowOf('search-indexer')).getByText('Degraded')).toBeInTheDocument()
    expect(within(rowOf('billing-worker')).getByText('Paused')).toBeInTheDocument()
  })

  it('filters by status with counts, by labels and by namespace', async () => {
    const user = userEvent.setup()
    renderPage()
    const rail = screen.getByRole('complementary', { name: 'Filters' })
    await user.click(within(rail).getByRole('checkbox', { name: 'Available 2' }))
    expect(bodyRows()).toHaveLength(2)
    await user.click(within(rail).getByRole('checkbox', { name: 'Available 2' }))

    await user.type(within(rail).getByPlaceholderText('key=value…'), 'tier=api{Enter}')
    expect(bodyRows()).toHaveLength(1)
    expect(bodyRows()[0]).toHaveTextContent('checkout-api')
    expect(screen.getByText('1 deployment in 3 clusters · all namespaces')).toBeInTheDocument()
    await user.click(within(rail).getByRole('button', { name: 'Clear filters' }))

    await user.click(within(rail).getByRole('combobox', { name: 'Namespace' }))
    const list = await screen.findByRole('listbox')
    expect(
      within(list)
        .getAllByRole('option')
        .map((option) => option.textContent),
    ).toEqual(['All', 'auth', 'billing', 'checkout', 'search'])
    await user.click(within(list).getByRole('option', { name: 'checkout' }))
    expect(bodyRows()).toHaveLength(2)
  })

  it('clears a namespace filter that leaves the scope', async () => {
    const user = userEvent.setup()
    const { rerender } = renderPage()
    const namespace = () => screen.getByRole('combobox', { name: 'Namespace' })
    await user.click(namespace())
    await user.click(await screen.findByRole('option', { name: 'search' }))
    expect(namespace()).toHaveTextContent('search')
    expect(bodyRows()).toHaveLength(1)

    // The host narrows the scope to prod-us-east: "search" lives only in prod-eu-west.
    const scoped = rows.filter((row) => row.cluster === 'prod-us-east')
    rerender(pageElement({ scope: { clusters: ['prod-us-east'], namespaces: [] }, rows: scoped }))
    expect(namespace()).toHaveTextContent('All')
    expect(bodyRows()).toHaveLength(scoped.length)
    expect(screen.getByText('3 deployments in 1 cluster · all namespaces')).toBeInTheDocument()

    // Cleared, not hidden: widening the scope again does not bring it back.
    rerender(pageElement())
    expect(namespace()).toHaveTextContent('All')
    expect(bodyRows()).toHaveLength(rows.length)
  })

  it('keeps a namespace filter that stays in the scope', async () => {
    const user = userEvent.setup()
    const { rerender } = renderPage()
    const namespace = () => screen.getByRole('combobox', { name: 'Namespace' })
    await user.click(namespace())
    await user.click(await screen.findByRole('option', { name: 'checkout' }))

    const scope = { clusters: ['prod-us-east'], namespaces: ['checkout'] }
    const scoped = rows.filter(
      (row) => row.cluster === 'prod-us-east' && row.namespace === 'checkout',
    )
    rerender(pageElement({ scope, rows: scoped }))
    expect(namespace()).toHaveTextContent('checkout')
    expect(bodyRows()).toHaveLength(2)
    expect(screen.getByText('2 deployments in 1 cluster · 1 namespace')).toBeInTheDocument()
  })

  it('keeps a chosen namespace on show once its last deployment is gone', async () => {
    const user = userEvent.setup()
    const { rerender } = renderPage()
    const namespace = () => screen.getByRole('combobox', { name: 'Namespace' })
    await user.click(namespace())
    await user.click(await screen.findByRole('option', { name: 'search' }))

    rerender(pageElement({ rows: rows.filter((row) => row.namespace !== 'search') }))
    expect(namespace()).toHaveTextContent('search')
    await user.click(namespace())
    expect(await screen.findByRole('option', { name: 'search' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(
      screen.getByRole('cell', { name: /No deployments match these filters/ }),
    ).toBeInTheDocument()
  })

  it('scales a deployment from its row menu', async () => {
    const user = userEvent.setup()
    const { onScale } = renderPage()
    await rowAction(user, 'checkout-api', 'Scale…')
    const dialog = await screen.findByRole('dialog', { name: 'Scale checkout-api' })
    const replicas = within(dialog).getByRole('spinbutton', { name: 'Replicas' })
    expect(replicas).toHaveValue('6')
    await user.clear(replicas)
    await user.type(replicas, '8')
    await user.click(within(dialog).getByRole('button', { name: 'Scale' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onScale).toHaveBeenCalledWith('prod-us-east/checkout/checkout-api', 8)
  })

  it('keeps the Scale dialog open on a value out of range', async () => {
    // A pause between keys lets the number input restore its caret.
    const user = userEvent.setup({ delay: 20 })
    const { onScale } = renderPage()
    await rowAction(user, 'checkout-api', 'Scale…')
    const dialog = await screen.findByRole('dialog', { name: 'Scale checkout-api' })
    const replicas = within(dialog).getByRole('spinbutton', { name: 'Replicas' })
    await user.clear(replicas)
    await user.type(replicas, '101')
    await user.click(within(dialog).getByRole('button', { name: 'Scale' }))
    expect(
      await within(dialog).findByText('Enter a number from 0 to 100.', undefined, {
        timeout: 4000,
      }),
    ).toBeInTheDocument()
    expect(onScale).not.toHaveBeenCalled()
  })

  it('restarts a deployment after a confirm', async () => {
    const user = userEvent.setup()
    const { onRestart } = renderPage()
    await rowAction(user, 'checkout-api', 'Restart')
    const dialog = await screen.findByRole('alertdialog', { name: 'Restart checkout-api?' })
    expect(dialog).toHaveTextContent('A rolling restart replaces every pod.')
    await user.click(within(dialog).getByRole('button', { name: 'Restart' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(onRestart).toHaveBeenCalledWith(['prod-us-east/checkout/checkout-api'])
  })

  it('pauses a running deployment and resumes a paused one', async () => {
    const user = userEvent.setup()
    const { onSetPaused } = renderPage()
    await rowAction(user, 'checkout-api', 'Pause')
    expect(onSetPaused).toHaveBeenLastCalledWith(['prod-us-east/checkout/checkout-api'], true)
    await rowAction(user, 'billing-worker', 'Resume')
    expect(onSetPaused).toHaveBeenLastCalledWith(['prod-us-east/billing/billing-worker'], false)
  })

  it('links Edit YAML to the YAML tab of the deployment', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Actions for checkout-api' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Edit YAML' })).toHaveAttribute(
      'href',
      '/deployments/prod-us-east/checkout/checkout-api/yaml',
    )
  })

  it('deletes a deployment after a confirm', async () => {
    const user = userEvent.setup()
    const { onDelete } = renderPage()
    await rowAction(user, 'checkout-api', 'Delete')
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete checkout-api?' })
    expect(dialog).toHaveTextContent("This can't be undone.")
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith(['prod-us-east/checkout/checkout-api'])
  })

  it('bulk-pauses only the rows not paused yet and says how many are skipped', async () => {
    const user = userEvent.setup()
    const { onSetPaused } = renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Select checkout-api' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select billing-worker' }))
    await user.click(screen.getByRole('button', { name: 'Bulk actions' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Pause' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Pause 2 deployments?' })
    expect(dialog).toHaveTextContent('2 selected; 1 already paused will be skipped.')
    await user.click(within(dialog).getByRole('button', { name: 'Pause' }))
    expect(onSetPaused).toHaveBeenCalledWith(['prod-us-east/checkout/checkout-api'], true)
  })

  it('bulk-resumes, restarts and deletes the selection after a confirm', async () => {
    const user = userEvent.setup()
    const { onSetPaused, onRestart, onDelete } = renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Select checkout-api' }))
    await user.click(screen.getByRole('checkbox', { name: 'Select billing-worker' }))
    const bulk = async (item: string, title: string, description: string) => {
      await user.click(screen.getByRole('button', { name: 'Bulk actions' }))
      const menu = await screen.findByRole('menu')
      await user.click(within(menu).getByRole('menuitem', { name: item }))
      const dialog = await screen.findByRole('alertdialog', { name: title })
      expect(dialog).toHaveTextContent(description)
      await user.click(within(dialog).getByRole('button', { name: item }))
      await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    }

    await bulk('Resume', 'Resume 2 deployments?', '2 selected; 1 not paused will be skipped.')
    expect(onSetPaused).toHaveBeenCalledWith(['prod-us-east/billing/billing-worker'], false)

    await bulk('Restart', 'Restart 2 deployments?', 'A rolling restart replaces every pod.')
    expect(onRestart).toHaveBeenCalledWith([
      'prod-us-east/checkout/checkout-api',
      'prod-us-east/billing/billing-worker',
    ])

    await bulk('Delete', 'Delete 2 deployments?', "This can't be undone.")
    expect(onDelete).toHaveBeenCalledWith([
      'prod-us-east/checkout/checkout-api',
      'prod-us-east/billing/billing-worker',
    ])
  })

  it('turns bulk Pause off when every selected row is already paused', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('checkbox', { name: 'Select billing-worker' }))
    await user.click(screen.getByRole('button', { name: 'Bulk actions' }))
    const menu = await screen.findByRole('menu')
    expect(within(menu).getByRole('menuitem', { name: 'Pause' })).toHaveAttribute(
      'aria-disabled',
      'true',
    )
    expect(within(menu).getByRole('menuitem', { name: 'Resume' })).not.toHaveAttribute(
      'aria-disabled',
    )
  })

  it('passes a host-held selection through', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn<(ids: string[]) => void>()
    renderPage({ selectedIds: ['prod-us-east/checkout/checkout-api'], onSelectionChange })
    expect(screen.getByRole('checkbox', { name: 'Select checkout-api' })).toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: 'Select web-frontend' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'prod-us-east/checkout/checkout-api',
      'prod-us-east/checkout/web-frontend',
    ])
  })

  it('drops host-held selected ids whose rows left the scope', async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn<(ids: string[]) => void>()
    renderPage({
      rows: rows.filter((row) => row.cluster === 'prod-us-east'),
      selectedIds: ['prod-eu-west/search/search-indexer', 'prod-us-east/checkout/checkout-api'],
      onSelectionChange,
    })
    expect(screen.getByText('· 1 selected')).toBeInTheDocument()
    await user.click(screen.getByRole('checkbox', { name: 'Select web-frontend' }))
    expect(onSelectionChange).toHaveBeenLastCalledWith([
      'prod-us-east/checkout/checkout-api',
      'prod-us-east/checkout/web-frontend',
    ])
  })

  it('says when the scope has no deployments', () => {
    renderPage({ rows: [] })
    expect(screen.getByRole('cell', { name: 'No deployments in this scope' })).toBeInTheDocument()
    expect(screen.getByText('0 deployments in 3 clusters · all namespaces')).toBeInTheDocument()
  })
})
