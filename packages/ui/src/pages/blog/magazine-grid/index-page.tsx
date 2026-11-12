'use client'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Box, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Heading, IconButton, Pagination, Tabs, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets'
import { BlogCover } from '../blog-cover'
import { BlogLayout } from '../blog-layout'
import { countLabel } from '../content'
import { HostLink } from '../host-link'
import { PostCountStatus } from '../post-count-status'
import { Byline, TopicBadge } from '../post-meta'
import type { BlogIndexPageProps } from '../types'
import { useTopicFilter } from '../use-topic-filter'
import { PostCard, cardLink } from './post-card'

const PAGE_SIZE = 6

export function MagazineGridIndex(props: BlogIndexPageProps) {
  const { title, description, posts, postHref, linkComponent } = props
  // `props` goes in whole: the hook tells a controlled `topic` from an absent one by its key.
  const { sorted, topics, topic, topicLabel, visible, setTopic } = useTopicFilter(posts, props)
  const hero = topic === undefined ? sorted[0] : undefined
  const items = hero ? visible.filter((p) => p.slug !== hero.slug) : visible

  // The page belongs to the topic it was chosen in, so a topic change lands on page one.
  const [pageState, setPageState] = useState({ topic, page: 1 })
  const pageCount = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  // Adjusting state during render: any topic change, however it arrives, restarts at page one.
  if (pageState.topic !== topic) setPageState({ topic, page: 1 })
  const page = Math.min(pageState.topic === topic ? pageState.page : 1, pageCount)
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const body =
    visible.length === 0 ? (
      <EmptyState
        message="No posts in this topic."
        action={{ label: 'Show all posts', onSelect: () => setTopic(undefined) }}
      />
    ) : (
      <Stack gap="6">
        <Box
          as="ul"
          m="0"
          p="0"
          display="grid"
          gap="6"
          gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
          listStyleType="none"
        >
          {pageItems.map((post) => (
            <li key={post.slug}>
              <PostCard
                post={post}
                href={postHref(post)}
                linkComponent={linkComponent}
                headingLevel="h2"
              />
            </li>
          ))}
        </Box>
        {pageCount > 1 ? (
          <Pagination.Root
            aria-label="Pagination"
            count={items.length}
            pageSize={PAGE_SIZE}
            page={page}
            siblingCount={1}
            onPageChange={(details) => setPageState({ topic, page: details.page })}
            display="flex"
            alignItems="center"
            justifyContent="center"
            gap="1"
          >
            <Pagination.PrevTrigger asChild>
              <IconButton variant="plain" size="sm" aria-label="Previous page">
                <ChevronLeft />
              </IconButton>
            </Pagination.PrevTrigger>
            <Pagination.Items
              ellipsis={
                <styled.span px="1" color="fg.subtle" textStyle="sm">
                  …
                </styled.span>
              }
              render={(item) => (
                <Button variant={item.selected ? 'outline' : 'plain'} size="sm">
                  {item.value}
                </Button>
              )}
            />
            <Pagination.NextTrigger asChild>
              <IconButton variant="plain" size="sm" aria-label="Next page">
                <ChevronRight />
              </IconButton>
            </Pagination.NextTrigger>
          </Pagination.Root>
        ) : null}
      </Stack>
    )

  const known = topic === undefined || topics.some((t) => t.id === topic)

  return (
    <BlogLayout {...props}>
      <Box maxW="72rem" mx="auto" px={{ base: '4', sm: '7' }} pt="8" pb="8">
        <styled.h1 srOnly>{title}</styled.h1>
        {description ? <Text srOnly>{description}</Text> : null}
        {posts.length === 0 ? (
          <EmptyState message="No posts yet." />
        ) : (
          <>
            {hero ? (
              <Box
                as="article"
                position="relative"
                display="grid"
                gap={{ base: '5', md: '7' }}
                gridTemplateColumns={{ base: '1fr', md: '1.25fr 1fr' }}
                alignItems="center"
              >
                <BlogCover post={hero} aspectRatio="5 / 3" w="full" />
                <Stack gap="3" alignItems="flex-start">
                  <TopicBadge topic={hero.topic} />
                  <Heading
                    as="h2"
                    textStyle={{ base: '2xl', md: '3xl' }}
                    letterSpacing="-0.025em"
                    lineHeight="1.12"
                  >
                    <HostLink as={linkComponent} href={postHref(hero)} className={cardLink}>
                      {hero.title}
                    </HostLink>
                  </Heading>
                  <Text color="fg.muted" textStyle="md">
                    {hero.summary}
                  </Text>
                  <Byline post={hero} />
                </Stack>
              </Box>
            ) : null}
            <Tabs.Root
              variant="line"
              value={topic ?? 'all'}
              onValueChange={(details) =>
                setTopic(details.value === 'all' ? undefined : details.value)
              }
              lazyMount
              unmountOnExit
              mt={hero ? '8' : '0'}
            >
              <Box
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="4"
                borderBottomWidth="1px"
                borderColor="border"
              >
                <Tabs.List
                  flex="1"
                  minW="0"
                  overflowX="auto"
                  _horizontal={{ borderBottomWidth: '0' }}
                >
                  <Tabs.Trigger value="all">All posts</Tabs.Trigger>
                  {topics.map((t) => (
                    <Tabs.Trigger key={t.id} value={t.id}>
                      {t.label}
                    </Tabs.Trigger>
                  ))}
                  <Tabs.Indicator />
                </Tabs.List>
                <Text textStyle="xs" color="fg.subtle" flexShrink="0">
                  {countLabel(visible.length)}
                </Text>
              </Box>
              <PostCountStatus count={visible.length} topic={topic} topicLabel={topicLabel} />
              <Tabs.Content value="all" pt="6">
                {known ? body : null}
              </Tabs.Content>
              {topics.map((t) => (
                <Tabs.Content key={t.id} value={t.id} pt="6">
                  {known ? body : null}
                </Tabs.Content>
              ))}
            </Tabs.Root>
            {known ? null : <Box pt="6">{body}</Box>}
          </>
        )}
      </Box>
    </BlogLayout>
  )
}
