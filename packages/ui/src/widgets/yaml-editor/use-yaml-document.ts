'use client'
import { useCallback, useState } from 'react'

export interface YamlDocument {
  text: string
  setText: (text: string) => void
  /** `text` differs from the baseline (the initial text, or the last `reset(next)`). */
  dirty: boolean
  /** Without an argument, discards edits back to the baseline; with one, makes it the new
   * baseline and text (after a save or a reload). */
  reset: (next?: string) => void
}

/** Draft state for a `YamlEditor`: the text, and whether it differs from the saved copy. */
export function useYamlDocument({ initial }: { initial: string }): YamlDocument {
  const [text, setText] = useState(initial)
  // State, not a ref: `reset(text)` after a save must re-render to clear `dirty`.
  const [baseline, setBaseline] = useState(initial)
  const reset = useCallback(
    (next?: string) => {
      const target = next ?? baseline
      setBaseline(target)
      setText(target)
    },
    [baseline],
  )
  return { text, setText, dirty: text !== baseline, reset }
}
