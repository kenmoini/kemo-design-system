import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TabStripScroller } from './tab-strip-scroller'

function renderStrip() {
  const { container } = render(
    <TabStripScroller activeTab="users">
      <div role="tab" aria-selected="true">
        Users
      </div>
    </TabStripScroller>,
  )
  return container.querySelector('[role="tab"]')!.parentElement as HTMLElement
}

const fade = () => screen.queryByTestId('tab-strip-fade')

/** jsdom has no layout: give the scroller a width, a content width and a scroll offset. */
function measure(
  strip: HTMLElement,
  {
    scrollWidth,
    clientWidth,
    scrollLeft,
  }: { scrollWidth: number; clientWidth: number; scrollLeft: number },
) {
  vi.spyOn(strip, 'scrollWidth', 'get').mockReturnValue(scrollWidth)
  vi.spyOn(strip, 'clientWidth', 'get').mockReturnValue(clientWidth)
  vi.spyOn(strip, 'scrollLeft', 'get').mockReturnValue(scrollLeft)
}

describe('TabStripScroller', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows no fade while the strip fits', () => {
    const strip = renderStrip()
    measure(strip, { scrollWidth: 300, clientWidth: 300, scrollLeft: 0 })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(fade()).toBeNull()
  })

  it('fades the trailing edge while it overflows and drops the fade at the end', () => {
    const strip = renderStrip()
    measure(strip, { scrollWidth: 900, clientWidth: 300, scrollLeft: 0 })
    act(() => {
      window.dispatchEvent(new Event('resize'))
    })
    expect(fade()).toBeInTheDocument()
    expect(fade()).toHaveAttribute('aria-hidden', 'true')

    measure(strip, { scrollWidth: 900, clientWidth: 300, scrollLeft: 600 })
    act(() => {
      strip.dispatchEvent(new Event('scroll'))
    })
    expect(fade()).toBeNull()
  })
})
