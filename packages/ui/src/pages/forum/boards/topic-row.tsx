import { Box, HStack, styled } from '../../../../styled-system/jsx'
import { css } from '../../../../styled-system/css'
import type { LinkComponent } from '../../auth/types'
import { HostLink } from '../../blog/host-link'
import { abbreviate, formatCount, replyCountOf } from '../content'
import { CategoryBadge, Count, RelativeTime, StatusBadge, TagBadge, UserAvatar } from '../parts'
import type { ForumCategory, ForumTopic } from '../types'

export interface BoardsTopicRowProps {
  topic: ForumTopic
  category?: ForumCategory
  href: string
  linkComponent?: LinkComponent
  now: string
  /** The heading level of the title: 2 under a page `h1`, 3 under a section `h2`. Default 3. */
  headingLevel?: 2 | 3
  /** Shows the category badge (search results list topics from every category). */
  showCategory?: boolean
}

const titleLink = css({
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px', rounded: 'l1' },
})

/** One topic in a list: avatar, title with badges and excerpt, replies, views, last activity. */
export function BoardsTopicRow({
  topic,
  category,
  href,
  linkComponent,
  now,
  showCategory = false,
  headingLevel = 3,
}: BoardsTopicRowProps) {
  const replies = replyCountOf(topic)
  const Title = headingLevel === 2 ? styled.h2 : styled.h3
  return (
    <styled.li listStyle="none" borderBottomWidth="1px" borderColor="border">
      <Box
        as="article"
        display="grid"
        py="3"
        columnGap="3"
        rowGap="1"
        alignItems="start"
        gridTemplateColumns={{ base: '2rem 1fr', md: '2rem 1fr 4.5rem 4.5rem 13rem' }}
      >
        <UserAvatar user={topic.author} size="sm" />
        <Box minW="0">
          <HStack gap="2" flexWrap="wrap">
            <Title textStyle="sm" fontWeight="medium">
              <HostLink as={linkComponent} href={href} className={titleLink}>
                {topic.title}
              </HostLink>
            </Title>
            <StatusBadge topic={topic} />
            {showCategory && category ? <CategoryBadge category={category} /> : null}
            {topic.tags.map((tag) => (
              <TagBadge key={tag} tag={{ id: tag }} />
            ))}
          </HStack>
          <styled.p
            textStyle="sm"
            color="fg.muted"
            overflow="hidden"
            textOverflow="ellipsis"
            whiteSpace="nowrap"
          >
            {topic.excerpt}
          </styled.p>
          <styled.p textStyle="xs" color="fg.muted" mt="1" display={{ base: 'block', md: 'none' }}>
            {formatCount(replies)} {replies === 1 ? 'reply' : 'replies'} ·{' '}
            {abbreviate(topic.viewCount)} views
          </styled.p>
        </Box>
        <styled.span textStyle="sm" display={{ base: 'none', md: 'block' }} textAlign="end">
          <Count value={replies} />
          <styled.span srOnly>{replies === 1 ? ' reply' : ' replies'}</styled.span>
        </styled.span>
        <styled.span textStyle="sm" display={{ base: 'none', md: 'block' }} textAlign="end">
          <Count value={topic.viewCount} abbreviate />
          <styled.span srOnly>{topic.viewCount === 1 ? ' view' : ' views'}</styled.span>
        </styled.span>
        <HStack
          gap="2"
          gridColumn={{ base: '2', md: 'auto' }}
          textStyle="xs"
          color="fg.muted"
          minW="0"
        >
          <UserAvatar user={topic.author} size="sm" />
          <span>
            {topic.author.name} · <RelativeTime iso={topic.lastActivityAt} now={now} />
          </span>
        </HStack>
      </Box>
    </styled.li>
  )
}
