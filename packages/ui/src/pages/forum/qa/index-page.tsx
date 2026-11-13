'use client'
import { useRef } from 'react'
import { css } from '../../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets/empty-state'
import { HostLink } from '../../blog/host-link'
import {
  answeredRatio,
  cardCategories,
  formatCount,
  hotTags,
  needsAnswer,
  openCount,
  restCategories,
  searchTopics,
  trendingTopics,
} from '../content'
import { ForumLayout } from '../forum-layout'
import { CategoryBadge } from '../parts'
import { SearchField } from '../search-field'
import { SearchResults } from '../search-results'
import type { ForumIndexPageProps, ForumTopic } from '../types'
import { useQuery } from '../use-query'
import { QuestionCell } from './question-cell'

const link = css({
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px', rounded: 'l1' },
})

export function QaIndex(props: ForumIndexPageProps) {
  const { categories, topics, linkComponent, now } = props
  const { input, setInput, query, commit, clear } = useQuery(props)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const binding = { value: input, onChange: setInput, onSubmit: commit, inputRef }

  const ratio = answeredRatio(categories)
  const byId = new Map(categories.map((c) => [c.id, c]))
  const results = query ? searchTopics(topics, categories, query) : []

  const cell = (t: ForumTopic, trailing: 'time' | 'votes', withCategory: boolean) => {
    const category = withCategory ? byId.get(t.categoryId) : undefined
    return (
      <QuestionCell
        key={t.id}
        topic={t}
        category={category}
        href={props.topicHref(t)}
        categoryHref={category ? props.categoryHref(category) : undefined}
        linkComponent={linkComponent}
        now={now}
        trailing={trailing}
      />
    )
  }
  const column = (
    id: string,
    title: string,
    aside: string,
    list: ForumTopic[],
    trailing: 'time' | 'votes',
  ) => (
    <styled.section aria-labelledby={id}>
      <Box display="flex" justifyContent="space-between" alignItems="baseline" mb="2">
        <styled.h2 id={id} textStyle="md" fontWeight="semibold">
          {title}
        </styled.h2>
        <Text textStyle="xs" color="fg.subtle">
          {aside}
        </Text>
      </Box>
      {list.length === 0 ? (
        <EmptyState message="No questions yet." />
      ) : (
        <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border">
          {list.map((t) => cell(t, trailing, true))}
        </styled.ul>
      )}
    </styled.section>
  )

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
    >
      <Box
        className="dark"
        colorScheme="dark"
        bgGradient="auth"
        color="fg.default"
        py={{ base: '8', md: '10' }}
        px="4"
      >
        <Stack maxW="40rem" mx="auto" alignItems="center" textAlign="center" gap="3">
          <styled.h1
            textStyle={{ base: '2xl', md: '3xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
          >
            Ask the community
          </styled.h1>
          <Text color="fg.muted">
            {formatCount(ratio.solved)} of {formatCount(ratio.total)} questions have an accepted
            answer. Search first, then ask.
          </Text>
          <Box className="light" colorScheme="light" w="full">
            <SearchField variant="qa" binding={binding} size="lg" label="Search questions" />
          </Box>
          {topics.length > 0 ? (
            <HStack gap="2" flexWrap="wrap" justifyContent="center">
              <Text textStyle="xs" color="fg.muted">
                Popular:
              </Text>
              {hotTags(topics, 5).map((tag) => (
                <Button
                  key={tag}
                  size="xs"
                  variant="outline"
                  onClick={() => {
                    setInput(tag)
                    commit()
                  }}
                >
                  {tag}
                </Button>
              ))}
            </HStack>
          ) : null}
        </Stack>
      </Box>
      <Box maxW="62.5rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
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
              {results.map((t) => cell(t, 'time', true))}
            </styled.ul>
          </SearchResults>
        ) : (
          <Stack gap="7">
            <styled.section aria-labelledby="qa-categories">
              <styled.h2 id="qa-categories" srOnly>
                Categories
              </styled.h2>
              <Box
                display="grid"
                gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
                gap="4"
              >
                {cardCategories(categories).map((c) => {
                  const percent =
                    c.topicCount === 0 ? 0 : Math.round((c.solvedCount / c.topicCount) * 100)
                  return (
                    <Box key={c.id} borderWidth="1px" borderColor="border" borderRadius="l2" p="4">
                      <styled.h3 textStyle="sm" fontWeight="semibold">
                        <HostLink as={linkComponent} href={props.categoryHref(c)} className={link}>
                          {c.label}
                        </HostLink>
                      </styled.h3>
                      <Text color="fg.muted" textStyle="sm" mt="1">
                        {c.description}
                      </Text>
                      <Text color="fg.subtle" textStyle="xs" my="3">
                        {formatCount(c.topicCount)} questions · {percent}% answered
                      </Text>
                      <Box
                        h="1"
                        bg="gray.4"
                        borderRadius="l1"
                        overflow="hidden"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={percent}
                        aria-label={`${c.label}: ${percent}% answered`}
                      >
                        <Box h="full" bg="fg.default" style={{ width: `${percent}%` }} />
                      </Box>
                    </Box>
                  )
                })}
              </Box>
              {restCategories(categories).length > 0 ? (
                <HStack gap="2" flexWrap="wrap" mt="4">
                  <Text textStyle="xs" color="fg.muted">
                    Also:
                  </Text>
                  {restCategories(categories).map((c) => (
                    <CategoryBadge
                      key={c.id}
                      category={c}
                      href={props.categoryHref(c)}
                      linkComponent={linkComponent}
                    />
                  ))}
                </HStack>
              ) : null}
            </styled.section>
            <Box display="grid" gridTemplateColumns={{ base: '1fr', md: '1fr 1fr' }} gap="7">
              {column(
                'qa-needs-answer',
                'Needs an answer',
                `${formatCount(openCount(categories))} open`,
                needsAnswer(topics, 5),
                'time',
              )}
              {column(
                'qa-trending',
                'Trending this week',
                'by votes',
                trendingTopics(topics, now, 5),
                'votes',
              )}
            </Box>
          </Stack>
        )}
      </Box>
    </ForumLayout>
  )
}
