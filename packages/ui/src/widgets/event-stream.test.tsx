import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { EventStream, type EventStreamEvent } from './event-stream'

// Plain strings, so each item's text can be matched as it is.
const events: (EventStreamEvent & { text: string })[] = [
  {
    id: 'e5',
    time: '14:02:11',
    tone: 'critical',
    text: 'Alert fired: p95 latency over 300 ms on checkout-api',
  },
  { id: 'e4', time: '14:01:48', tone: 'info', text: 'checkout-api v2.14.0 promoted to 100%' },
  {
    id: 'e3',
    time: '13:58:05',
    tone: 'warning',
    text: 'Node ip-10-0-3-17 reported memory pressure',
  },
  {
    id: 'e2',
    time: '13:55:30',
    tone: 'info',
    text: 'Autoscaler added 2 replicas to search-indexer',
  },
  { id: 'e1', time: '13:41:02', tone: 'good', text: 'Incident INC-412 resolved by Sofia' },
]

describe('EventStream', () => {
  it('renders the events in the given order', () => {
    render(<EventStream events={events} />)
    // listStyle none drops the implicit list role in Safari/VoiceOver, so it is set explicitly.
    expect(screen.getByRole('list')).toHaveAttribute('role', 'list')
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(5)
    items.forEach((item, i) => {
      expect(item).toHaveTextContent(events[i]!.time)
      expect(item).toHaveTextContent(events[i]!.text)
    })
  })

  it('announces new events politely only when live', () => {
    const { rerender } = render(<EventStream events={events} />)
    expect(screen.queryByRole('status', { name: 'Events' })).not.toBeInTheDocument()
    rerender(<EventStream events={events} live />)
    const region = screen.getByRole('status', { name: 'Events' })
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'false')
  })

  it('renders rich text: an element instead of a string', () => {
    render(
      <EventStream
        events={[
          {
            id: 'r1',
            time: '14:02:11',
            tone: 'warning',
            text: (
              <>
                <strong>DELETE /v1/users/88</strong>
                <span>marcus · 403 · 12 ms</span>
              </>
            ),
          },
        ]}
      />,
    )
    const item = screen.getByRole('listitem')
    expect(within(item).getByText('DELETE /v1/users/88').tagName).toBe('STRONG')
    expect(within(item).getByText('marcus · 403 · 12 ms')).toBeInTheDocument()
    expect(item).toHaveTextContent('Warning: DELETE /v1/users/88')
  })

  describe('pause control', () => {
    const newer: EventStreamEvent = { id: 'e6', time: '14:03:00', tone: 'info', text: 'Newest' }
    // The toggle's live region: the status that is not the Events list.
    const toggleStatus = () => {
      const [status, ...rest] = screen
        .getAllByRole('status')
        .filter((el) => el.getAttribute('aria-label') !== 'Events')
      expect(rest).toHaveLength(0)
      return status!
    }

    it('is absent unless the stream is live', () => {
      render(<EventStream events={events} />)
      expect(screen.queryByRole('button', { name: 'Pause' })).not.toBeInTheDocument()
    })

    it('toggles Pause and Resume with aria-pressed and a Paused or Live status', async () => {
      const user = userEvent.setup()
      render(<EventStream events={events} live />)
      const toggle = screen.getByRole('button', { name: 'Pause' })
      expect(toggle).toHaveAttribute('aria-pressed', 'false')
      const status = toggleStatus()
      expect(status).toHaveTextContent(/^Live$/)
      await user.click(toggle)
      const resume = screen.getByRole('button', { name: 'Resume' })
      expect(resume).toHaveAttribute('aria-pressed', 'true')
      expect(toggleStatus()).toBe(status)
      expect(status).toHaveTextContent(/^Paused$/)
      expect(screen.queryByText('Live')).not.toBeInTheDocument()
    })

    it('renders no new rows while paused and shows them on resume', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<EventStream events={events} live />)
      await user.click(screen.getByRole('button', { name: 'Pause' }))
      rerender(<EventStream events={[newer, ...events]} live />)
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
      expect(screen.queryByText('Newest')).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: 'Resume' }))
      expect(screen.getAllByRole('listitem')).toHaveLength(6)
      expect(screen.getByText('Newest')).toBeInTheDocument()
    })

    it('still holds the list while the pointer is over it', async () => {
      const user = userEvent.setup()
      const { rerender } = render(<EventStream events={events} live />)
      await user.hover(screen.getAllByRole('listitem')[0]!)
      expect(screen.getByText('Paused while you read')).toBeVisible()
      rerender(<EventStream events={[newer, ...events]} live />)
      expect(screen.getAllByRole('listitem')).toHaveLength(5)
      await user.unhover(screen.getAllByRole('listitem')[0]!)
      expect(screen.getAllByRole('listitem')).toHaveLength(6)
    })

    it('shows the reader hold without announcing it, and announces only the toggle', async () => {
      const user = userEvent.setup()
      render(<EventStream events={events} live />)
      const status = toggleStatus()
      await user.hover(screen.getAllByRole('listitem')[0]!)
      // A pointer pass changes what is shown, not what the live region says.
      const hold = screen.getByText('Paused while you read')
      expect(hold).toHaveAttribute('aria-hidden', 'true')
      expect(status).not.toContainElement(hold)
      expect(status).toHaveTextContent(/^Live$/)
      expect(toggleStatus()).toBe(status)
      await user.click(screen.getByRole('button', { name: 'Pause' }))
      expect(status).toHaveTextContent(/^Paused$/)
      expect(screen.queryByText('Paused while you read')).not.toBeInTheDocument()
      await user.unhover(screen.getAllByRole('listitem')[0]!)
      await user.click(screen.getByRole('button', { name: 'Resume' }))
      expect(status).toHaveTextContent(/^Live$/)
      expect(toggleStatus()).toBe(status)
    })

    it('lets a host own the state with paused and onPausedChange', async () => {
      const user = userEvent.setup()
      const seen: boolean[] = []
      function Host() {
        const [paused, setPaused] = useState(true)
        return (
          <EventStream
            events={events}
            live
            paused={paused}
            onPausedChange={(next) => {
              seen.push(next)
              setPaused(next)
            }}
          />
        )
      }
      render(<Host />)
      expect(screen.getByRole('button', { name: 'Resume' })).toHaveAttribute('aria-pressed', 'true')
      await user.click(screen.getByRole('button', { name: 'Resume' }))
      expect(seen).toEqual([false])
      expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    })
  })
})
