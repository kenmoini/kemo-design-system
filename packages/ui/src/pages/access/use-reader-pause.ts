'use client'
import { type FocusEvent, useEffect, useRef } from 'react'

/**
 * Handlers for the card around a live stream: `onPauseChange(true)` once the pointer is over the
 * card or focus is inside it, `false` once both have left (or the card unmounts while paused), so
 * the host can stop the stream changing under a reader (WCAG 2.2.2). Spread them on the card.
 */
export function useReaderPause(onPauseChange?: (paused: boolean) => void) {
  const reader = useRef({ hovered: false, focused: false })
  const report = useRef(onPauseChange)
  useEffect(() => {
    report.current = onPauseChange
  })
  useEffect(() => {
    const current = reader
    return () => {
      const { hovered, focused } = current.current
      if (hovered || focused) report.current?.(false)
    }
  }, [])

  const update = (change: { hovered?: boolean; focused?: boolean }) => {
    const was = reader.current.hovered || reader.current.focused
    reader.current = { ...reader.current, ...change }
    const now = reader.current.hovered || reader.current.focused
    if (now !== was) report.current?.(now)
  }

  return {
    onPointerEnter: () => update({ hovered: true }),
    onPointerLeave: () => update({ hovered: false }),
    onFocus: () => update({ focused: true }),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      // Focus within: only a move out of the card ends the pause.
      const next = event.relatedTarget
      if (!(next instanceof Node && event.currentTarget.contains(next))) update({ focused: false })
    },
  }
}
