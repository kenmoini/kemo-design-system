import { CheckIcon } from 'lucide-react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { formatCount, joinedLabel } from '../content'
import { PostBody } from '../post-body'
import { RelativeTime, StaffBadge, UserAvatar } from '../parts'
import { ReactionPills } from '../reactions'
import { ShareButton } from '../share-button'
import type { ForumPost, ForumTopic, ForumUser } from '../types'

export interface BoardsPostProps {
  post: ForumPost
  /** The 1-based position in the topic, across pages. */
  index: number
  topic: ForumTopic
  now: string
  onReact?: (postId: string, emoji: '👍') => Promise<void>
  onQuote?: (post: ForumPost) => void
  onReply?: () => void
}

function Role({ user }: { user: ForumUser }) {
  return user.role === 'staff' ? (
    <StaffBadge />
  ) : (
    <Text textStyle="xs" color="fg.muted">
      Member
    </Text>
  )
}

/** One numbered post: the author column beside the body, with quote, reactions and actions. */
export function BoardsPost({
  post,
  index,
  topic,
  now,
  onReact,
  onQuote,
  onReply,
}: BoardsPostProps) {
  const { author } = post
  const thumbs = post.reactions?.find((r) => r.emoji === '👍')
  const accepted = post.accepted === true

  return (
    <Box
      as="article"
      id={`post-${post.id}`}
      display="grid"
      gridTemplateColumns={{ base: '1fr', md: '9.25rem 1fr' }}
      borderBottomWidth="1px"
      borderColor={accepted ? 'green.6' : 'border'}
      bg={accepted ? 'green.2' : undefined}
      borderRadius={accepted ? 'l2' : undefined}
      scrollMarginTop="20"
    >
      <Box
        display={{ base: 'none', md: 'flex' }}
        flexDirection="column"
        alignItems="flex-start"
        gap="1.5"
        p="4"
        borderRightWidth="1px"
        borderColor="border"
      >
        <UserAvatar user={author} size="md" />
        <Text fontWeight="semibold" textStyle="sm">
          {author.name}
        </Text>
        <Role user={author} />
        {author.joinedAt ? (
          <Text textStyle="xs" color="fg.subtle">
            {joinedLabel(author.joinedAt)}
          </Text>
        ) : null}
        {author.postCount !== undefined ? (
          <Text textStyle="xs" color="fg.subtle">
            {formatCount(author.postCount)} posts
          </Text>
        ) : null}
      </Box>
      <Stack gap="3" p="4" minW="0">
        {accepted ? (
          <HStack gap="1.5" color="green.11" textStyle="xs" fontWeight="medium">
            <CheckIcon size={14} aria-hidden="true" />
            Accepted answer · marked by {topic.author.name}
          </HStack>
        ) : null}
        <HStack justify="space-between" gap="3" textStyle="xs" color="fg.muted">
          <HStack gap="2">
            <Box display={{ base: 'flex', md: 'none' }} alignItems="center" gap="2">
              <UserAvatar user={author} size="xs" />
              <styled.span fontWeight="semibold" color="fg.default">
                {author.name}
              </styled.span>
              <Role user={author} />
            </Box>
            <styled.span fontWeight="medium">
              {index === 1 ? `#${index} · original post` : `#${index}`}
            </styled.span>
          </HStack>
          <RelativeTime iso={post.postedAt} now={now} />
        </HStack>
        {post.quote ? (
          <Box
            as="blockquote"
            m="0"
            borderLeftWidth="2px"
            borderColor="border"
            pl="3"
            display="flex"
            flexDirection="column"
            gap="1"
          >
            <Text textStyle="sm" fontWeight="medium">
              {post.quote.author.name} wrote
            </Text>
            <Text textStyle="sm" color="fg.muted">
              {post.quote.excerpt}
            </Text>
          </Box>
        ) : null}
        <PostBody blocks={post.body} />
        <HStack gap="2" flexWrap="wrap" textStyle="xs">
          <ReactionPills
            reactions={[{ emoji: '👍', count: thumbs?.count ?? 0, reacted: thumbs?.reacted }]}
            onReact={onReact ? () => onReact(post.id, '👍') : undefined}
            addable={false}
            showEmpty
          />
          {onQuote ? (
            <Button variant="plain" size="xs" onClick={() => onQuote(post)}>
              Quote
            </Button>
          ) : null}
          {onReply ? (
            <Button variant="plain" size="xs" onClick={onReply}>
              Reply
            </Button>
          ) : null}
          <ShareButton href={`#post-${post.id}`} />
        </HStack>
      </Stack>
    </Box>
  )
}
