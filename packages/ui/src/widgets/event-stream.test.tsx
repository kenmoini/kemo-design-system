import { render, screen, within } from '@testing-library/react'
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
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    rerender(<EventStream events={events} live />)
    const region = screen.getByRole('status')
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
})
