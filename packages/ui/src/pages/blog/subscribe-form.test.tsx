import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SubscribeForm } from './subscribe-form'

describe('SubscribeForm', () => {
  it('rejects an invalid address without calling the host', async () => {
    const user = userEvent.setup()
    const onSubscribe = vi.fn()
    render(<SubscribeForm onSubscribe={onSubscribe} />)
    await user.type(screen.getByLabelText('Email'), 'nope')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument()
    expect(onSubscribe).not.toHaveBeenCalled()
  })

  it('shows the pending state then the confirmation', async () => {
    const user = userEvent.setup()
    let resolve!: () => void
    const onSubscribe = vi.fn(() => new Promise<void>((r) => (resolve = r)))
    render(<SubscribeForm onSubscribe={onSubscribe} />)
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(onSubscribe).toHaveBeenCalledWith('ada@example.com')
    await user.click(screen.getByRole('button', { name: /Subscribe/ }))
    expect(onSubscribe).toHaveBeenCalledOnce()
    resolve()
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Thanks. Check ada@example.com to confirm.',
    )
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument()
  })

  it('moves focus to the confirmation when it replaces the form', async () => {
    const user = userEvent.setup()
    render(<SubscribeForm onSubscribe={() => Promise.resolve()} />)
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    const status = await screen.findByRole('status')
    await waitFor(() => expect(status).toHaveFocus())
    expect(status).toHaveAttribute('tabindex', '-1')
  })

  it('keeps the form and shows the reason when the host rejects', async () => {
    const user = userEvent.setup()
    render(<SubscribeForm onSubscribe={() => Promise.reject(new Error('Address blocked'))} />)
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Address blocked')
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com')
  })

  it('falls back to a generic message for a non-Error rejection', async () => {
    const user = userEvent.setup()
    render(<SubscribeForm onSubscribe={() => Promise.reject('nope')} />)
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Something went wrong. Try again.')
  })
})
