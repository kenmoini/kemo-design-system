'use client'
import { useRef, useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets/empty-state'
import { useReveal } from '../../blog/use-reveal'
import { formatCount, searchTopics, sortTopics, topContributors, weekStats } from '../content'
import { ForumLayout } from '../forum-layout'
import { focusSearch } from '../focus-search'
import { ListStatus } from '../list-status'
import { SearchField } from '../search-field'
import { SearchResults } from '../search-results'
import type {
  ForumCategory,
  ForumCategoryPageProps,
  ForumChromeProps,
  ForumTopic,
  ListFilter,
} from '../types'
import { useQuery } from '../use-query'
import { FeedRow } from './feed-row'
import { DiscussionsRail, StartDiscussion } from './rail'

type Filter = Extract<ListFilter, 'latest' | 'top' | 'unanswered' | 'solved'>
const filters: { id: Filter; label: string }[] = [
  { id: 'latest', label: 'Latest' },
  { id: 'top', label: 'Top' },
  { id: 'unanswered', label: 'Unanswered' },
  { id: 'solved', label: 'Solved' },
]
const STEP = 8

export interface DiscussionsFeedProps extends Omit<ForumChromeProps, 'variant'> {
  mode: 'index' | 'category'
  title?: string
  description?: React.ReactNode
  categories: ForumCategory[]
  topics: ForumTopic[]
  category?: ForumCategory
  query?: ForumCategoryPageProps['query']
  defaultQuery?: string
  onQueryChange?: (query: string) => void
}

function countLabel(filter: Filter, n: number): string {
  if (filter === 'unanswered') return `${formatCount(n)} unanswered`
  if (filter === 'solved') return `${formatCount(n)} solved`
  return `${formatCount(n)} ${n === 1 ? 'discussion' : 'discussions'}`
}

/** The feed page both Discussions pages share: filters and rows beside a rail. */
export function DiscussionsFeed(props: DiscussionsFeedProps) {
  const { mode, category, categories, topics, linkComponent, now } = props
  const { input, setInput, query, commit, clear } = useQuery(props)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mobileRef = useRef<HTMLInputElement | null>(null)
  const search = { value: input, onChange: setInput, onSubmit: commit, inputRef }
  const [filter, setFilter] = useState<Filter>('latest')

  const scoped = category ? topics.filter((t) => t.categoryId === category.id) : topics
  const list = sortTopics(scoped, filter, 'discussions')
  const { shown, hasMore, more } = useReveal(list.length, STEP, filter)
  const results = query ? searchTopics(scoped, categories, query) : []
  const byId = new Map(categories.map((c) => [c.id, c]))
  const row = (t: ForumTopic, pinned = false) => {
    const own = byId.get(t.categoryId)
    return (
      <FeedRow
        key={t.id}
        topic={t}
        category={own}
        href={props.topicHref(t)}
        categoryHref={own ? props.categoryHref(own) : undefined}
        linkComponent={linkComponent}
        now={now}
        pinned={pinned}
      />
    )
  }

  return (
    <ForumLayout
      variant="discussions"
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
      <Box maxW="65rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Box
          display="grid"
          gap="6"
          gridTemplateColumns={{ base: '1fr', lg: '1fr 14.75rem' }}
          // The feed spans both rows: the second takes its extra height, so the rail's rest follows
          // "Start a discussion" directly.
          gridTemplateRows={{ lg: 'auto 1fr' }}
          columnGap={{ lg: '9' }}
        >
          <Box gridColumn={{ lg: '2' }} gridRow={{ lg: '1' }}>
            <StartDiscussion
              composerHref={props.composerHref(category)}
              linkComponent={linkComponent}
            />
          </Box>
          <Box minW="0" gridColumn={{ lg: '1' }} gridRow={{ lg: '1 / span 2' }}>
            <Stack gap="4">
              {mode === 'category' && category ? (
                <div>
                  <styled.h1 textStyle="2xl" fontWeight="semibold" letterSpacing="-0.02em">
                    {category.label}
                  </styled.h1>
                  <Text color="fg.muted" textStyle="sm" mt="1">
                    {category.description}
                  </Text>
                </div>
              ) : (
                <styled.h1 srOnly>{props.title}</styled.h1>
              )}
              <Box display={{ base: 'block', md: 'none' }}>
                <SearchField
                  variant="discussions"
                  binding={{ ...search, inputRef: mobileRef }}
                  size="sm"
                />
              </Box>
              {query ? (
                <SearchResults
                  query={query}
                  count={results.length}
                  noun="discussions"
                  onClear={() => {
                    clear()
                    focusSearch(inputRef, mobileRef)
                  }}
                >
                  <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border">
                    {results.map((t) => row(t))}
                  </styled.ul>
                </SearchResults>
              ) : (
                <>
                  <HStack
                    flexWrap="wrap"
                    justifyContent="space-between"
                    gap="3"
                    pb="3"
                    borderBottomWidth="1px"
                    borderColor="border"
                  >
                    <HStack role="group" aria-label="Filter" gap="2" flexWrap="wrap">
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
                    <Text color="fg.muted" textStyle="sm">
                      {countLabel(filter, list.length)}
                    </Text>
                  </HStack>
                  <ListStatus count={list.length} noun="discussions" />
                  {list.length === 0 ? (
                    <EmptyState message="No discussions yet." />
                  ) : (
                    <>
                      <styled.ul m="0" p="0">
                        {list.slice(0, shown).map((t) => row(t, filter === 'latest' && !!t.pinned))}
                      </styled.ul>
                      {hasMore ? (
                        <Box display="flex" justifyContent="center">
                          <Button variant="outline" size="sm" onClick={more}>
                            Load more
                          </Button>
                        </Box>
                      ) : null}
                    </>
                  )}
                </>
              )}
            </Stack>
          </Box>
          <Box gridColumn={{ lg: '2' }} gridRow={{ lg: '2' }}>
            <DiscussionsRail
              categories={categories}
              current={category}
              indexHref={props.indexHref}
              categoryHref={props.categoryHref}
              week={weekStats(scoped, now)}
              contributors={topContributors(scoped, 4)}
              linkComponent={linkComponent}
            />
          </Box>
        </Box>
      </Box>
    </ForumLayout>
  )
}
