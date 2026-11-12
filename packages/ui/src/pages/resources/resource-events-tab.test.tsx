import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { K8sEvent } from '../../lib/kubernetes'
import { ResourceEventsTab } from './resource-events-tab'
import type { ResourceEventsTabProps } from './types'

const now = '2026-11-12T12:00:00Z'

function event(
  id: string,
  type: K8sEvent['type'],
  reason: string,
  kind: K8sEvent['involvedObject']['kind'],
  name: string,
  lastSeen: string,
  count = 1,
): K8sEvent {
  return {
    id,
    type,
    reason,
    message: `${reason} on ${name}`,
    involvedObject: { kind, name },
    count,
    firstSeen: lastSeen,
    lastSeen,
  }
}

// Out of order on purpose: the table sorts by last seen, newest first.
const events: K8sEvent[] = [
  event('e3', 'Warning', 'Unhealthy', 'Pod', 'web-7d9f-b81mn', '2026-11-12T11:54:00Z', 3),
  event('e5', 'Normal', 'ScalingReplicaSet', 'Deployment', 'web', '2026-11-12T09:00:00Z'),
  event('e1', 'Normal', 'ScalingReplicaSet', 'Deployment', 'web', '2026-11-12T11:56:00Z'),
  event('e4', 'Warning', 'FailedScheduling', 'Pod', 'web-7d9f-q0ls2', '2026-11-12T11:51:00Z', 2),
  event('e2', 'Normal', 'SuccessfulCreate', 'ReplicaSet', 'web-7d9f', '2026-11-12T11:55:00Z'),
]

function renderEvents(props: Partial<ResourceEventsTabProps> = {}) {
  const element = (extra: Partial<ResourceEventsTabProps> = {}) => (
    <ResourceEventsTab events={events} now={now} {...props} {...extra} />
  )
  const utils = render(element())
  return { rerender: (extra: Partial<ResourceEventsTabProps>) => utils.rerender(element(extra)) }
}

const bodyRows = () => screen.getAllByRole('row').slice(1)
const cellTexts = (row: HTMLElement) =>
  within(row)
    .getAllByRole('cell')
    .map((cell) => cell.textContent)
const reasons = () => bodyRows().map((row) => cellTexts(row)[1])

describe('ResourceEventsTab', () => {
  it('lists the events newest first with type badges, the object and the last seen age', () => {
    renderEvents()
    expect(screen.getAllByRole('columnheader').map((h) => h.textContent)).toEqual([
      'Type',
      'Reason',
      'Message',
      'Object',
      'Count',
      'Last seen',
    ])
    expect(reasons()).toEqual([
      'ScalingReplicaSet',
      'SuccessfulCreate',
      'Unhealthy',
      'FailedScheduling',
      'ScalingReplicaSet',
    ])
    expect(cellTexts(bodyRows()[0]!)).toEqual([
      'Normal',
      'ScalingReplicaSet',
      'ScalingReplicaSet on web',
      'deployment/web',
      '1',
      '4m',
    ])
    expect(cellTexts(bodyRows()[2]!)).toEqual([
      'Warning',
      'Unhealthy',
      'Unhealthy on web-7d9f-b81mn',
      'pod/web-7d9f-b81mn',
      '3',
      '6m',
    ])
    expect(cellTexts(bodyRows()[4]!)[5]).toBe('3h')
    expect(screen.getByRole('columnheader', { name: /Last seen/ })).toHaveAttribute(
      'aria-sort',
      'descending',
    )
  })

  it('counts the types and narrows to warnings', async () => {
    const user = userEvent.setup()
    renderEvents()
    expect(screen.getByRole('radio', { name: 'All 5' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Warning 2' }))
    expect(reasons()).toEqual(['Unhealthy', 'FailedScheduling'])
    await user.click(screen.getByRole('radio', { name: 'All 5' }))
    expect(bodyRows()).toHaveLength(5)
  })

  it('hides the ReplicaSet and Pod rows for "Deployment only"', async () => {
    const user = userEvent.setup()
    renderEvents()
    expect(screen.getByRole('radio', { name: 'Deployment + children' })).toBeChecked()
    await user.click(screen.getByRole('radio', { name: 'Deployment only' }))
    expect(bodyRows().map((row) => cellTexts(row)[3])).toEqual(['deployment/web', 'deployment/web'])
    // The type counts follow the scope.
    expect(screen.getByRole('radio', { name: 'All 2' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Warning 0' })).toBeInTheDocument()
  })

  it('names the scope after the parent kind and counts childKinds as its children', () => {
    renderEvents({ parentKind: 'Rollout', childKinds: ['ReplicaSet'] })
    expect(screen.getByRole('radio', { name: 'Rollout + children' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Rollout only' })).toBeInTheDocument()
    // Neither Deployment nor Pod events belong to a Rollout and its ReplicaSets.
    expect(reasons()).toEqual(['SuccessfulCreate'])
  })

  it('has no streaming note unless live', () => {
    renderEvents()
    expect(screen.queryByText(/streaming/)).toBeNull()
  })

  it('streams when live and holds the rows still while the reader is on the table', async () => {
    const user = userEvent.setup()
    const onPauseChange = vi.fn()
    const { rerender } = renderEvents({ live: true, onPauseChange })
    const note = screen.getByRole('status')
    expect(note).toHaveTextContent('● streaming · paused on hover')
    const region = screen.getByRole('region', { name: 'Events' })
    expect(region).toHaveAttribute('tabindex', '0')

    await user.hover(region)
    expect(onPauseChange).toHaveBeenLastCalledWith(true)
    expect(note).toHaveTextContent('● paused')
    const fresh = event('e6', 'Warning', 'BackOff', 'Pod', 'web-7d9f-x2k4q', '2026-11-12T11:59:00Z')
    rerender({ events: [fresh, ...events] })
    expect(bodyRows()).toHaveLength(5)

    await user.unhover(region)
    expect(onPauseChange).toHaveBeenLastCalledWith(false)
    expect(note).toHaveTextContent('● streaming · paused on hover')
    expect(reasons()[0]).toBe('BackOff')
  })
})
