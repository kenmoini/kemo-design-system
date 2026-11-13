'use client'
import { useRef, useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets/empty-state'
import { formatCount, pageOf, searchTopics, sortTopics } from '../content'
import { Crumbs } from '../crumbs'
import { ForumLayout } from '../forum-layout'
import { ListStatus } from '../list-status'
import { Pager, usePager } from '../pager'
import { CategoryTile } from '../parts'
import { SearchField } from '../search-field'
import { SearchResults } from '../search-results'
import type { ForumCategoryPageProps, ListFilter } from '../types'
import { useQuery } from '../use-query'
import { focusSearch } from '../focus-search'
import { BoardsTopicRow } from './topic-row'

type Filter = 'all' | 'unanswered' | 'solved'
const filters: { id: Filter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'solved', label: 'Solved' },
]
const PAGE_SIZE = 10

export function BoardsCategory(props: ForumCategoryPageProps) {
  const { category, categories, topics, linkComponent, now } = props
  const { input, setInput, query, commit, clear } = useQuery(props)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mobileRef = useRef<HTMLInputElement | null>(null)
  const search = { value: input, onChange: setInput, onSubmit: commit, inputRef }
  const [filter, setFilter] = useState<Filter>('all')

  const own = topics.filter((t) => t.categoryId === category.id)
  const sorted = sortTopics(own, (filter === 'all' ? 'latest' : filter) as ListFilter, 'boards')
  const { page, setPage } = usePager(sorted.length, PAGE_SIZE, filter)
  const rows = pageOf(sorted, page, PAGE_SIZE)
  // Search covers this category only, as in the other variations.
  const results = query ? searchTopics(own, categories, query) : []

  return (
    <ForumLayout
      variant="boards"
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
      search={search}
    >
      <Box maxW="62.5rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Stack gap="5">
          <Crumbs
            items={[{ label: 'Boards', href: props.indexHref }, { label: category.label }]}
            linkComponent={linkComponent}
          />
          <HStack gap="3" alignItems="flex-start">
            <CategoryTile category={category} />
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
              <Text color="fg.muted" textStyle="xs" mt="1">
                {formatCount(category.topicCount)} topics · {formatCount(category.postCount)} posts
              </Text>
            </Box>
          </HStack>
          <Box display={{ base: 'block', md: 'none' }}>
            <SearchField variant="boards" binding={{ ...search, inputRef: mobileRef }} size="sm" />
          </Box>
          <ListStatus
            count={query ? results.length : sorted.length}
            noun={query ? 'results' : 'topics'}
          />
          {query ? (
            <SearchResults
              query={query}
              count={results.length}
              noun="topics"
              onClear={() => {
                clear()
                focusSearch(inputRef, mobileRef)
              }}
            >
              <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border">
                {results.map((t) => (
                  <BoardsTopicRow
                    key={t.id}
                    topic={t}
                    category={category}
                    href={props.topicHref(t)}
                    linkComponent={linkComponent}
                    now={now}
                  />
                ))}
              </styled.ul>
            </SearchResults>
          ) : (
            <>
              <Box display="flex" justifyContent="space-between" alignItems="center" gap="3">
                <Text textStyle="sm" color="fg.muted">
                  {formatCount(sorted.length)} topics
                </Text>
                <HStack role="group" aria-label="Filter topics" gap="2">
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
              {sorted.length === 0 ? (
                filter === 'all' ? (
                  <EmptyState message="No topics yet." />
                ) : (
                  <EmptyState
                    message="No topics match this filter."
                    action={{ label: 'Show all', onSelect: () => setFilter('all') }}
                  />
                )
              ) : (
                <>
                  <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border">
                    {rows.map((t) => (
                      <BoardsTopicRow
                        key={t.id}
                        topic={t}
                        category={category}
                        href={props.topicHref(t)}
                        linkComponent={linkComponent}
                        now={now}
                        headingLevel={2}
                      />
                    ))}
                  </styled.ul>
                  <Pager
                    page={page}
                    pageSize={PAGE_SIZE}
                    total={sorted.length}
                    onPageChange={setPage}
                    label="Topics"
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
