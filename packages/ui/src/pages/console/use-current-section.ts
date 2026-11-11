'use client'
import { useEffect, useState } from 'react'

/**
 * The id of the section the reader is in. A `location.hash` naming one of `ids` (as `#{id}` or
 * `#topic-{id}`) makes that id current, on mount and on every `hashchange`, and holds it until the
 * reader scrolls, so a clicked index link wins even when the page is too short to bring its section
 * to the top. Otherwise it is the section, of those crossing the band from `topOffsetPx` below the
 * top of the viewport to 40% of its height, whose top is nearest the offset (the earlier one on a
 * tie). The first id until either reports (and on the server); `undefined` when `ids` is empty. The
 * viewport is the root because the host's `AppShell` scrolls the window.
 */
export function useCurrentSection(ids: string[], topOffsetPx = 56): string | undefined {
  const [current, setCurrent] = useState<string | undefined>(ids[0])
  // A stable dependency for the effect, so a new array with the same ids does not re-observe.
  const key = JSON.stringify(ids)

  useEffect(() => {
    const list = JSON.parse(key) as string[]
    if (list.length === 0) return

    // Where the window stood when the hash last named a section, while that section is held
    // current; `null` once the reader scrolls away. The anchor jump fires `scroll` too, before or
    // after `hashchange` depending on the browser, but it has already landed when `hashchange`
    // runs, so only a scroll to somewhere else releases the hold.
    let heldAt: number | null = null
    const followHash = () => {
      let hash = window.location.hash.slice(1)
      try {
        hash = decodeURIComponent(hash)
      } catch {
        // A malformed escape: compare the hash as written.
      }
      const id = list.find((candidate) => hash === candidate || hash === `topic-${candidate}`)
      if (id === undefined) return
      heldAt = window.scrollY
      setCurrent(id)
    }
    const onScroll = () => {
      if (heldAt !== null && window.scrollY !== heldAt) heldAt = null
    }
    followHash()
    window.addEventListener('hashchange', followHash)
    window.addEventListener('scroll', onScroll, { passive: true })

    let observer: IntersectionObserver | undefined
    if (typeof IntersectionObserver !== 'undefined') {
      const visible = new Set<string>()
      observer = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (entry.isIntersecting) visible.add(entry.target.id)
            else visible.delete(entry.target.id)
          }
          if (heldAt !== null) return
          // Measured now rather than read from the entries, which only cover sections that
          // crossed an edge of the band.
          let nearest: string | undefined
          let nearestDistance = Infinity
          for (const id of list) {
            const element = visible.has(id) ? document.getElementById(id) : null
            if (!element) continue
            const distance = Math.abs(element.getBoundingClientRect().top - topOffsetPx)
            if (distance < nearestDistance) {
              nearest = id
              nearestDistance = distance
            }
          }
          // Between sections nothing crosses the band; keep the last one rather than flicker.
          if (nearest !== undefined) setCurrent(nearest)
        },
        { rootMargin: `-${topOffsetPx}px 0px -60% 0px` },
      )
      for (const id of list) {
        const element = document.getElementById(id)
        if (element) observer.observe(element)
      }
    }

    return () => {
      observer?.disconnect()
      window.removeEventListener('hashchange', followHash)
      window.removeEventListener('scroll', onScroll)
    }
  }, [key, topOffsetPx])

  // Stale or emptied lists fall back to the first id (or `undefined`) without an extra render.
  return current !== undefined && ids.includes(current) ? current : ids[0]
}
