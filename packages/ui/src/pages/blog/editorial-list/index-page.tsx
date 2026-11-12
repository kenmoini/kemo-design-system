'use client'
import { css } from '../../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Badge, Button, Heading, Text } from '../../../components/ui'
import { EmptyState } from '../../../widgets'
import type { LinkComponent } from '../../auth/types'
import { BlogLayout } from '../blog-layout'
import { countLabel, featuredPost } from '../content'
import { HostLink } from '../host-link'
import { PostCountStatus } from '../post-count-status'
import { Byline, PostDate, TopicBadge } from '../post-meta'
import type { BlogIndexPageProps, BlogPost } from '../types'
import { useReveal } from '../use-reveal'
import { useTopicFilter } from '../use-topic-filter'

// The title link covers its whole block, so the block is one target without nesting controls.
const stretchedLink = css({
  color: 'inherit',
  textDecoration: 'none',
  _after: { content: '""', position: 'absolute', inset: '0', borderRadius: 'l2' },
  _focusVisible: { outline: 'none', _after: { outline: '2px solid', outlineOffset: '2px' } },
})

function FeatureBlock({
  post,
  href,
  linkComponent,
}: {
  post: BlogPost
  href: string
  linkComponent?: LinkComponent
}) {
  return (
    <Box
      className="dark"
      colorScheme="dark"
      bgGradient="auth"
      color="fg.default"
      position="relative"
      borderRadius="l2"
      p={{ base: '5', sm: '6' }}
      mt="6"
      display="flex"
      flexDirection="column"
      gap="3"
      alignItems="flex-start"
    >
      <HStack gap="2">
        <Badge variant="solid" size="sm">
          Featured
        </Badge>
        <TopicBadge topic={post.topic} />
      </HStack>
      <Heading as="h2" textStyle={{ base: 'xl', sm: '2xl' }} letterSpacing="-0.02em" maxW="24ch">
        <HostLink as={linkComponent} href={href} className={stretchedLink}>
          {post.title}
        </HostLink>
      </Heading>
      <Text color="fg.muted" textStyle="sm" maxW="56ch">
        {post.summary}
      </Text>
      <Byline post={post} />
    </Box>
  )
}

function PostRow({
  post,
  href,
  linkComponent,
}: {
  post: BlogPost
  href: string
  linkComponent?: LinkComponent
}) {
  return (
    <styled.li borderBottomWidth="1px" borderColor="border" listStyle="none">
      <Box
        as="article"
        position="relative"
        display="grid"
        py="4"
        gap={{ base: '1', sm: '4' }}
        gridTemplateColumns={{ base: '1fr', sm: '5.25rem 1fr auto' }}
        alignItems="start"
      >
        <styled.span
          textStyle="xs"
          color="fg.subtle"
          pt={{ sm: '0.5' }}
          style={{ fontVariantNumeric: 'tabular-nums' }}
        >
          <PostDate iso={post.publishedAt} short />
        </styled.span>
        <Stack gap="1">
          <Heading as="h2" textStyle="md" letterSpacing="-0.01em">
            <HostLink as={linkComponent} href={href} className={stretchedLink}>
              {post.title}
            </HostLink>
          </Heading>
          <Text color="fg.muted" textStyle="sm" maxW="58ch">
            {post.summary}
          </Text>
          <Box mt="2">
            <Byline post={post} show={['avatar', 'author', 'reading']} />
          </Box>
        </Stack>
        <Box pt={{ base: '1', sm: '0' }}>
          <TopicBadge topic={post.topic} />
        </Box>
      </Box>
    </styled.li>
  )
}

export function EditorialListIndex(props: BlogIndexPageProps) {
  const { title, description, posts, postHref, linkComponent } = props
  // `props` goes in whole: the hook tells a controlled `topic` from an absent one by its key.
  const { sorted, topics, topic, topicLabel, visible, setTopic } = useTopicFilter(posts, props)
  const feature = topic === undefined && sorted.length > 0 ? featuredPost(sorted) : undefined
  const rows = feature ? visible.filter((p) => p.slug !== feature.slug) : visible
  const { shown, hasMore, more } = useReveal(rows.length, 6, topic)

  return (
    <BlogLayout {...props}>
      <Box maxW="45rem" mx="auto" px={{ base: '4', sm: '7' }} pt="8" pb="7">
        <styled.h1
          textStyle={{ base: '3xl', md: '4xl' }}
          fontWeight="semibold"
          letterSpacing="-0.025em"
        >
          {title}
        </styled.h1>
        {description ? (
          <Text color="fg.muted" textStyle="sm" mt="2" maxW="52ch">
            {description}
          </Text>
        ) : null}
        {posts.length === 0 ? (
          <Box mt="6">
            <EmptyState message="No posts yet." />
          </Box>
        ) : (
          <>
            {feature ? (
              <FeatureBlock post={feature} href={postHref(feature)} linkComponent={linkComponent} />
            ) : null}
            <Box
              display="flex"
              justifyContent="space-between"
              alignItems="center"
              gap="3"
              mt="6"
              mb="1"
            >
              <HStack role="group" aria-label="Topics" gap="2" flexWrap="wrap">
                <Button
                  size="xs"
                  variant={topic === undefined ? 'solid' : 'outline'}
                  aria-pressed={topic === undefined}
                  onClick={() => setTopic(undefined)}
                >
                  All
                </Button>
                {topics.map((t) => (
                  <Button
                    key={t.id}
                    size="xs"
                    variant={topic === t.id ? 'solid' : 'outline'}
                    aria-pressed={topic === t.id}
                    onClick={() => setTopic(t.id)}
                  >
                    {t.label}
                  </Button>
                ))}
              </HStack>
              <Text textStyle="xs" color="fg.subtle" flexShrink="0">
                {countLabel(visible.length)}
              </Text>
              <PostCountStatus count={visible.length} topic={topic} topicLabel={topicLabel} />
            </Box>
            {visible.length === 0 ? (
              <Box mt="4">
                <EmptyState
                  message="No posts in this topic."
                  action={{ label: 'Show all posts', onSelect: () => setTopic(undefined) }}
                />
              </Box>
            ) : (
              <styled.ul m="0" p="0" borderTopWidth="1px" borderColor="border" mt="3">
                {rows.slice(0, shown).map((post) => (
                  <PostRow
                    key={post.slug}
                    post={post}
                    href={postHref(post)}
                    linkComponent={linkComponent}
                  />
                ))}
              </styled.ul>
            )}
            {hasMore ? (
              <Box mt="5">
                <Button variant="outline" onClick={more}>
                  Older posts
                </Button>
              </Box>
            ) : null}
          </>
        )}
      </Box>
    </BlogLayout>
  )
}
