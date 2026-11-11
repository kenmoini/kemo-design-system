import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../../test/layout'
import type { AuditEvent, AuditForwardingValues } from '../types'
import { AccessAudit, type AccessAuditProps } from './audit-tab'

const forwarding: AuditForwardingValues = {
  destination: 'splunk',
  format: 'json',
  endpoint: 'https://splunk.acme.dev:8088/services/collector',
  token: 'hec-token-123',
  include: ['signins', 'admin', 'api'],
  failedOnly: false,
  enabled: true,
}

const events: AuditEvent[] = [
  {
    id: 'a1',
    time: '14:02:11',
    method: 'POST',
    path: '/v1/deployments',
    actor: 'priya',
    status: 201,
    durationMs: 182,
    ip: '10.0.3.17',
    kind: 'api',
  },
  {
    id: 'a2',
    time: '14:02:03',
    method: 'GET',
    path: '/v1/services',
    actor: 'svc-ci-runner',
    status: 200,
    durationMs: 41,
    kind: 'api',
  },
  {
    id: 'a3',
    time: '14:01:48',
    method: 'DELETE',
    path: '/v1/users/88',
    actor: 'marcus',
    status: 403,
    durationMs: 12,
    kind: 'admin',
  },
  {
    id: 'a4',
    time: '14:01:30',
    method: 'PUT',
    path: '/v1/roles/viewer',
    actor: 'ken',
    status: 200,
    durationMs: 2400,
    kind: 'admin',
  },
  {
    id: 'a5',
    time: '14:01:02',
    method: 'GET',
    path: '/v1/audit',
    actor: 'sofia',
    status: 502,
    durationMs: 55,
    kind: 'api',
  },
]

function renderAudit(props: Partial<AccessAuditProps> = {}) {
  const handlers = { onSaveForwarding: vi.fn(), onSendTest: vi.fn() }
  render(
    <AccessAudit
      forwarding={forwarding}
      events={events}
      lastDeliveryAt="14:02:11"
      {...handlers}
      {...props}
    />,
  )
  return { ...handlers, ...props }
}

const form = () => screen.getByRole('form', { name: 'Forward the audit log' })

const streamItems = () => within(screen.getByRole('list')).getAllByRole('listitem')

async function choose(user: ReturnType<typeof userEvent.setup>, label: string, option: string) {
  await user.click(within(form()).getByRole('combobox', { name: label }))
  await user.click(await screen.findByRole('option', { name: option }))
}

beforeEach(() => {
  stubLayout()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('AccessAudit', () => {
  it('pre-fills the forwarding form', () => {
    renderAudit()
    expect(screen.getByRole('heading', { level: 2, name: 'Forward the audit log' })).toBeVisible()
    const f = form()
    expect(within(f).getByRole('combobox', { name: 'Destination' })).toHaveTextContent('Splunk HEC')
    expect(within(f).getByRole('combobox', { name: 'Format' })).toHaveTextContent('JSON')
    expect(within(f).getByRole('textbox', { name: 'Endpoint URL' })).toHaveValue(
      forwarding.endpoint,
    )
    expect(within(f).getByLabelText(/^Token/)).toHaveValue('hec-token-123')
    expect(within(f).getByLabelText(/^Token/)).toHaveAttribute('type', 'password')
    for (const name of ['Sign-ins', 'Admin changes', 'API calls']) {
      expect(within(f).getByRole('checkbox', { name })).toBeChecked()
    }
    expect(within(f).getByRole('checkbox', { name: 'Failed requests only' })).not.toBeChecked()
    expect(within(f).getByRole('switch', { name: 'Forwarding enabled' })).toBeChecked()
  })

  it('saves the forwarding values', async () => {
    const user = userEvent.setup()
    const { onSaveForwarding } = renderAudit()
    await choose(user, 'Format', 'CEF')
    await user.click(within(form()).getByRole('checkbox', { name: 'Failed requests only' }))
    await user.click(within(form()).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(onSaveForwarding).toHaveBeenCalledWith({
        ...forwarding,
        format: 'cef',
        failedOnly: true,
      }),
    )
  })

  it('checks the endpoint, the token and what to include before saving', async () => {
    const user = userEvent.setup()
    const { onSaveForwarding } = renderAudit()
    const f = form()
    const endpoint = within(f).getByRole('textbox', { name: 'Endpoint URL' })
    await user.clear(endpoint)
    await user.type(endpoint, 'splunk')
    await user.clear(within(f).getByLabelText(/^Token/))
    for (const name of ['Sign-ins', 'Admin changes', 'API calls']) {
      await user.click(within(f).getByRole('checkbox', { name }))
    }
    await user.click(within(f).getByRole('button', { name: 'Save' }))
    expect(await within(f).findByText('Enter a valid URL.')).toBeInTheDocument()
    expect(within(f).getByText('Enter the token.')).toBeInTheDocument()
    expect(within(f).getByText('Choose at least one kind of event.')).toBeInTheDocument()
    expect(onSaveForwarding).not.toHaveBeenCalled()
  })

  it('takes only http(s), tcp, udp, tls or s3 endpoints', async () => {
    const user = userEvent.setup()
    const { onSaveForwarding } = renderAudit()
    const endpoint = within(form()).getByRole('textbox', { name: 'Endpoint URL' })
    await user.clear(endpoint)
    await user.type(endpoint, 'javascript:alert(1)')
    await user.click(within(form()).getByRole('button', { name: 'Save' }))
    expect(
      await within(form()).findByText('Use an http(s), tcp, udp, tls or s3 URL.'),
    ).toBeInTheDocument()
    expect(onSaveForwarding).not.toHaveBeenCalled()

    await user.clear(endpoint)
    await user.type(endpoint, 'tls://siem.acme.dev:6514')
    await user.click(within(form()).getByRole('button', { name: 'Save' }))
    await waitFor(() =>
      expect(onSaveForwarding).toHaveBeenCalledWith({
        ...forwarding,
        endpoint: 'tls://siem.acme.dev:6514',
      }),
    )
  })

  it('gives focus back to Send test event when the wait took it away', async () => {
    const user = userEvent.setup()
    let finish: () => void = () => {}
    const onSendTest = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve
        }),
    )
    renderAudit({ onSendTest })
    const send = within(form()).getByRole('button', { name: 'Send test event' })
    send.focus()
    await user.keyboard('{Enter}')
    expect(onSendTest).toHaveBeenCalledTimes(1)
    // A browser drops focus from a button that becomes disabled; jsdom does not, so do it here.
    act(() => send.blur())
    expect(document.activeElement).toBe(document.body)
    await act(async () => finish())
    await waitFor(() => expect(send).toHaveFocus())
  })

  it('sends a test event and shows why one failed', async () => {
    const user = userEvent.setup()
    const onSendTest = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('Could not reach splunk.acme.dev:8088'))
    const { onSaveForwarding } = renderAudit({ onSendTest })
    const send = within(form()).getByRole('button', { name: 'Send test event' })
    await user.click(send)
    expect(onSendTest).toHaveBeenCalledTimes(1)
    expect(within(form()).queryByRole('alert')).not.toBeInTheDocument()

    await user.click(send)
    expect(await within(form()).findByRole('alert')).toHaveTextContent(
      'Could not reach splunk.acme.dev:8088',
    )
    expect(onSendTest).toHaveBeenCalledTimes(2)
    expect(onSaveForwarding).not.toHaveBeenCalled()
  })

  it('says when the last delivery was, or that there was none', () => {
    renderAudit()
    expect(screen.getByText('Last delivery 14:02:11')).toBeInTheDocument()
    cleanup()
    renderAudit({ lastDeliveryAt: undefined })
    expect(screen.getByText('Not yet delivered')).toBeInTheDocument()
    expect(screen.queryByText(/Last delivery/)).not.toBeInTheDocument()
  })

  it('shows each event on two lines with its tone', () => {
    renderAudit()
    const items = streamItems()
    expect(items).toHaveLength(5)
    expect(within(items[0]!).getByText('POST /v1/deployments')).toBeInTheDocument()
    expect(within(items[0]!).getByText('priya · 201 · 182 ms · 10.0.3.17')).toBeInTheDocument()
    expect(within(items[1]!).getByText('svc-ci-runner · 200 · 41 ms')).toBeInTheDocument()
    // A second or more reads as seconds, to one decimal.
    expect(within(items[3]!).getByText('ken · 200 · 2.4 s')).toBeInTheDocument()
    expect(items[0]).toHaveTextContent('Info:')
    expect(items[2]).toHaveTextContent('Warning:')
    expect(items[3]).toHaveTextContent('Success:')
    expect(items[4]).toHaveTextContent('Critical:')
  })

  it('narrows the stream with the segment filter', async () => {
    const user = userEvent.setup()
    renderAudit()
    const filter = screen.getByRole('radiogroup', { name: 'Show' })
    expect(within(filter).getByRole('radio', { name: 'All' })).toBeChecked()

    await user.click(within(filter).getByRole('radio', { name: '4xx–5xx' }))
    expect(streamItems().map((item) => within(item).getByText(/^[A-Z]+ \//).textContent)).toEqual([
      'DELETE /v1/users/88',
      'GET /v1/audit',
    ])

    await user.click(within(filter).getByRole('radio', { name: 'Admin' }))
    expect(streamItems().map((item) => within(item).getByText(/^[A-Z]+ \//).textContent)).toEqual([
      'DELETE /v1/users/88',
      'PUT /v1/roles/viewer',
    ])

    await user.click(within(filter).getByRole('radio', { name: 'All' }))
    expect(streamItems()).toHaveLength(5)
  })

  it('says so when no event matches the filter', async () => {
    const user = userEvent.setup()
    renderAudit({ events: events.filter((event) => event.status < 400) })
    await user.click(screen.getByRole('radio', { name: '4xx–5xx' }))
    expect(screen.getByText('No events match this filter yet.')).toBeInTheDocument()
  })

  it('announces the stream and says it is live only when live', () => {
    renderAudit()
    expect(screen.getByRole('list').closest('[role="status"]')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'API audit stream' })).toBeVisible()
    cleanup()
    renderAudit({ live: true })
    const region = screen.getByRole('list').closest('[role="status"]')
    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByRole('heading', { level: 2, name: 'API audit stream · live' })).toBeVisible()
  })

  it('lets a keyboard reach the stream and pause it', async () => {
    const user = userEvent.setup()
    const onStreamPauseChange = vi.fn()
    renderAudit({ live: true, onStreamPauseChange })
    const region = screen.getByRole('region', { name: 'API audit stream' })
    expect(region).toContainElement(screen.getByRole('list'))

    // Tab through the forwarding form until the stream's region has focus.
    for (let i = 0; i < 30 && document.activeElement !== region; i++) await user.tab()
    expect(region).toHaveFocus()
    expect(onStreamPauseChange).toHaveBeenCalledTimes(1)
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(true)
  })

  it('asks to pause the stream while the pointer or focus is on its card only', async () => {
    const user = userEvent.setup()
    const onStreamPauseChange = vi.fn()
    renderAudit({ live: true, onStreamPauseChange })
    const streamTitle = screen.getByRole('heading', { level: 2, name: /^API audit stream/ })

    // The forwarding form is not the stream: reading or typing there keeps it live.
    await user.hover(screen.getByRole('heading', { level: 2, name: 'Forward the audit log' }))
    act(() => within(form()).getByRole('textbox', { name: 'Endpoint URL' }).focus())
    expect(onStreamPauseChange).not.toHaveBeenCalled()

    await user.hover(streamTitle)
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(true)
    await user.unhover(streamTitle)
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(false)

    // Focus inside the card pauses it; a move within the card does not resume it.
    act(() => screen.getByRole('radio', { name: 'All' }).focus())
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(true)
    act(() => screen.getByRole('radio', { name: 'Admin' }).focus())
    expect(onStreamPauseChange).toHaveBeenCalledTimes(3)
    act(() => within(form()).getByRole('textbox', { name: 'Endpoint URL' }).focus())
    expect(onStreamPauseChange).toHaveBeenLastCalledWith(false)
    expect(onStreamPauseChange).toHaveBeenCalledTimes(4)
  })
})
