'use client'
import { useCallback, useState } from 'react'

/** Shows `step` items at first and `step` more each time `more` is called; resets with `resetKey`. */
export function useReveal(total: number, step: number, resetKey: unknown) {
  const [state, setState] = useState({ key: resetKey, shown: step })
  // Reset during render (not in an effect) so a changed key never paints a stale count.
  const current = Object.is(state.key, resetKey) ? state : { key: resetKey, shown: step }
  if (current !== state) setState(current)

  const more = useCallback(
    () =>
      setState((s) => ({
        key: resetKey,
        shown: (Object.is(s.key, resetKey) ? s.shown : step) + step,
      })),
    [resetKey, step],
  )

  return { shown: Math.min(current.shown, total), hasMore: current.shown < total, more }
}
