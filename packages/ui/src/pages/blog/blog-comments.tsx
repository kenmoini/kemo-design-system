'use client'
import { useId, useRef, useState } from 'react'
import { Box, Stack, styled } from '../../../styled-system/jsx'
import { Avatar, Badge, Button, Text } from '../../components/ui'
import { CommentForm } from './comment-form'
import { countComments, formatDate } from './content'
import type { BlogComment } from './types'

export interface BlogCommentsProps {
  comments: BlogComment[]
  /** Resolve to confirm; reject (an `Error` message is shown) to keep the text and report why. */
  onAddComment?: (input: { name: string; body: string; parentId?: string }) => Promise<void>
}

const oldestFirst = (list: BlogComment[]) =>
  [...list].sort((a, b) => Date.parse(a.postedAt) - Date.parse(b.postedAt))

/** The comments section below a post: a form, the comments oldest first and one level of replies. */
export function BlogComments({ comments, onAddComment }: BlogCommentsProps) {
  const prefix = useId()
  const headingId = `${prefix}-heading`
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [posted, setPosted] = useState(false)
  const replyButtons = useRef(new Map<string, HTMLButtonElement>())
  const total = countComments(comments)

  const submit = async (values: { name: string; body: string }, parentId?: string) => {
    await onAddComment!(parentId ? { ...values, parentId } : values)
    setName(values.name)
    setPosted(true)
    if (parentId) {
      // The reply form, and its focused button, unmount: hand focus back as Cancel does.
      setReplyingTo(null)
      replyButtons.current.get(parentId)?.focus()
    }
  }

  const renderComment = (comment: BlogComment, topLevel: boolean) => {
    const open = topLevel && replyingTo === comment.id
    return (
      <styled.li key={comment.id} listStyleType="none">
        <Box display="grid" gridTemplateColumns="2rem 1fr" columnGap="3" pt={topLevel ? '5' : '4'}>
          <Avatar.Root size="xs" aria-hidden="true">
            {comment.author.avatarSrc ? (
              <Avatar.Image src={comment.author.avatarSrc} alt="" />
            ) : null}
            <Avatar.Fallback name={comment.author.name} />
          </Avatar.Root>
          <styled.article minW="0">
            <Box display="flex" alignItems="baseline" flexWrap="wrap" columnGap="2">
              <styled.span textStyle="sm" fontWeight="medium">
                {comment.author.name}
              </styled.span>
              {comment.author.isAuthor ? (
                <Badge variant="subtle" size="sm">
                  Author
                </Badge>
              ) : null}
              <styled.time textStyle="xs" color="fg.subtle" dateTime={comment.postedAt}>
                {formatDate(comment.postedAt)}
              </styled.time>
            </Box>
            <Text textStyle="sm" mt="0.5" whiteSpace="pre-wrap" overflowWrap="anywhere">
              {comment.body}
            </Text>
            {topLevel && onAddComment ? (
              <Box mt="1" ml="-1.5">
                <Button
                  ref={(node) => {
                    if (node) replyButtons.current.set(comment.id, node)
                    else replyButtons.current.delete(comment.id)
                  }}
                  type="button"
                  variant="plain"
                  size="xs"
                  aria-expanded={open}
                  onClick={() => {
                    setPosted(false)
                    setReplyingTo(open ? null : comment.id)
                  }}
                >
                  Reply
                </Button>
              </Box>
            ) : null}
          </styled.article>
        </Box>
        {topLevel && comment.replies?.length ? (
          <styled.ol
            m="0"
            mt="1.5"
            ml="3.5"
            pl="6"
            borderLeftWidth="1px"
            borderColor="border"
            listStyleType="none"
          >
            {oldestFirst(comment.replies).map((reply) => renderComment(reply, false))}
          </styled.ol>
        ) : null}
        {open ? (
          <Box
            mt="3.5"
            ml="10"
            p="3.5"
            borderWidth="1px"
            borderColor="border"
            borderRadius="l2"
            bg="gray.surface.bg"
          >
            <CommentForm
              idPrefix={`${prefix}-reply-${comment.id}`}
              submitLabel="Post reply"
              commentPlaceholder={`Reply to ${comment.author.name}`}
              defaultName={name}
              onNameChange={setName}
              autoFocus
              onSubmit={(values) => submit(values, comment.id)}
              onCancel={() => {
                setReplyingTo(null)
                replyButtons.current.get(comment.id)?.focus()
              }}
            />
          </Box>
        ) : null}
      </styled.li>
    )
  }

  return (
    <styled.section
      id="comments"
      aria-labelledby={headingId}
      maxW="40rem"
      scrollMarginTop="6"
      borderTopWidth="1px"
      borderColor="border"
      pt="10"
      mt="10"
    >
      <styled.h2 id={headingId} textStyle="xl" fontWeight="semibold" mb="4">
        Comments{' '}
        <styled.span color="fg.muted" fontWeight="normal" aria-hidden="true">
          {total}
        </styled.span>
        <styled.span srOnly> ({total})</styled.span>
      </styled.h2>
      {onAddComment ? (
        <Stack
          gap="3"
          pb="5"
          borderBottomWidth={comments.length ? '1px' : '0'}
          borderColor="border"
        >
          <CommentForm
            idPrefix={`${prefix}-new`}
            hint="Plain text. Be kind."
            defaultName={name}
            onNameChange={setName}
            confirmed={posted}
            onSubmit={(values) => submit(values)}
          />
        </Stack>
      ) : null}
      {comments.length ? (
        <styled.ol m="0" p="0" listStyleType="none">
          {oldestFirst(comments).map((comment) => renderComment(comment, true))}
        </styled.ol>
      ) : (
        <Text color="fg.muted" textStyle="sm" pt="4">
          No comments yet.
        </Text>
      )}
    </styled.section>
  )
}
