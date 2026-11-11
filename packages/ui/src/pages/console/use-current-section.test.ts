import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCurrentSection } from './use-current-section'

type Entry = Pick<IntersectionObserverEntry, 'target' | 'isIntersecting'>

/** The last observer the hook created, with its callback and the elements it watches. */
let observer: { fire: (entries: Entry[]) => void; observed: Element[]; disconnect: () => void }

class IntersectionObserverStub {
  observed: Element[] = []
  disconnect = vi.fn()
  constructor(callback: (entries: Entry[]) => void) {
    observer = { fire: callback, observed: this.observed, disconnect: this.disconnect }
  }
  observe(element: Element) {
    this.observed.push(element)
  }
  unobserve() {}
  takeRecords() {
    return []
  }
}

const ids = ['topic-a', 'topic-b', 'topic-c']
const section = (id: string) => document.getElementById(id) as HTMLElement
const original = Object.getOwnPropertyDescriptor(globalThis, 'IntersectionObserver')

beforeEach(() => {
  for (const id of ids) {
    const element = document.createElement('section')
    element.id = id
    document.body.append(element)
  }
  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    writable: true,
    value: IntersectionObserverStub,
  })
})

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'IntersectionObserver', original)
  else delete (globalThis as { IntersectionObserver?: unknown }).IntersectionObserver
  document.body.replaceChildren()
  window.history.replaceState(null, '', window.location.pathname)
  vi.restoreAllMocks()
})

/** Points the URL at `hash` and fires `hashchange`, as a click on an anchor link does. */
const navigate = (hash: string) =>
  act(() => {
    window.history.replaceState(null, '', hash)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  })

/** Scrolls the window to `y` and fires `scroll`. */
const scrollWindowTo = (y: number) =>
  act(() => {
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(y)
    window.dispatchEvent(new Event('scroll'))
  })

/** Places a section's top `top` px below the top of the viewport. */
const placeTop = (id: string, top: number) =>
  vi.spyOn(section(id), 'getBoundingClientRect').mockReturnValue({ top } as DOMRect)

describe('useCurrentSection', () => {
  it('follows the intersecting section, keeps the last one between sections and disconnects', () => {
    const { result, unmount } = renderHook(() => useCurrentSection(ids))
    expect(result.current).toBe('topic-a')
    expect(observer.observed.map((element) => element.id)).toEqual(ids)

    act(() =>
      observer.fire([
        { target: section('topic-a'), isIntersecting: false },
        { target: section('topic-b'), isIntersecting: true },
        { target: section('topic-c'), isIntersecting: false },
      ]),
    )
    expect(result.current).toBe('topic-b')

    act(() => observer.fire([{ target: section('topic-b'), isIntersecting: false }]))
    expect(result.current).toBe('topic-b')

    unmount()
    expect(observer.disconnect).toHaveBeenCalledTimes(1)
  })

  it('follows a hashchange to `#topic-{id}` or `#{id}` and ignores any other hash', () => {
    const { result } = renderHook(() => useCurrentSection(['overview', 'billing']))
    expect(result.current).toBe('overview')

    navigate('#topic-billing')
    expect(result.current).toBe('billing')

    navigate('#overview')
    expect(result.current).toBe('overview')

    navigate('#q-invoice')
    expect(result.current).toBe('overview')

    navigate('#%E0%A4%A')
    expect(result.current).toBe('overview')
  })

  it('reads the hash on mount and holds it against intersections until the reader scrolls', () => {
    window.history.replaceState(null, '', '#topic-c')
    const { result, unmount } = renderHook(() => useCurrentSection(ids))
    expect(result.current).toBe('topic-c')

    // The page is too short to bring topic-c to the top, so an earlier section fills the band.
    act(() => observer.fire([{ target: section('topic-b'), isIntersecting: true }]))
    expect(result.current).toBe('topic-c')

    // The anchor jump's own scroll event, where it landed, keeps the hold.
    scrollWindowTo(0)
    act(() => observer.fire([{ target: section('topic-a'), isIntersecting: true }]))
    expect(result.current).toBe('topic-c')

    // The reader scrolling away releases it.
    scrollWindowTo(120)
    act(() => observer.fire([{ target: section('topic-a'), isIntersecting: false }]))
    expect(result.current).toBe('topic-b')

    // A later hashchange holds again.
    navigate('#topic-c')
    expect(result.current).toBe('topic-c')
    act(() => observer.fire([{ target: section('topic-a'), isIntersecting: true }]))
    expect(result.current).toBe('topic-c')

    const removed = vi.spyOn(window, 'removeEventListener')
    unmount()
    expect(removed.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(['hashchange', 'scroll']),
    )
  })

  it('prefers the crossing section whose top is nearest the offset, the earlier on a tie', () => {
    const { result } = renderHook(() => useCurrentSection(ids))

    // topic-a still crosses the band, but topic-b was scrolled to the top.
    placeTop('topic-a', -240)
    placeTop('topic-b', 56)
    act(() =>
      observer.fire([
        { target: section('topic-a'), isIntersecting: true },
        { target: section('topic-b'), isIntersecting: true },
      ]),
    )
    expect(result.current).toBe('topic-b')

    placeTop('topic-b', 36)
    placeTop('topic-c', 76)
    act(() =>
      observer.fire([
        { target: section('topic-a'), isIntersecting: false },
        { target: section('topic-c'), isIntersecting: true },
      ]),
    )
    expect(result.current).toBe('topic-b')
  })
})
