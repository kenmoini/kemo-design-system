import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { matchMediaStub, resetMedia } from './media'

// jsdom has neither; Recharts and responsive components need them.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
// jsdom has no IntersectionObserver either; Zag's scroll area watches the viewport with it.
if (!('IntersectionObserver' in globalThis)) {
  globalThis.IntersectionObserver = class IntersectionObserver {
    readonly root = null
    readonly rootMargin = '0px'
    readonly scrollMargin = '0px'
    readonly thresholds = [0]
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() {
      return []
    }
  }
}
window.matchMedia = matchMediaStub
// jsdom does not scroll elements; Ark's Select scrolls its list to the top when it opens.
if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = () => {}
}

// jsdom has no layout: CodeMirror measures text through Range rects, so give it empty ones.
if (typeof Range.prototype.getClientRects !== 'function') {
  const rect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 })
  Range.prototype.getBoundingClientRect = () => ({ ...rect(), toJSON: rect }) as DOMRect
  Range.prototype.getClientRects = () =>
    Object.assign([], { item: () => null }) as unknown as DOMRectList
}

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(() => {
  cleanup()
  resetMedia()
})
