'use client'
import { useEffect, useState } from 'react'

/**
 * The id of the section the reader is in: the first of `ids`, in order, whose element crosses the band
 * from `topOffsetPx` below the top of the viewport to 40% of its height. The first id until the
 * observer reports (and on the server, and where `IntersectionObserver` is missing); `undefined` when
 * `ids` is empty. The viewport is the root because the host's `AppShell` scrolls the window.
 */
export function useCurrentSection(ids: string[], topOffsetPx = 56): string | undefined {
  const [current, setCurrent] = useState<string | undefined>(ids[0])
  // A stable dependency for the effect, so a new array with the same ids does not re-observe.
  const key = JSON.stringify(ids)

  useEffect(() => {
    const list = JSON.parse(key) as string[]
    if (typeof IntersectionObserver === 'undefined' || list.length === 0) return
    const visible = new Set<string>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id)
          else visible.delete(entry.target.id)
        }
        const first = list.find((id) => visible.has(id))
        // Between sections nothing crosses the band; keep the last one rather than flicker.
        if (first !== undefined) setCurrent(first)
      },
      { rootMargin: `-${topOffsetPx}px 0px -60% 0px` },
    )
    for (const id of list) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key, topOffsetPx])

  // Stale or emptied lists fall back to the first id (or `undefined`) without an extra render.
  return current !== undefined && ids.includes(current) ? current : ids[0]
}
