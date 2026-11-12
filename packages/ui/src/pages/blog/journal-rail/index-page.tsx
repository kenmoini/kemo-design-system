'use client'
import { useId } from 'react'
import { css } from '../../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Heading, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets'
import { BlogCover } from '../blog-cover'
import { BlogLayout } from '../blog-layout'
import { countLabel, formatDay, groupByMonth, hasExplicitCover } from '../content'
import { HostLink } from '../host-link'
import { PostCountStatus } from '../post-count-status'
import { Byline, TopicBadge } from '../post-meta'
import { SubscribeForm } from '../subscribe-form'
import type { BlogIndexPageProps } from '../types'
import { useReveal } from '../use-reveal'
import { useTopicFilter } from '../use-topic-filter'

const titleLink = css({
  color: 'inherit',
  textDecoration: 'none',
  rounded: 'l1',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px' },
})
// A chip row below `lg`, a full-width list of rows from `lg`.
const topicButton = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '3',
  textStyle: 'sm',
  color: 'fg.muted',
  cursor: 'pointer',
  rounded: 'l1',
  px: '2',
  py: '1',
  borderWidth: '1px',
  borderColor: { base: 'border', lg: 'transparent' },
  _hover: { color: 'fg.default' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px' },
  '&[aria-pressed=true]': { bg: 'gray.subtle.bg', color: 'fg.default', fontWeight: 'medium' },
  lg: { w: 'full' },
})

export function JournalRailIndex(props: BlogIndexPageProps) {
  const { title, description, posts, postHref, linkComponent, onSubscribe } = props
  // `props` goes in whole: the hook tells a controlled `topic` from an absent one by its key.
  const { sorted, topics, topic, topicLabel, visible, setTopic } = useTopicFilter(posts, props)
  const { shown, hasMore, more } = useReveal(visible.length, 5, topic)
  const groups = groupByMonth(visible.slice(0, shown))
  const idPrefix = useId()
  const subscribeHeadingId = `${idPrefix}-subscribe`
  const countOf = (id: string) => sorted.filter((p) => p.topic.id === id).length

  return (
    <BlogLayout {...props} hideSubscribe>
      {/* The DOM is the small-screen reading order, so Tab follows the page at every width: title,
          topics, feed, subscribe card. From `lg` the title, topics and card are placed in the
          14rem left column (auto-placed down its rows in that order) and the feed spans every row
          of the right one, its height going to the last, flexible row. The left column does not
          stick: the card comes after the feed in the DOM, so no one box can hold all three. */}
      <Box
        maxW="72rem"
        mx="auto"
        px={{ base: '4', sm: '7' }}
        py={{ base: '6', lg: '8' }}
        display="flex"
        flexDirection="column"
        rowGap={{ base: '6', lg: '5' }}
        columnGap="10"
        lg={{
          display: 'grid',
          gridTemplateColumns: '14rem minmax(0, 1fr)',
          gridTemplateRows: 'auto auto auto 1fr',
          alignItems: 'start',
        }}
      >
        <Stack gap="2" lg={{ gridColumn: '1' }}>
          <styled.h1
            textStyle={{ base: 'xl', lg: '2xl' }}
            fontWeight="semibold"
            letterSpacing="-0.02em"
          >
            {title}
          </styled.h1>
          {description ? (
            <Text color="fg.muted" textStyle="sm">
              {description}
            </Text>
          ) : null}
        </Stack>
        {posts.length > 0 ? (
          <Box as="nav" aria-label="Topics" lg={{ gridColumn: '1' }}>
            <styled.p
              textStyle="xs"
              color="fg.subtle"
              mb="1.5"
              display={{ base: 'none', lg: 'block' }}
            >
              Topics
            </styled.p>
            <styled.ul
              m="0"
              p="0"
              listStyle="none"
              display="flex"
              flexWrap="wrap"
              gap="2"
              lg={{ flexDirection: 'column', gap: '0.5' }}
            >
              <li>
                <button
                  type="button"
                  className={topicButton}
                  aria-pressed={topic === undefined}
                  onClick={() => setTopic(undefined)}
                >
                  All posts <span>{sorted.length}</span>
                </button>
              </li>
              {topics.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    className={topicButton}
                    aria-pressed={topic === t.id}
                    onClick={() => setTopic(t.id)}
                  >
                    {t.label} <span>{countOf(t.id)}</span>
                  </button>
                </li>
              ))}
            </styled.ul>
          </Box>
        ) : null}
        <Box minW="0" lg={{ gridColumn: '2', gridRow: '1 / -1' }}>
          {posts.length === 0 ? (
            <EmptyState message="No posts yet." />
          ) : visible.length === 0 ? (
            <EmptyState
              message="No posts in this topic."
              action={{ label: 'Show all posts', onSelect: () => setTopic(undefined) }}
            />
          ) : (
            <Stack gap="5">
              {groups.map((group) => {
                const headingId = `${idPrefix}-${group.key}`
                return (
                  <styled.section key={group.key} aria-labelledby={headingId}>
                    <HStack
                      justifyContent="space-between"
                      pb="1.5"
                      borderBottomWidth="1px"
                      borderColor="border"
                    >
                      <styled.h2
                        id={headingId}
                        textStyle="xs"
                        fontWeight="normal"
                        color="fg.subtle"
                      >
                        {group.label}
                      </styled.h2>
                      <Text textStyle="xs" color="fg.subtle">
                        {countLabel(group.posts.length)}
                      </Text>
                    </HStack>
                    {group.posts.map((post) => {
                      const { day, weekday } = formatDay(post.publishedAt)
                      const cover = hasExplicitCover(post)
                      return (
                        <Box
                          key={post.slug}
                          as="article"
                          display="grid"
                          gap={{ base: '3', sm: '4' }}
                          py="4"
                          borderBottomWidth="1px"
                          borderColor="border"
                          alignItems="start"
                          gridTemplateColumns={
                            cover ? { base: '2.5rem 1fr', sm: '2.5rem 1fr 6rem' } : '2.5rem 1fr'
                          }
                        >
                          <styled.time
                            dateTime={post.publishedAt}
                            display="block"
                            textStyle="lg"
                            fontWeight="semibold"
                            lineHeight="1"
                            style={{ fontVariantNumeric: 'tabular-nums' }}
                          >
                            {day}
                            <styled.span
                              display="block"
                              textStyle="xs"
                              fontWeight="normal"
                              color="fg.subtle"
                              mt="1"
                            >
                              {weekday}
                            </styled.span>
                          </styled.time>
                          <Stack gap="1">
                            <Heading as="h3" textStyle="md" letterSpacing="-0.01em">
                              <HostLink
                                as={linkComponent}
                                href={postHref(post)}
                                className={titleLink}
                              >
                                {post.title}
                              </HostLink>
                            </Heading>
                            <Text color="fg.muted" textStyle="sm" maxW="58ch">
                              {post.summary}
                            </Text>
                            <HStack gap="2" mt="1.5" flexWrap="wrap">
                              <TopicBadge topic={post.topic} />
                              <Byline post={post} show={['author', 'reading']} />
                            </HStack>
                          </Stack>
                          {cover ? (
                            <BlogCover
                              post={post}
                              w="24"
                              h="16"
                              display={{ base: 'none', sm: 'block' }}
                            />
                          ) : null}
                        </Box>
                      )
                    })}
                  </styled.section>
                )
              })}
              {hasMore ? (
                <Box>
                  <Button variant="outline" onClick={more}>
                    Load older posts
                  </Button>
                </Box>
              ) : null}
            </Stack>
          )}
          <PostCountStatus count={visible.length} topic={topic} topicLabel={topicLabel} />
        </Box>
        {onSubscribe ? (
          <Stack
            as="aside"
            aria-labelledby={subscribeHeadingId}
            gap="2"
            p="3"
            borderWidth="1px"
            borderColor="border"
            bg="gray.surface.bg"
            rounded="l2"
            lg={{ gridColumn: '1' }}
          >
            <Heading as="h2" id={subscribeHeadingId} textStyle="sm">
              Get new posts by email
            </Heading>
            <SubscribeForm onSubscribe={onSubscribe} idPrefix={idPrefix} />
          </Stack>
        ) : null}
      </Box>
    </BlogLayout>
  )
}
