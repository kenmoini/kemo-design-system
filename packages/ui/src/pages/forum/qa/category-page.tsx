'use client'
import { useRef, useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets/empty-state'
import { formatCount, pageOf, searchTopics, sortTopics, vocabulary } from '../content'
import { Crumbs } from '../crumbs'
import { ForumLayout } from '../forum-layout'
import { ListStatus } from '../list-status'
import { Pager, usePager } from '../pager'
import { SearchField } from '../search-field'
import { SearchResults } from '../search-results'
import type { ForumCategoryPageProps } from '../types'
import { useQuery } from '../use-query'
import { QuestionCell } from './question-cell'

type Filter = 'newest' | 'unanswered' | 'votes'
const filters: { id: Filter; label: string }[] = [
  { id: 'newest', label: 'Newest' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'votes', label: 'Votes' },
]
const PAGE_SIZE = 10

export function QaCategory(props: ForumCategoryPageProps) {
  const { category, categories, topics, linkComponent, now } = props
  const { input, setInput, query, commit, clear } = useQuery(props)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const binding = { value: input, onChange: setInput, onSubmit: commit, inputRef }
  const [filter, setFilter] = useState<Filter>('newest')

  const own = topics.filter((t) => t.categoryId === category.id)
  const sorted = sortTopics(own, filter, 'qa', true)
  const { page, setPage } = usePager(sorted.length, PAGE_SIZE, filter)
  const rows = pageOf(sorted, page, PAGE_SIZE)
  const results = query ? searchTopics(own, categories, query) : []
  const trailing = filter === 'votes' ? 'votes' : 'time'

  return (
    <ForumLayout
      variant="qa"
      logo={props.logo}
      brand={props.brand}
      section={props.section}
      nav={props.nav}
      footer={props.footer}
      year={props.year}
      linkComponent={linkComponent}
      indexHref={props.indexHref}
      signInHref={props.signInHref}
      composerHref={props.composerHref}
      searchHref={props.searchHref}
      navigate={props.navigate}
      composerCategory={category}
    >
      <Box maxW="62.5rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Stack gap="5">
          <Crumbs
            items={[
              { label: vocabulary.qa.sectionLabel, href: props.indexHref },
              { label: category.label },
            ]}
            linkComponent={linkComponent}
          />
          <Box>
            <styled.h1
              textStyle={{ base: '2xl', md: '3xl' }}
              fontWeight="semibold"
              letterSpacing="-0.02em"
            >
              {category.label}
            </styled.h1>
            <Text color="fg.muted" textStyle="sm" mt="1">
              {category.description}
            </Text>
            <Text color="fg.subtle" textStyle="xs" mt="1">
              {formatCount(category.solvedCount)} of {formatCount(category.topicCount)} questions
              have an accepted answer
            </Text>
          </Box>
          <SearchField variant="qa" binding={binding} size="sm" label="Search questions" />
          {query ? (
            <SearchResults
              query={query}
              count={results.length}
              noun="questions"
              onClear={() => {
                clear()
                inputRef.current?.focus()
              }}
            >
              <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border">
                {results.map((t) => (
                  <QuestionCell
                    key={t.id}
                    topic={t}
                    href={props.topicHref(t)}
                    linkComponent={linkComponent}
                    now={now}
                    trailing="time"
                  />
                ))}
              </styled.ul>
            </SearchResults>
          ) : (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap="3">
                <Text textStyle="sm" color="fg.muted">
                  {sorted.length === 1 ? '1 question' : `${formatCount(sorted.length)} questions`}
                </Text>
                <HStack role="group" aria-label="Filter" gap="2">
                  {filters.map((f) => (
                    <Button
                      key={f.id}
                      size="sm"
                      variant={filter === f.id ? 'solid' : 'outline'}
                      aria-pressed={filter === f.id}
                      onClick={() => setFilter(f.id)}
                    >
                      {f.label}
                    </Button>
                  ))}
                </HStack>
              </Box>
              <ListStatus count={sorted.length} noun="questions" />
              {sorted.length === 0 ? (
                filter === 'newest' ? (
                  <EmptyState message="No questions yet." />
                ) : (
                  <EmptyState
                    message="No questions match this filter."
                    action={{ label: 'Show all', onSelect: () => setFilter('newest') }}
                  />
                )
              ) : (
                <>
                  <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border">
                    {rows.map((t) => (
                      <QuestionCell
                        key={t.id}
                        topic={t}
                        href={props.topicHref(t)}
                        linkComponent={linkComponent}
                        now={now}
                        trailing={trailing}
                        headingLevel={2}
                      />
                    ))}
                  </styled.ul>
                  <Pager
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={sorted.length}
                    onPageChange={setPage}
                    label="Questions"
                  />
                </>
              )}
            </>
          )}
        </Stack>
      </Box>
    </ForumLayout>
  )
}
