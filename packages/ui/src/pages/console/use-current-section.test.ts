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
})

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
})
