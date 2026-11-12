'use client'
import { useCallback, useEffect, useRef, useState } from 'react'

export interface UseQueryOptions {
  query?: string
  defaultQuery?: string
  onQueryChange?: (query: string) => void
}

const DELAY = 300

/**
 * The search query of a list page: the text in the field (`input`) and the committed `query`
 * that filters the list. Controlled exactly when `'query' in opts`; `input` then re-syncs
 * during render when the `query` prop changes to something other than a trimmed echo of it.
 */
export function useQuery(opts: UseQueryOptions) {
  const controlled = 'query' in opts
  const [input, setInputState] = useState(opts.query ?? opts.defaultQuery ?? '')
  const [inner, setInner] = useState(() => (opts.query ?? opts.defaultQuery ?? '').trim())
  const [seen, setSeen] = useState(opts.query)
  if (controlled && opts.query !== seen) {
    setSeen(opts.query)
    // A prop that only echoes the user's own (trimmed) input must not rewrite the field.
    if ((opts.query ?? '').trim() !== input.trim()) setInputState(opts.query ?? '')
  }

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const latest = useRef({ input, onQueryChange: opts.onQueryChange })
  latest.current = { input, onQueryChange: opts.onQueryChange }

  const cancel = useCallback(() => {
    clearTimeout(timer.current)
    timer.current = undefined
  }, [])
  useEffect(() => cancel, [cancel])

  const commitValue = useCallback(
    (value: string) => {
      const next = value.trim()
      if (!controlled) setInner(next)
      latest.current.onQueryChange?.(next)
    },
    [controlled],
  )

  const commit = useCallback(() => {
    cancel()
    commitValue(latest.current.input)
  }, [cancel, commitValue])

  const setInput = useCallback(
    (value: string) => {
      setInputState(value)
      latest.current.input = value
      cancel()
      timer.current = setTimeout(() => {
        timer.current = undefined
        commitValue(value)
      }, DELAY)
    },
    [cancel, commitValue],
  )

  const clear = useCallback(() => {
    cancel()
    setInputState('')
    latest.current.input = ''
    setInner('')
    latest.current.onQueryChange?.('')
  }, [cancel])

  return { input, setInput, query: controlled ? (opts.query ?? '') : inner, commit, clear }
}
