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
window.matchMedia = matchMediaStub
// jsdom does not scroll elements; Ark's Select scrolls its list to the top when it opens.
if (typeof Element.prototype.scrollTo !== 'function') {
  Element.prototype.scrollTo = () => {}
}

// Vitest globals are off, so Testing Library cannot register its automatic cleanup.
afterEach(() => {
  cleanup()
  resetMedia()
})
