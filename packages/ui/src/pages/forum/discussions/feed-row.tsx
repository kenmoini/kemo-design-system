import { css } from '../../../../styled-system/css'
import { Box, HStack, styled } from '../../../../styled-system/jsx'
import type { LinkComponent } from '../../auth/types'
import { HostLink } from '../../blog/host-link'
import { reactionTotalOf, replyCountOf } from '../content'
import { CategoryBadge, Count, RelativeTime, StatusBadge, UserAvatar } from '../parts'
import type { ForumCategory, ForumTopic } from '../types'

export interface FeedRowProps {
  topic: ForumTopic
  category?: ForumCategory
  href: string
  categoryHref?: string
  linkComponent?: LinkComponent
  now: string
  /** The pinned topic under Latest: a tinted row. */
  pinned?: boolean
}

const titleLink = css({
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px', rounded: 'l1' },
})

/** One discussion in the feed: author avatar, title, excerpt and meta, then replies and reactions. */
export function FeedRow({
  topic,
  category,
  href,
  categoryHref,
  linkComponent,
  now,
  pinned = false,
}: FeedRowProps) {
  const replies = replyCountOf(topic)
  const reactions = reactionTotalOf(topic)
  return (
    <styled.li
      listStyle="none"
      borderBottomWidth={pinned ? '0' : '1px'}
      borderColor="border"
      bg={pinned ? 'gray.surface.bg' : undefined}
      mx={pinned ? '-3' : undefined}
      px={pinned ? '3' : undefined}
      borderRadius={pinned ? 'l2' : undefined}
    >
      <Box
        as="article"
        display="grid"
        gridTemplateColumns={{ base: '1.75rem 1fr', md: '1.75rem 1fr 5.5rem' }}
        gap="3"
        py="4"
      >
        <UserAvatar user={topic.author} size="sm" />
        <Box minW="0">
          <styled.h3 textStyle="md" fontWeight="semibold">
            <HostLink as={linkComponent} href={href} className={titleLink}>
              {topic.title}
            </HostLink>
          </styled.h3>
          <styled.p color="fg.muted" textStyle="sm" lineClamp="2">
            {topic.excerpt}
          </styled.p>
          <HStack gap="2" flexWrap="wrap" mt="2" textStyle="xs" color="fg.subtle">
            <StatusBadge topic={topic} />
            {category ? (
              <CategoryBadge
                category={category}
                href={categoryHref}
                linkComponent={linkComponent}
              />
            ) : null}
            <span>
              {topic.author.name} · <RelativeTime iso={topic.lastActivityAt} now={now} />
            </span>
          </HStack>
        </Box>
        <Box
          gridColumn={{ base: '2', md: 'auto' }}
          textAlign={{ base: 'start', md: 'end' }}
          textStyle="xs"
          color="fg.muted"
        >
          <div>
            <Count value={replies} /> {replies === 1 ? 'reply' : 'replies'}
          </div>
          {reactions > 0 ? (
            <div>
              <span aria-hidden="true">👍</span> <Count value={reactions} />
            </div>
          ) : null}
        </Box>
      </Box>
    </styled.li>
  )
}
