import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { MEDIA_LG } from '../../layouts/app-shell'
import { cleanYaml, toYaml } from '../../lib/kubernetes'
import { downloadText } from '../resources/download'
import { stubLayout } from '../../test/layout'
import { setMediaMatches } from '../../test/media'
import { DeploymentDetailPage, type DeploymentDetailPageProps } from './deployment-detail-page'
import { deploymentSchema } from './schema/deployment-schema'
import { checkoutApi, checkoutSummary, events, NOW, related } from './test-fixtures'

vi.mock('../resources/download', () => ({ downloadText: vi.fn() }))

const ID = 'prod-us-east/checkout/checkout-api'
const tabHref = (tab: string) =>
  tab === 'overview' ? `/deployments/${ID}` : `/deployments/${ID}/${tab}`

function renderPage(props: Partial<DeploymentDetailPageProps> = {}) {
  const handlers = {
    onScale: vi.fn<(id: string, replicas: number) => void>(),
    onRestart: vi.fn<(ids: string[]) => void>(),
    onSetPaused: vi.fn<(ids: string[], paused: boolean) => void>(),
    onDelete: vi.fn<(ids: string[]) => void>(),
    onDraftChange: vi.fn<(text?: string) => void>(),
    onSaveYaml: vi.fn<(text: string) => void>(),
  }
  render(
    <DeploymentDetailPage
      deployment={checkoutApi}
      cluster="prod-us-east"
      summary={checkoutSummary}
      related={related}
      events={events}
      tab="overview"
      tabHref={tabHref}
      listHref="/deployments"
      now={NOW}
      schema={deploymentSchema}
      yamlText={toYaml(checkoutApi)}
      {...handlers}
      {...props}
    />,
  )
  return handlers
}

let layout: MockInstance
beforeEach(() => {
  layout = stubLayout()
  setMediaMatches(MEDIA_LG, true)
})
afterEach(() => {
  layout.mockRestore()
  vi.mocked(downloadText).mockReset()
})

describe('DeploymentDetailPage', () => {
  it('renders the breadcrumb, the name with its status, the context and the tabs', () => {
    renderPage()
    const nav = screen.getByRole('navigation', { name: 'breadcrumb' })
    expect(within(nav).getByRole('link', { name: 'Deployments' })).toHaveAttribute(
      'href',
      '/deployments',
    )
    expect(within(nav).getByText('checkout-api')).toHaveAttribute('aria-current', 'page')
    expect(
      screen.getByRole('heading', { level: 1, name: 'checkout-api Available' }),
    ).toBeInTheDocument()
    expect(screen.getByText('prod-us-east · checkout · apps/v1')).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs.map((tab) => tab.textContent)).toEqual(['Overview', 'YAML', 'Events'])
    expect(screen.getByRole('tab', { name: 'YAML' })).toHaveAttribute('href', tabHref('yaml'))
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the overview on the overview tab', () => {
    renderPage()
    expect(screen.getByRole('group', { name: 'Ready' })).toHaveTextContent('6 / 6')
    expect(screen.getByRole('region', { name: 'Related objects' })).toBeInTheDocument()
  })

  it('shows the status by tone and word', () => {
    renderPage({ summary: { ...checkoutSummary, status: 'degraded' } })
    expect(
      screen.getByRole('heading', { level: 1, name: 'checkout-api Degraded' }),
    ).toBeInTheDocument()
  })

  it('renders the YAML toolbar and editor on the yaml tab', async () => {
    renderPage({ tab: 'yaml' })
    expect(await screen.findByRole('textbox', { name: 'checkout-api.yaml' })).toHaveTextContent(
      'kind: Deployment',
    )
    expect(screen.getByRole('tab', { name: 'YAML' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Download' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Schema' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Saved')
  })

  it('saves the draft through onSaveYaml and says when the server copy changed', async () => {
    const user = userEvent.setup()
    const draft = toYaml(checkoutApi).replace('replicas: 6', 'replicas: 8')
    const { onSaveYaml } = renderPage({ tab: 'yaml', draft, serverChanged: true })
    expect(await screen.findByRole('textbox', { name: 'checkout-api.yaml' })).toHaveTextContent(
      'replicas: 8',
    )
    expect(screen.getByRole('status')).toHaveTextContent('Server copy changed · Reload to see it')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onSaveYaml).toHaveBeenCalledWith(draft)
  })

  it('downloads the clean YAML of the deployment', async () => {
    const user = userEvent.setup()
    renderPage({ tab: 'yaml' })
    await screen.findByRole('textbox', { name: 'checkout-api.yaml' })
    await user.click(screen.getByRole('button', { name: 'Download' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Download clean YAML' }))
    expect(downloadText).toHaveBeenLastCalledWith('checkout-api.clean.yaml', cleanYaml(checkoutApi))
    expect(vi.mocked(downloadText).mock.lastCall?.[1]).not.toContain('resourceVersion')
  })

  it('cleans the draft, not the server copy, for the clean download', async () => {
    const user = userEvent.setup()
    const draft = toYaml(checkoutApi).replace('replicas: 6', 'replicas: 8')
    renderPage({ tab: 'yaml', draft })
    await screen.findByRole('textbox', { name: 'checkout-api.yaml' })
    await user.click(screen.getByRole('button', { name: 'Download' }))
    const menu = await screen.findByRole('menu')
    await user.click(within(menu).getByRole('menuitem', { name: 'Download clean YAML' }))
    const saved = vi.mocked(downloadText).mock.lastCall?.[1] as string
    expect(saved).toContain('replicas: 8')
    expect(saved).not.toContain('resourceVersion')
  })

  it('renders the events table on the events tab', () => {
    renderPage({ tab: 'events' })
    expect(screen.getByRole('radio', { name: 'Deployment + children' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'All 3' })).toBeChecked()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('row')).toHaveLength(events.length + 1)
    expect(within(table).getByText('Pod/checkout-api-7d9f-b81mn')).toBeInTheDocument()
  })

  it('says the events stream when they are live', () => {
    renderPage({ tab: 'events', liveEvents: true })
    expect(screen.getByRole('status')).toHaveTextContent('streaming · paused on hover')
  })

  it('tells the host when the events reader pauses the stream', async () => {
    const user = userEvent.setup()
    const onEventsPauseChange = vi.fn<(paused: boolean) => void>()
    renderPage({ tab: 'events', liveEvents: true, onEventsPauseChange })
    const region = screen.getByRole('region', { name: 'Events' })
    await user.hover(region)
    expect(onEventsPauseChange).toHaveBeenLastCalledWith(true)
    await user.unhover(region)
    expect(onEventsPauseChange).toHaveBeenLastCalledWith(false)
  })

  it('tells the host when the YAML is reloaded', async () => {
    const user = userEvent.setup()
    const onReloadYaml = vi.fn<() => void>()
    const draft = toYaml(checkoutApi).replace('replicas: 6', 'replicas: 8')
    const { onDraftChange } = renderPage({ tab: 'yaml', draft, onReloadYaml })
    await screen.findByRole('textbox', { name: 'checkout-api.yaml' })
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Discard your changes?' })
    await user.click(within(confirm).getByRole('button', { name: 'Discard' }))
    expect(onDraftChange).toHaveBeenLastCalledWith(undefined)
    expect(onReloadYaml).toHaveBeenCalledTimes(1)
  })

  it('scales the deployment', async () => {
    const user = userEvent.setup()
    const { onScale } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Scale…' }))
    const dialog = await screen.findByRole('dialog', { name: 'Scale checkout-api' })
    const replicas = within(dialog).getByRole('spinbutton', { name: 'Replicas' })
    await user.clear(replicas)
    await user.type(replicas, '3')
    await user.click(within(dialog).getByRole('button', { name: 'Scale' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(onScale).toHaveBeenCalledWith(ID, 3)
  })

  it('restarts the deployment after a confirm', async () => {
    const user = userEvent.setup()
    const { onRestart } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Restart' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Restart checkout-api?' })
    expect(dialog).toHaveTextContent('A rolling restart replaces every pod.')
    await user.click(within(dialog).getByRole('button', { name: 'Restart' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull())
    expect(onRestart).toHaveBeenCalledWith([ID])
  })

  it('pauses a running deployment and resumes a paused one', async () => {
    const user = userEvent.setup()
    const { onSetPaused } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(onSetPaused).toHaveBeenCalledWith([ID], true)
  })

  it('offers Resume for a paused deployment', async () => {
    const user = userEvent.setup()
    const { onSetPaused } = renderPage({
      summary: { ...checkoutSummary, status: 'paused', paused: true },
    })
    expect(screen.getByRole('heading', { level: 1, name: 'checkout-api Paused' })).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Resume' }))
    expect(onSetPaused).toHaveBeenCalledWith([ID], false)
  })

  it('links Edit YAML to the yaml tab', () => {
    renderPage()
    expect(screen.getByRole('link', { name: 'Edit YAML' })).toHaveAttribute('href', tabHref('yaml'))
  })

  it('deletes the deployment after a confirm', async () => {
    const user = userEvent.setup()
    const { onDelete } = renderPage()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete checkout-api?' })
    expect(dialog).toHaveTextContent("This can't be undone.")
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))
    expect(onDelete).toHaveBeenCalledWith([ID])
  })
})
