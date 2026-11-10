'use client'
import { useCallback, useSyncExternalStore } from 'react'

/** The shell's breakpoints, matching Panda's `md` and `lg`. */
export const MEDIA_MD = '(min-width: 48em)'
export const MEDIA_LG = '(min-width: 64em)'

/** Whether `query` matches, kept live with `window.matchMedia`. `false` on the server and while hydrating. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}
