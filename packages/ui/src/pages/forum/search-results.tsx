import type { ReactNode } from 'react'
import { Flex, styled } from '../../../styled-system/jsx'
import { Button } from '../../components/ui'
import { EmptyState } from '../../widgets/empty-state'
import { formatCount } from './content'

export interface SearchResultsProps {
  query: string
  count: number
  noun: 'topics' | 'discussions' | 'questions'
  onClear: () => void
  children: ReactNode
}

/** The results block of a search: heading, Clear, then the rows or an empty state. */
export function SearchResults({ query, count, noun, onClear, children }: SearchResultsProps) {
  return (
    <section>
      <Flex align="center" justify="space-between" gap="3" mb="3">
        <styled.h2 textStyle="md" fontWeight="semibold">
          {count === 1 ? '1 result' : `${formatCount(count)} results`} for “{query}”
        </styled.h2>
        <Button variant="outline" size="sm" onClick={onClear}>
          Clear
        </Button>
      </Flex>
      {count === 0 ? (
        <EmptyState
          message={`No ${noun} match “${query}”`}
          action={{ label: 'Clear', onSelect: onClear }}
        />
      ) : (
        children
      )}
    </section>
  )
}
