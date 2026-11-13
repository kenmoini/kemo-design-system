'use client'
import { useId, useRef } from 'react'
import { css } from '../../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Text } from '../../../components/ui'
import { HostLink } from '../../blog/host-link'
import { formatCount, replyCountOf, searchTopics } from '../content'
import { ForumLayout } from '../forum-layout'
import { CategoryTile, Count, RelativeTime, StatusBadge, UserAvatar } from '../parts'
import { SearchField } from '../search-field'
import { SearchResults } from '../search-results'
import type { ForumCategory, ForumIndexPageProps, ForumTopic } from '../types'
import { useQuery } from '../use-query'
import { focusSearch } from '../focus-search'
import { BoardsTopicRow } from './topic-row'

const link = css({
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px', rounded: 'l1' },
})

const boardColumns = { base: '1fr', md: '1fr 5rem 5rem 20rem' } as const

function latestOf(topics: ForumTopic[], category: ForumCategory): ForumTopic | undefined {
  let latest: ForumTopic | undefined
  for (const t of topics) {
    if (t.categoryId !== category.id) continue
    if (!latest || Date.parse(t.lastActivityAt) > Date.parse(latest.lastActivityAt)) latest = t
  }
  return latest
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <Box textAlign={{ base: 'start', md: 'end' }}>
      <styled.b display="block" textStyle="xl" fontWeight="semibold">
        <Count value={value} />
      </styled.b>
      <styled.span textStyle="xs" color="fg.muted">
        {label}
      </styled.span>
    </Box>
  )
}

export function BoardsIndex(props: ForumIndexPageProps) {
  const { title, description, categories, topics, memberCount, linkComponent, now } = props
  const { input, setInput, query, commit, clear } = useQuery(props)
  const uid = useId()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const mobileRef = useRef<HTMLInputElement | null>(null)
  const search = { value: input, onChange: setInput, onSubmit: commit, inputRef }

  const sections: { name: string; categories: ForumCategory[] }[] = []
  for (const c of categories) {
    const found = sections.find((s) => s.name === c.section)
    if (found) found.categories.push(c)
    else sections.push({ name: c.section, categories: [c] })
  }
  const latest = [...topics]
    .sort((a, b) => Date.parse(b.lastActivityAt) - Date.parse(a.lastActivityAt))
    .slice(0, 3)
  const byId = new Map(categories.map((c) => [c.id, c]))
  const results = query ? searchTopics(topics, categories, query) : []

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
      search={search}
    >
      <Box maxW="62.5rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Stack gap="6">
          <Box
            display="flex"
            flexDirection={{ base: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ base: 'flex-start', md: 'flex-end' }}
            gap="4"
          >
            <Box>
              <styled.h1
                textStyle={{ base: '2xl', md: '3xl' }}
                fontWeight="semibold"
                letterSpacing="-0.02em"
              >
                {title}
              </styled.h1>
              {description ? (
                <Text color="fg.muted" textStyle="sm" mt="1">
                  {description}
                </Text>
              ) : null}
            </Box>
            <HStack gap="6">
              <Stat value={categories.reduce((n, c) => n + c.topicCount, 0)} label="topics" />
              <Stat value={categories.reduce((n, c) => n + c.postCount, 0)} label="posts" />
              <Stat value={memberCount ?? 0} label="members" />
            </HStack>
          </Box>
          <Box display={{ base: 'block', md: 'none' }}>
            <SearchField variant="boards" binding={{ ...search, inputRef: mobileRef }} size="sm" />
          </Box>
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
                    category={byId.get(t.categoryId)}
                    showCategory
                    href={props.topicHref(t)}
                    linkComponent={linkComponent}
                    now={now}
                  />
                ))}
              </styled.ul>
            </SearchResults>
          ) : (
            <>
              {sections.map((section, i) => (
                <styled.section key={section.name} aria-labelledby={`${uid}-section-${i}`}>
                  <styled.h2 id={`${uid}-section-${i}`} textStyle="md" fontWeight="semibold" mb="2">
                    {section.name}
                  </styled.h2>
                  <Box
                    aria-hidden="true"
                    display={{ base: 'none', md: 'grid' }}
                    gridTemplateColumns={boardColumns}
                    columnGap="4"
                    pb="2"
                    borderBottomWidth="1px"
                    borderColor="border"
                    textStyle="xs"
                    color="fg.subtle"
                  >
                    <span />
                    <styled.span textAlign="end">Topics</styled.span>
                    <styled.span textAlign="end">Posts</styled.span>
                    <span>Latest</span>
                  </Box>
                  <styled.ul m="0" p="0">
                    {section.categories.map((category) => {
                      const last = latestOf(topics, category)
                      return (
                        <styled.li key={category.id} listStyle="none">
                          <Box
                            as="article"
                            display="grid"
                            gridTemplateColumns={boardColumns}
                            columnGap="4"
                            rowGap="2"
                            py="4"
                            alignItems="center"
                            borderBottomWidth="1px"
                            borderColor="border"
                          >
                            <HStack gap="3" alignItems="flex-start">
                              <CategoryTile category={category} />
                              <Box minW="0">
                                <styled.h3 textStyle="sm" fontWeight="medium">
                                  <HostLink
                                    as={linkComponent}
                                    href={props.categoryHref(category)}
                                    className={link}
                                  >
                                    {category.label}
                                  </HostLink>
                                </styled.h3>
                                <Text color="fg.muted" textStyle="sm">
                                  {category.description}
                                </Text>
                                <Text
                                  color="fg.muted"
                                  textStyle="xs"
                                  display={{ base: 'block', md: 'none' }}
                                >
                                  {formatCount(category.topicCount)} topics ·{' '}
                                  {formatCount(category.postCount)} posts
                                </Text>
                              </Box>
                            </HStack>
                            <styled.span
                              textStyle="sm"
                              textAlign="end"
                              display={{ base: 'none', md: 'block' }}
                            >
                              <Count value={category.topicCount} />
                              <styled.span srOnly>
                                {category.topicCount === 1 ? ' topic' : ' topics'}
                              </styled.span>
                            </styled.span>
                            <styled.span
                              textStyle="sm"
                              textAlign="end"
                              display={{ base: 'none', md: 'block' }}
                            >
                              <Count value={category.postCount} />
                              <styled.span srOnly>
                                {category.postCount === 1 ? ' post' : ' posts'}
                              </styled.span>
                            </styled.span>
                            {last ? (
                              <HStack gap="2" alignItems="flex-start" minW="0">
                                <UserAvatar user={last.author} size="sm" />
                                <Box minW="0">
                                  <styled.h4 textStyle="sm" fontWeight="medium">
                                    <HostLink
                                      as={linkComponent}
                                      href={props.topicHref(last)}
                                      className={link}
                                    >
                                      {last.title}
                                    </HostLink>
                                  </styled.h4>
                                  <Text color="fg.muted" textStyle="xs">
                                    {last.author.name} ·{' '}
                                    <RelativeTime iso={last.lastActivityAt} now={now} />
                                  </Text>
                                </Box>
                              </HStack>
                            ) : (
                              <Text color="fg.muted" textStyle="sm">
                                No topics yet
                              </Text>
                            )}
                          </Box>
                        </styled.li>
                      )
                    })}
                  </styled.ul>
                </styled.section>
              ))}
              {latest.length > 0 ? (
                <styled.section aria-labelledby={`${uid}-latest`}>
                  <styled.h2 id={`${uid}-latest`} textStyle="md" fontWeight="semibold" mb="3">
                    Latest
                  </styled.h2>
                  <Box
                    display="grid"
                    gridTemplateColumns={{ base: '1fr', sm: 'repeat(3, 1fr)' }}
                    gap="3"
                  >
                    {latest.map((t) => (
                      <Box
                        key={t.id}
                        as="article"
                        borderWidth="1px"
                        borderColor="border"
                        borderRadius="l2"
                        p="4"
                      >
                        <StatusBadge topic={t} />
                        <styled.h3 textStyle="sm" fontWeight="medium" mt="2">
                          <HostLink as={linkComponent} href={props.topicHref(t)} className={link}>
                            {t.title}
                          </HostLink>
                        </styled.h3>
                        <Text color="fg.muted" textStyle="xs" mt="1">
                          {t.author.name} · {formatCount(replyCountOf(t))}{' '}
                          {replyCountOf(t) === 1 ? 'reply' : 'replies'}
                        </Text>
                      </Box>
                    ))}
                  </Box>
                </styled.section>
              ) : null}
            </>
          )}
        </Stack>
      </Box>
    </ForumLayout>
  )
}
