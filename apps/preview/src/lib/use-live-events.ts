'use client'
import { useEffect, useRef, useState } from 'react'

const timeFormat: Intl.DateTimeFormatOptions = {
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
}

/** What the live feed can tick: anything with an id and a time (an `EventStreamEvent`, an `AuditEvent`). */
export interface LiveEvent {
  id: string
  time: string
}

/** The wall clock, "HH:MM:SS": `timeOf`'s default. */
const wallClock = () => new Date().toLocaleTimeString('en-GB', timeFormat)

export interface LiveEventsOptions<E extends LiveEvent> {
  /** What each tick prepends, in turn; the hook gives each a fresh id and a time from `timeOf`. */
  rotation: Omit<E, 'id' | 'time'>[]
  /**
   * The time of tick `n` (0 for the first), e.g. a demo clock that carries on from the seeded
   * events; default the wall clock. Keep it stable (module scope): a new function restarts the tick.
   */
  timeOf?: (n: number) => string
  /** Time between ticks in ms (default 4000). */
  intervalMs?: number
  /** How many events to keep, newest first (default 20). */
  max?: number
  /** Stop ticking while true, so a reader can stop the stream changing (WCAG 2.2.2). */
  paused?: boolean
}

/**
 * A mock live feed: starts from `initial` and, every `intervalMs` unless `paused`, prepends the next
 * event of `rotation` with a fresh id and the tick's time (`timeOf`), keeping the newest `max`. The
 * time is read inside the interval, never during render, so the server render stays stable.
 */
export function useLiveEvents<E extends LiveEvent>(
  initial: E[],
  {
    rotation,
    timeOf = wallClock,
    intervalMs = 4000,
    max = 20,
    paused = false,
  }: LiveEventsOptions<E>,
): E[] {
  const [events, setEvents] = useState(initial)
  // Survives effect re-runs (Strict Mode, pausing, a new interval), so ids never repeat.
  const ticks = useRef(0)

  useEffect(() => {
    if (paused) return
    const timer = setInterval(() => {
      const n = ticks.current++
      const next = rotation[n % rotation.length]
      if (!next) return
      const event = { ...next, id: `live-${n}`, time: timeOf(n) } as E
      setEvents((current) => [event, ...current].slice(0, max))
    }, intervalMs)
    return () => clearInterval(timer)
  }, [rotation, timeOf, intervalMs, max, paused])

  return events
}
