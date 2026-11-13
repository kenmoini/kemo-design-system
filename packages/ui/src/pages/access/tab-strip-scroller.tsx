'use client'
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react'
import { Box } from '../../../styled-system/jsx'

/**
 * The tab strip's sideways scroller. Its padding (cancelled by a negative margin) leaves room for
 * the triggers' outside focus ring, which an overflow box would otherwise clip; the route's tab
 * is scrolled into view, so a deep link on a narrow screen shows its tab. A fade on the trailing
 * edge says there is more, while the strip overflows and is not scrolled to its end.
 */
export function TabStripScroller({
  activeTab,
  children,
}: {
  activeTab: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [more, setMore] = useState(false)
  const measure = useCallback(() => {
    const strip = ref.current
    if (strip) setMore(strip.scrollWidth > strip.clientWidth + strip.scrollLeft + 1)
  }, [])
  useEffect(() => {
    const selected = ref.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    // jsdom has no scrollIntoView.
    if (typeof selected?.scrollIntoView === 'function') {
      selected.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    }
    measure()
  }, [activeTab, measure])
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])
  return (
    <Box position="relative">
      <Box ref={ref} overflowX="auto" scrollbarWidth="none" p="1" m="-1" onScroll={measure}>
        {children}
      </Box>
      {more ? (
        <Box
          data-testid="tab-strip-fade"
          aria-hidden
          position="absolute"
          insetBlock="0"
          insetInlineEnd="0"
          w="10"
          pointerEvents="none"
          bgGradient="to-r"
          gradientFrom="transparent"
          gradientTo="canvas"
        />
      ) : null}
    </Box>
  )
}
