import { styled } from '../../../styled-system/jsx'
import { countLabel } from './content'

export interface PostCountStatusProps {
  count: number
  topic?: string
  topicLabel?: string
}

/** A visually hidden live region that announces the result of a topic filter. */
export function PostCountStatus({ count, topic, topicLabel }: PostCountStatusProps) {
  let text: string
  if (topic === undefined) text = countLabel(count)
  else if (count > 0) text = `${countLabel(count)} in ${topicLabel ?? 'this topic'}`
  else text = `No posts in ${topicLabel ?? 'this topic'}`
  return (
    <styled.p srOnly role="status" aria-live="polite">
      {text}
    </styled.p>
  )
}
