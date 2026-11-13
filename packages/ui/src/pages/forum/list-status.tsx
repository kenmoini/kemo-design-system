import { styled } from '../../../styled-system/jsx'
import { formatCount } from './content'

export type ListNoun = 'topics' | 'discussions' | 'questions' | 'results'

export interface ListStatusProps {
  /** Null announces nothing (a page with no list to count until a search runs). */
  count: number | null
  noun: ListNoun
}

/**
 * A visually hidden live region that announces how many rows a list shows. Pages render it once,
 * unconditionally, so it stays mounted and its text changes between the list and a search.
 */
export function ListStatus({ count, noun }: ListStatusProps) {
  let text: string
  if (count === null) text = ''
  else if (count === 0) text = noun === 'results' ? 'No results' : `No ${noun} yet`
  else text = `${formatCount(count)} ${count === 1 ? noun.slice(0, -1) : noun}`
  return (
    <styled.p srOnly role="status" aria-live="polite">
      {text}
    </styled.p>
  )
}
