'use client'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button } from '../../../components/ui'
import type { LinkComponent } from '../../auth/types'
import { firstParagraphText, formatCount, vocabulary } from '../content'
import { FollowButton } from '../follow-button'
import { RelativeTime, StaffBadge, TagBadge, UserAvatar } from '../parts'
import { PostBody } from '../post-body'
import { ReplyComposer } from '../reply-composer'
import { ShareButton } from '../share-button'
import type { ForumPost, ForumTopic, ForumUser, VoteDirection } from '../types'
import { VoteColumn } from '../vote-column'

export interface QaAnswerProps {
  post: ForumPost
  /** The comments on this post. */
  children: ForumPost[]
  topic: ForumTopic
  now: string
  viewer?: ForumUser
  role: 'question' | 'answer'
  onVote?: (postId: string, direction: VoteDirection) => Promise<void>
  onAccept?: (postId: string) => Promise<void>
  onReply?: (input: { body: string; parentId?: string }) => Promise<void>
  onFollow?: (topicId: string, following: boolean) => Promise<void>
  linkComponent?: LinkComponent
  commentOpen: boolean
  onOpenComment: () => void
  onCloseComment: () => void
}

/** The question or one answer: vote column, body, actions, author card and comments. */
export function QaAnswer({
  post,
  children,
  topic,
  now,
  viewer,
  role,
  onVote,
  onAccept,
  onReply,
  onFollow,
  commentOpen,
  onOpenComment,
  onCloseComment,
}: QaAnswerProps) {
  const isQuestion = role === 'question'
  const votes = isQuestion ? topic.votes : post.votes
  const { author } = post
  return (
    <Box
      as="article"
      id={`post-${post.id}`}
      display="grid"
      gridTemplateColumns="2.75rem 1fr"
      gap="4"
    >
      <VoteColumn
        score={votes?.score ?? 0}
        viewer={votes?.viewer}
        onVote={onVote ? (direction) => onVote(post.id, direction) : undefined}
        accepted={isQuestion ? undefined : post.accepted}
        onAccept={!isQuestion && onAccept ? () => onAccept(post.id) : undefined}
      />
      <Stack gap="4" minW="0">
        <PostBody blocks={post.body} />
        {isQuestion && topic.tags.length > 0 ? (
          <HStack gap="1.5" flexWrap="wrap">
            {topic.tags.map((tag) => (
              <TagBadge key={tag} tag={{ id: tag }} />
            ))}
          </HStack>
        ) : null}
        <HStack gap="3" flexWrap="wrap" textStyle="xs">
          <ShareButton href={isQuestion ? undefined : `#post-${post.id}`} />
          {isQuestion ? (
            <FollowButton
              following={topic.following}
              labels={{ off: vocabulary.qa.followOff, on: vocabulary.qa.followOn }}
              onFollow={onFollow ? (next) => onFollow(topic.id, next) : undefined}
            />
          ) : null}
        </HStack>
        <HStack justify="flex-end">
          <HStack gap="2" bg="gray.surface.bg" borderRadius="l2" px="3" py="2">
            <styled.span textStyle="xs" color="fg.subtle">
              {isQuestion ? 'asked ' : 'answered '}
              <RelativeTime iso={post.postedAt} now={now} />
            </styled.span>
            <UserAvatar user={author} size="sm" />
            <styled.span textStyle="sm" fontWeight="semibold">
              {author.name}
            </styled.span>
            {author.role === 'staff' ? (
              <StaffBadge />
            ) : author.reputation !== undefined ? (
              <styled.span textStyle="xs" color="fg.subtle">
                {formatCount(author.reputation)} rep
              </styled.span>
            ) : null}
          </HStack>
        </HStack>
        {children.length > 0 ? (
          <styled.ul aria-label="Comments" m="0" p="0" textStyle="xs">
            {children.map((child) => (
              <styled.li
                key={child.id}
                listStyle="none"
                py="2"
                borderTopWidth="1px"
                borderColor="border"
              >
                <styled.span fontWeight="medium">{child.author.name}</styled.span>{' '}
                {firstParagraphText(child)} · <RelativeTime iso={child.postedAt} now={now} />
              </styled.li>
            ))}
          </styled.ul>
        ) : null}
        {onReply ? (
          commentOpen ? (
            <ReplyComposer
              variant="qa"
              kind="comment"
              idPrefix={`comment-${post.id}`}
              viewer={viewer}
              autoFocus
              onCancel={onCloseComment}
              onSubmit={async (body) => {
                await onReply({ body, parentId: post.id })
                onCloseComment()
              }}
            />
          ) : (
            <div>
              <Button variant="plain" size="xs" onClick={onOpenComment}>
                Add a comment
              </Button>
            </div>
          )
        ) : null}
      </Stack>
    </Box>
  )
}
