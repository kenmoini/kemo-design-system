import { styled } from '../../../styled-system/jsx'
import { Badge } from '../../components/ui'
import type { ResourceStatusBadge } from './types'

const PALETTE = { good: 'green', warning: 'amber', critical: 'red', off: 'gray' } as const

export type StatusBadgeProps = ResourceStatusBadge

/** A subtle badge with a dot and the status word, so colour is never the only signal. */
export function StatusBadge({ tone, label }: StatusBadgeProps) {
  return (
    <Badge variant="subtle" colorPalette={PALETTE[tone]} whiteSpace="nowrap">
      <styled.span aria-hidden="true" w="1.5" h="1.5" borderRadius="full" bg="currentColor" />
      {label}
    </Badge>
  )
}
