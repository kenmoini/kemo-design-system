import { styled } from '../../../styled-system/jsx'
import { formatCount } from './content'

export type ListNoun = 'topics' | 'discussions' | 'questions' | 'results'

export interface ListStatusProps {
  count: number
  noun: ListNoun
}

/** A visually hidden live region that announces how many rows a list shows. */
export function ListStatus({ count, noun }: ListStatusProps) {
  let text: string
  if (count === 0) text = noun === 'results' ? 'No results' : `No ${noun} yet`
  else text = `${formatCount(count)} ${count === 1 ? noun.slice(0, -1) : noun}`
  return (
    <styled.p srOnly role="status" aria-live="polite">
      {text}
    </styled.p>
  )
}
