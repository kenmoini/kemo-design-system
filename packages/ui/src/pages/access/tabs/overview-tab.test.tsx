import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { ActivityItem, EventStreamEvent, StatCardProps } from '../../../widgets'
import { AccessOverview } from './overview-tab'

const stats: StatCardProps[] = [
  {
    label: 'Internal users',
    value: '231',
    delta: { value: '4', direction: 'up', tone: 'good', suffix: 'this week' },
  },
  { label: 'Groups', value: '18' },
  {
    label: 'OIDC users',
    value: '412',
    delta: { value: '37', direction: 'up', tone: 'good', suffix: 'synced today' },
  },
  { label: 'Active sessions', value: '57' },
]

const signIns: ActivityItem[] = [
  {
    id: 's1',
    actor: 'Priya Natarajan',
    initials: 'PN',
    action: 'signed in via Okta',
    when: '4 min ago',
  },
  {
    id: 's2',
    actor: 'Marcus Lee',
    initials: 'ML',
    action: 'signed in with password',
    when: '22 min ago',
  },
  {
    id: 's3',
    actor: 'Lena Fischer',
    initials: 'LF',
    action: 'failed sign-in (locked)',
    when: '5 h ago',
  },
]

const apiCalls: EventStreamEvent[] = [
  { id: 'c1', time: '14:02:11', tone: 'good', text: 'POST /v1/deployments · priya · 201' },
  { id: 'c2', time: '14:02:03', tone: 'info', text: 'GET /v1/services · svc-ci-runner · 200' },
  { id: 'c3', time: '14:01:48', tone: 'critical', text: 'DELETE /v1/users/88 · marcus · 403' },
]

describe('AccessOverview', () => {
  it('shows the four stats', () => {
    render(<AccessOverview stats={stats} signIns={signIns} apiCalls={apiCalls} />)
    for (const stat of stats) {
      expect(screen.getByText(stat.label)).toBeInTheDocument()
      expect(screen.getByText(stat.value)).toBeInTheDocument()
    }
    expect(screen.getAllByTestId('stat-delta')).toHaveLength(2)
  })

  it('lists the sign-ins under their heading', () => {
    render(<AccessOverview stats={stats} signIns={signIns} apiCalls={apiCalls} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Sign-ins · last 24 h' })).toBeVisible()
    for (const item of signIns) {
      expect(screen.getByText(item.actor)).toBeInTheDocument()
    }
    expect(screen.getByText('failed sign-in (locked)')).toBeInTheDocument()
  })

  it('shows the authenticated API calls in a stream', () => {
    render(<AccessOverview stats={stats} signIns={signIns} apiCalls={apiCalls} />)
    expect(screen.getByRole('heading', { level: 2, name: 'Authenticated API calls' })).toBeVisible()
    const lists = screen.getAllByRole('list')
    const stream = lists.find((list) => list.tagName === 'OL')
    expect(stream).toBeDefined()
    const items = within(stream!).getAllByRole('listitem')
    expect(items).toHaveLength(3)
    expect(items[0]).toHaveTextContent('POST /v1/deployments · priya · 201')
    expect(items[2]).toHaveTextContent('Critical: DELETE /v1/users/88 · marcus · 403')
  })

  it('announces the stream and says it is live only when live', () => {
    const { rerender } = render(
      <AccessOverview stats={stats} signIns={signIns} apiCalls={apiCalls} />,
    )
    expect(screen.queryByRole('status')).not.toBeInTheDocument()

    rerender(<AccessOverview stats={stats} signIns={signIns} apiCalls={apiCalls} live />)
    expect(screen.getByRole('status')).toHaveTextContent('GET /v1/services · svc-ci-runner · 200')
    expect(
      screen.getByRole('heading', { level: 2, name: 'Authenticated API calls · live' }),
    ).toBeVisible()
  })

  it('lets a keyboard reach the calls and pause them', async () => {
    const user = userEvent.setup()
    const onStreamPauseChange = vi.fn()
    render(
      <>
        <AccessOverview
          stats={stats}
          signIns={signIns}
          apiCalls={apiCalls}
          live
          onStreamPauseChange={onStreamPauseChange}
        />
        <button type="button">After</button>
      </>,
    )
    const region = screen.getByRole('region', { name: 'Authenticated API calls' })
    expect(region).toContainElement(screen.getByText('POST /v1/deployments · priya · 201'))

    await user.tab()
    expect(region).toHaveFocus()
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(true)
    await user.tab()
    expect(screen.getByRole('button', { name: 'After' })).toHaveFocus()
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(false)
  })

  it('asks to pause the calls only while the pointer is over their card', async () => {
    const user = userEvent.setup()
    const onStreamPauseChange = vi.fn()
    const { unmount } = render(
      <AccessOverview
        stats={stats}
        signIns={signIns}
        apiCalls={apiCalls}
        live
        onStreamPauseChange={onStreamPauseChange}
      />,
    )
    const signInsTitle = screen.getByRole('heading', { level: 2, name: /^Sign-ins/ })
    const callsTitle = screen.getByRole('heading', { level: 2, name: /^Authenticated API calls/ })

    await user.hover(signInsTitle)
    expect(onStreamPauseChange).not.toHaveBeenCalled()
    await user.hover(callsTitle)
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(true)
    // A move within the card (user-event's hover would leave the page in between, as no browser
    // does): the pointer leaves the title for a call, and the card stays entered.
    const call = screen.getByText('POST /v1/deployments · priya · 201')
    fireEvent.pointerOut(callsTitle, { relatedTarget: call })
    fireEvent.pointerOver(call, { relatedTarget: callsTitle })
    expect(onStreamPauseChange).toHaveBeenCalledTimes(1)
    await user.unhover(callsTitle)
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(false)

    // A card that goes away while paused hands the stream back.
    await user.hover(callsTitle)
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(true)
    unmount()
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(false)
  })
})
