'use client'
import { useEffect } from 'react'

/**
 * Sets `<html data-hydrated="true">` once React has hydrated the page, so the e2e tests can wait
 * for it before their first click or keystroke (one that lands earlier is lost).
 */
export function HydrationMarker() {
  useEffect(() => {
    document.documentElement.dataset.hydrated = 'true'
  }, [])
  return null
}
