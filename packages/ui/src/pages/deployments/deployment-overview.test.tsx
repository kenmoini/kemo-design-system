import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MEDIA_LG } from '../../layouts/app-shell'
import type { DeploymentResource, DeploymentSummary, RelatedObjects } from '../../lib/kubernetes'
import { setMediaMatches } from '../../test/media'
import { DeploymentOverview } from './deployment-overview'
import { checkoutApi, checkoutSummary, NOW, related } from './test-fixtures'

function renderOverview(
  props: {
    deployment?: DeploymentResource
    summary?: DeploymentSummary
    related?: RelatedObjects
  } = {},
) {
  return render(
    <DeploymentOverview
      deployment={props.deployment ?? checkoutApi}
      summary={props.summary ?? checkoutSummary}
      related={props.related ?? related}
      now={NOW}
    />,
  )
}

/** The value of a details entry (`dd`) by its term (`dt`). */
function detail(term: string): HTMLElement {
  const dt = screen.getByText(term, { selector: 'dt' })
  const dd = dt.nextElementSibling
  if (!(dd instanceof HTMLElement) || dd.tagName !== 'DD') throw new Error(`no dd for ${term}`)
  return dd
}

const relatedSection = () => screen.getByRole('region', { name: 'Related objects' })
const relatedTable = () => within(relatedSection()).getByRole('table')
const headers = () =>
  within(relatedTable())
    .getAllByRole('columnheader')
    .map((header) => header.textContent)

beforeEach(() => {
  setMediaMatches(MEDIA_LG, true)
})

describe('DeploymentOverview', () => {
  it('shows the ready, rollout and restart tiles', () => {
    renderOverview()
    const ready = screen.getByRole('group', { name: 'Ready' })
    expect(ready).toHaveTextContent('6 / 6')

    const rollout = screen.getByRole('group', { name: 'Updated · Available' })
    expect(rollout).toHaveTextContent('6 · 6')
    expect(rollout).toHaveTextContent('rollout complete 4m ago')

    const restarts = screen.getByRole('group', { name: 'Restarts' })
    expect(restarts).toHaveTextContent('3')
    expect(restarts).toHaveTextContent('image 2.14.0')
  })

  it('says a rollout is under way while the deployment progresses', () => {
    renderOverview({ summary: { ...checkoutSummary, status: 'progressing', ready: 4 } })
    expect(screen.getByRole('group', { name: 'Ready' })).toHaveTextContent('4 / 6')
    expect(screen.getByRole('group', { name: 'Updated · Available' })).toHaveTextContent(
      'rolling out…',
    )
  })

  it('lists the details in pairs', () => {
    renderOverview()
    expect(within(detail('Labels')).getByText('app=checkout-api')).toBeInTheDocument()
    expect(within(detail('Labels')).getByText('tier=api')).toBeInTheDocument()
    expect(detail('Selector')).toHaveTextContent('app=checkout-api')
    expect(detail('Strategy')).toHaveTextContent('RollingUpdate · 25% / 25%')
    expect(detail('Replicas')).toHaveTextContent('6 desired · 6 updated · 6 available')
    expect(detail('Image')).toHaveTextContent('ghcr.io/acme/checkout-api:2.14.0')
    expect(detail('Service account')).toHaveTextContent('checkout-api')
    expect(within(detail('Node selector')).getByText('pool=general')).toBeInTheDocument()
    expect(detail('Created')).toHaveTextContent('42d ago by Priya')
  })

  it('reads Recreate and the default service account', () => {
    const deployment: DeploymentResource = {
      ...checkoutApi,
      metadata: { ...checkoutApi.metadata, annotations: undefined },
      spec: {
        ...checkoutApi.spec,
        strategy: { type: 'Recreate' },
        template: {
          ...checkoutApi.spec.template,
          spec: { containers: checkoutApi.spec.template.spec.containers },
        },
      },
    }
    renderOverview({ deployment })
    expect(detail('Strategy')).toHaveTextContent(/^Recreate$/)
    expect(detail('Service account')).toHaveTextContent('default')
    expect(detail('Node selector')).toHaveTextContent('None')
    expect(detail('Annotations')).toHaveTextContent('None')
    expect(detail('Created')).toHaveTextContent(/^42d ago$/)
  })

  it('shows and hides the annotations', async () => {
    const user = userEvent.setup()
    renderOverview()
    const annotations = detail('Annotations')
    expect(annotations).toHaveTextContent('(2)')
    expect(within(annotations).queryByText(/kemo\.dev\/created-by/)).toBeNull()

    const show = within(annotations).getByRole('button', { name: 'Show annotations' })
    expect(show).toHaveAttribute('aria-expanded', 'false')
    await user.click(show)
    const hide = within(annotations).getByRole('button', { name: 'Hide annotations' })
    expect(hide).toHaveAttribute('aria-expanded', 'true')
    expect(within(annotations).getByText(/kemo\.dev\/created-by: Priya/)).toBeInTheDocument()
    expect(
      within(annotations).getByText(/deployment\.kubernetes\.io\/revision: 3/),
    ).toBeInTheDocument()

    await user.click(hide)
    expect(within(annotations).queryByText(/kemo\.dev\/created-by/)).toBeNull()
  })

  it('lists the conditions with their status', () => {
    renderOverview()
    const section = screen.getByRole('region', { name: 'Conditions' })
    const conditionRows = within(within(section).getByRole('table')).getAllByRole('row').slice(1)
    expect(conditionRows).toHaveLength(2)
    expect(conditionRows[0]).toHaveTextContent('Available')
    expect(conditionRows[0]).toHaveTextContent('True')
    expect(conditionRows[0]).toHaveTextContent('MinimumReplicasAvailable')
    expect(conditionRows[0]).toHaveTextContent('3h')
    expect(conditionRows[1]).toHaveTextContent('Progressing')
    expect(conditionRows[1]).toHaveTextContent('NewReplicaSetAvailable')
    expect(conditionRows[1]).toHaveTextContent('4m')
  })

  it("draws the related objects as one card, the table's own", () => {
    renderOverview()
    const section = relatedSection()
    expect(section.tagName).toBe('SECTION')
    expect(section).not.toHaveClass('card__root')
    expect(section.querySelectorAll('.card__root')).toHaveLength(1)
    expect(
      within(section).getByRole('heading', { level: 2, name: 'Related objects' }),
    ).toBeInTheDocument()
  })

  it('offers every related kind with its count and starts on Pods', () => {
    renderOverview()
    const kinds = within(relatedSection())
      .getAllByRole('radio')
      .map((radio) => radio.closest('label')?.textContent)
    expect(kinds).toEqual([
      'Pods 6',
      'ReplicaSets 2',
      'Services 1',
      'Ingresses 1',
      'ConfigMaps 1',
      'Secrets 2',
      'PVCs 0',
      'HPA 1',
      'Service account 1',
    ])
    expect(within(relatedSection()).getByRole('radio', { name: 'Pods 6' })).toBeChecked()
    expect(headers()).toEqual(['Name', 'Status', 'Restarts', 'Node', 'Age'])
    expect(within(relatedTable()).getAllByText('Running')).toHaveLength(5)
    expect(within(relatedTable()).getByText('Pending')).toBeInTheDocument()
  })

  it('switches the related table to the chosen kind', async () => {
    const user = userEvent.setup()
    renderOverview()
    await user.click(within(relatedSection()).getByRole('radio', { name: 'Services 1' }))
    expect(headers()).toEqual(['Name', 'Type', 'Cluster IP', 'Ports'])
    const service = within(relatedTable()).getAllByRole('row')[1]!
    expect(service).toHaveTextContent('checkout-api')
    expect(service).toHaveTextContent('ClusterIP')
    expect(service).toHaveTextContent('10.0.12.4')
    expect(service).toHaveTextContent('80/TCP, 443/TCP')

    await user.click(within(relatedSection()).getByRole('radio', { name: 'ReplicaSets 2' }))
    expect(headers()).toEqual(['Name', 'Desired', 'Ready', 'Age', 'Current'])
    const [, current, old] = within(relatedTable()).getAllByRole('row')
    expect(current).toHaveTextContent('checkout-api-7d9f')
    expect(within(current!).getByText('Current')).toBeInTheDocument()
    expect(old).toHaveTextContent('checkout-api-5c1a')
    expect(within(old!).getByText('Old')).toBeInTheDocument()

    await user.click(within(relatedSection()).getByRole('radio', { name: 'Secrets 2' }))
    expect(headers()).toEqual(['Name', 'Used as', 'Keys'])

    await user.click(within(relatedSection()).getByRole('radio', { name: 'HPA 1' }))
    expect(headers()).toEqual(['Name', 'Min', 'Max', 'Target', 'Current'])

    await user.click(within(relatedSection()).getByRole('radio', { name: 'Service account 1' }))
    expect(headers()).toEqual(['Name', 'Secrets', 'Roles'])
    expect(relatedTable()).toHaveTextContent('checkout-reader, metrics')
  })

  it('shows an empty state for a kind with no objects', async () => {
    const user = userEvent.setup()
    renderOverview()
    await user.click(within(relatedSection()).getByRole('radio', { name: 'PVCs 0' }))
    expect(headers()).toEqual(['Name', 'Status', 'Capacity', 'Storage class'])
    expect(
      within(relatedTable()).getByRole('cell', {
        name: 'No PVCs are related to this Deployment',
      }),
    ).toBeInTheDocument()
  })
})
