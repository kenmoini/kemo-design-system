import type { RefObject } from 'react'

/** Focuses the search input that is on screen: the top bar's from `md`, the page's below it. */
export function focusSearch(...refs: RefObject<HTMLInputElement | null>[]) {
  const shown = refs.find((r) => r.current && r.current.getClientRects().length > 0)
  ;(shown ?? refs[0])?.current?.focus()
}
