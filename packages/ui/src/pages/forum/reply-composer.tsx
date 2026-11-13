'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { forwardRef, type ReactNode, useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Button, Field, Heading, Input, Text, Textarea } from '../../components/ui'
import { FormAlert } from '../auth/form-alert'
import { vocabulary } from './content'
import { UserAvatar } from './parts'
import type { ForumUser, ForumVariant } from './types'

const replySchema = z.object({
  body: z
    .string()
    .trim()
    .min(2, 'Write at least 2 characters.')
    .max(5000, 'Keep it under 5,000 characters.'),
})
const commentSchema = z.object({
  body: z.string().trim().min(1, 'Write a comment.').max(600, 'Keep it under 600 characters.'),
})
type Values = z.infer<typeof replySchema>

export interface ReplyComposerProps {
  variant: ForumVariant
  /** A reply (textarea) or a one-line comment (Q&A); default reply. */
  kind?: 'reply' | 'comment'
  onSubmit: (body: string) => Promise<void>
  quote?: { author: ForumUser; excerpt: string } | null
  onRemoveQuote?: () => void
  onCancel?: () => void
  /** Unique per composer on a page: the field id derives from it. */
  idPrefix: string
  autoFocus?: boolean
  viewer?: ForumUser
  heading?: ReactNode
}

type Element = HTMLTextAreaElement | HTMLInputElement

/** The reply (or one-line comment) form; the body is plain text and only ever passed to `onSubmit`. */
export const ReplyComposer = forwardRef<Element, ReplyComposerProps>(function ReplyComposer(
  {
    variant,
    kind = 'reply',
    onSubmit,
    quote,
    onRemoveQuote,
    onCancel,
    idPrefix,
    autoFocus,
    viewer,
    heading,
  },
  forwardedRef,
) {
  const isComment = kind === 'comment'
  const [posted, setPosted] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(isComment ? commentSchema : replySchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { body: '' },
  })

  useEffect(() => {
    if (autoFocus) setFocus('body')
    // Only on mount.
  }, [])

  const { ref: registerRef, ...field } = register('body')
  const setRefs = (node: Element | null) => {
    registerRef(node)
    if (typeof forwardedRef === 'function') forwardedRef(node)
    else if (forwardedRef) forwardedRef.current = node
  }

  const submitLabel = isComment ? 'Post' : vocabulary[variant].replySubmit
  const fallback = isComment
    ? 'Your comment could not be posted. Try again.'
    : 'Your reply could not be posted. Try again.'
  const hint = isComment ? null : 'Plain text. Be kind.'
  const showPosted = !failure && posted

  const buttons = (
    <>
      {onCancel ? (
        <Button type="button" variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
      ) : null}
      <Button type="submit" size="sm" loading={isSubmitting}>
        {submitLabel}
      </Button>
    </>
  )

  const form = (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ body }) => {
        setFailure(null)
        setPosted(false)
        try {
          await onSubmit(body)
        } catch (cause) {
          setFailure(cause instanceof Error && cause.message ? cause.message : fallback)
          return
        }
        setValue('body', '')
        onRemoveQuote?.()
        setPosted(true)
      })}
    >
      <Stack gap="3">
        {!isComment && quote ? (
          <Box
            as="blockquote"
            borderLeftWidth="2px"
            borderColor="border"
            pl="3"
            display="flex"
            flexDirection="column"
            gap="1"
          >
            <Text textStyle="sm" fontWeight="medium">
              {quote.author.name} wrote
            </Text>
            <Text textStyle="sm" color="fg.muted">
              {quote.excerpt}
            </Text>
            {onRemoveQuote ? (
              <Box>
                <Button type="button" variant="outline" size="xs" onClick={onRemoveQuote}>
                  Remove quote
                </Button>
              </Box>
            ) : null}
          </Box>
        ) : null}
        <Field.Root invalid={!!errors.body} ids={{ control: `${idPrefix}-body` }}>
          <Field.Label srOnly>{isComment ? 'Comment' : 'Reply'}</Field.Label>
          {isComment ? (
            <HStack gap="2" alignItems="flex-start">
              <Input {...field} ref={setRefs} placeholder={vocabulary[variant].replyPlaceholder} />
              {buttons}
            </HStack>
          ) : (
            <Textarea
              {...field}
              ref={setRefs}
              rows={4}
              placeholder={vocabulary[variant].replyPlaceholder}
            />
          )}
          <Field.ErrorText>{errors.body?.message}</Field.ErrorText>
        </Field.Root>
        <FormAlert message={failure} />
        {isComment ? (
          showPosted ? (
            <Text role="status" textStyle="xs" color="fg.muted">
              Comment posted.
            </Text>
          ) : null
        ) : (
          <Box display="flex" alignItems="center" justifyContent="space-between" gap="3">
            {showPosted ? (
              <Text role="status" textStyle="xs" color="fg.muted">
                {vocabulary[variant].replyPosted}
              </Text>
            ) : (
              <styled.span textStyle="xs" color="fg.subtle">
                {failure ? null : hint}
              </styled.span>
            )}
            <Box display="flex" gap="2" ml="auto">
              {buttons}
            </Box>
          </Box>
        )}
      </Stack>
    </form>
  )

  return (
    <Stack gap="3">
      {heading ? (
        <Heading as="h2" textStyle="lg">
          {heading}
        </Heading>
      ) : null}
      {viewer ? (
        <HStack alignItems="flex-start" gap="3">
          <UserAvatar user={viewer} size="sm" />
          <Box flex="1" minW="0">
            {form}
          </Box>
        </HStack>
      ) : (
        form
      )}
    </Stack>
  )
})
