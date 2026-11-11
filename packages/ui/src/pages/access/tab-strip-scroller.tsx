'use client'
import { type ReactNode, useEffect, useRef } from 'react'
import { Box } from '../../../styled-system/jsx'

/**
 * The tab strip's sideways scroller. Its padding (cancelled by a negative margin) leaves room for
 * the triggers' outside focus ring, which an overflow box would otherwise clip; the route's tab
 * is scrolled into view, so a deep link on a narrow screen shows its tab.
 */
export function TabStripScroller({
  activeTab,
  children,
}: {
  activeTab: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const selected = ref.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')
    // jsdom has no scrollIntoView.
    if (typeof selected?.scrollIntoView === 'function') {
      selected.scrollIntoView({ inline: 'nearest', block: 'nearest' })
    }
  }, [activeTab])
  return (
    <Box ref={ref} overflowX="auto" scrollbarWidth="none" p="1" m="-1">
      {children}
    </Box>
  )
}
