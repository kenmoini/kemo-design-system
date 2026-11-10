'use client'
import type { EventStreamEvent } from '@kemo/ui'
import { useEffect, useRef, useState } from 'react'
import { liveEventRotation } from './mock-dashboard'

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}

/**
 * The event stream's mock live feed: starts from `initial` and, every `intervalMs`, prepends the
 * next event of a fixed rotation with a fresh id and the current time, keeping the newest `max`.
 * The time is read inside the interval, never during render, so the server render stays stable.
 */
export function useLiveEvents(
  initial: EventStreamEvent[],
  intervalMs = 4000,
  max = 20,
): EventStreamEvent[] {
  const [events, setEvents] = useState(initial)
  // Survives effect re-runs (Strict Mode, a new interval), so ids never repeat.
  const ticks = useRef(0)

  useEffect(() => {
    const timer = setInterval(() => {
      const n = ticks.current++
      const next = liveEventRotation[n % liveEventRotation.length]
      if (!next) return
      const event: EventStreamEvent = {
        ...next,
        id: `live-${n}`,
        time: new Date().toLocaleTimeString('en-GB', timeFormat),
      }
      setEvents((current) => [event, ...current].slice(0, max))
    }, intervalMs)
    return () => clearInterval(timer)
  }, [intervalMs, max])

  return events
}
