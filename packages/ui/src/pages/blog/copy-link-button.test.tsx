import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CopyLinkButton } from './copy-link-button'

function stubClipboard(writeText: unknown) {
  Object.defineProperty(navigator, 'clipboard', { value: writeText, configurable: true })
}

async function click() {
  await act(async () => {
    screen.getByRole('button').click()
  })
}

describe('CopyLinkButton', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    stubClipboard(undefined)
  })

  it('copies the page address and confirms, then reverts', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    stubClipboard({ writeText })
    render(<CopyLinkButton />)
    await click()
    expect(writeText).toHaveBeenCalledWith(window.location.href)
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('reports failure when the clipboard rejects', async () => {
    stubClipboard({ writeText: vi.fn().mockRejectedValue(new Error('denied')) })
    render(<CopyLinkButton />)
    await click()
    expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Copy failed')
  })

  it('reports failure when the clipboard API is missing', async () => {
    stubClipboard(undefined)
    render(<CopyLinkButton />)
    await click()
    expect(screen.getByRole('button', { name: 'Copy failed' })).toBeInTheDocument()
  })

  it('uses a custom label', () => {
    render(<CopyLinkButton label="Share" />)
    expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument()
  })

  it('clears its timer on unmount', async () => {
    stubClipboard({ writeText: vi.fn().mockResolvedValue(undefined) })
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = render(<CopyLinkButton />)
    await click()
    expect(vi.getTimerCount()).toBe(1)
    unmount()
    expect(vi.getTimerCount()).toBe(0)
    act(() => {
      vi.advanceTimersByTime(2000)
    })
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })
})
