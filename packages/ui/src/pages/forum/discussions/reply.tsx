import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Box, HStack, styled } from '../../../../styled-system/jsx'
import { Button } from '../../../components/ui'
import { AuthorBadge, RelativeTime, StaffBadge, UserAvatar } from '../parts'
import { PostBody } from '../post-body'
import { ReactionPills } from '../reactions'
import type { ForumPost, ForumTopic, ReactionEmoji } from '../types'

export interface DiscussionReplyProps {
  post: ForumPost
  /** The one level of replies under a top-level reply. */
  children?: ForumPost[]
  topic: ForumTopic
  now: string
  onReact?: (postId: string, emoji: ReactionEmoji) => Promise<void>
  /**
   * Opens the inline composer under the top-level reply, given the button pressed (focus goes back
   * to it when the composer closes); absent hides "Reply".
   */
  onReply?: (opener: HTMLButtonElement) => void
  /** The inline composer, rendered under the nested list. */
  composer?: ReactNode
  nested?: boolean
}

function Header({ post, topic, now }: Pick<DiscussionReplyProps, 'post' | 'topic' | 'now'>) {
  return (
    <HStack gap="2" flexWrap="wrap" textStyle="sm">
      <styled.span fontWeight="semibold">{post.author.name}</styled.span>
      {post.author.role === 'staff' ? <StaffBadge /> : null}
      {post.author.id === topic.author.id ? <AuthorBadge /> : null}
      <styled.span color="fg.subtle" textStyle="xs">
        <RelativeTime iso={post.postedAt} now={now} />
        {post.editedAt ? ' · edited' : ''}
      </styled.span>
    </HStack>
  )
}

/** One reply as `li > article`; a top-level reply carries its nested replies and inline composer. */
export function DiscussionReply({
  post,
  children = [],
  topic,
  now,
  onReact,
  onReply,
  composer,
  nested = false,
}: DiscussionReplyProps) {
  const accepted = !nested && post.accepted === true
  const actions = (
    <HStack gap="2" flexWrap="wrap">
      <ReactionPills
        reactions={post.reactions}
        onReact={onReact && ((emoji) => onReact(post.id, emoji))}
      />
      {onReply ? (
        <Button
          variant="plain"
          size="xs"
          aria-label={`Reply to ${post.author.name}`}
          onClick={(event) => onReply(event.currentTarget)}
        >
          Reply
        </Button>
      ) : null}
    </HStack>
  )

  return (
    <styled.li listStyle="none">
      <Box
        as="article"
        id={`post-${post.id}`}
        borderWidth={accepted ? '1px' : undefined}
        borderColor={accepted ? 'green.6' : undefined}
        bg={accepted ? 'green.2' : undefined}
        borderRadius={accepted ? 'l2' : undefined}
        p={accepted ? '4' : undefined}
      >
        {accepted ? (
          <HStack gap="1.5" mb="3" textStyle="xs" fontWeight="semibold" color="green.11">
            <CheckIcon size={14} aria-hidden="true" />
            Answer · marked by {topic.author.name}
          </HStack>
        ) : null}
        <Box display="grid" gridTemplateColumns="1.75rem 1fr" gap="3">
          <UserAvatar user={post.author} size={nested ? 'xs' : 'sm'} />
          <Box minW="0">
            <Header post={post} topic={topic} now={now} />
            <Box mt="1.5">
              <PostBody blocks={post.body} />
            </Box>
            <Box mt="2">{actions}</Box>
            {children.length > 0 ? (
              <styled.ul
                m="0"
                mt="3"
                p="0"
                ml={{ base: '4', md: '10' }}
                pl="4"
                borderLeftWidth="1px"
                borderColor="border"
                display="flex"
                flexDirection="column"
                gap="4"
              >
                {children.map((child) => (
                  <DiscussionReply
                    key={child.id}
                    post={child}
                    topic={topic}
                    now={now}
                    onReact={onReact}
                    onReply={onReply}
                    nested
                  />
                ))}
              </styled.ul>
            ) : null}
          </Box>
        </Box>
      </Box>
      {composer ? <Box mt="3">{composer}</Box> : null}
    </styled.li>
  )
}
