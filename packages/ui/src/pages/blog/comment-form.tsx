'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Box, Stack, styled } from '../../../styled-system/jsx'
import { Button, Field, Input, Text, Textarea } from '../../components/ui'
import { FormAlert } from '../auth/form-alert'

const commentSchema = z.object({
  name: z.string().trim().min(1, 'Enter your name.').max(80, 'Keep your name under 80 characters.'),
  body: z
    .string()
    .trim()
    .min(1, 'Enter a comment.')
    .max(2000, 'Keep your comment under 2000 characters.'),
})
type CommentValues = z.infer<typeof commentSchema>

export interface CommentFormProps {
  onSubmit: (values: { name: string; body: string }) => Promise<void>
  onCancel?: () => void
  submitLabel?: string
  /** Unique per form in a section: the field ids derive from it. */
  idPrefix: string
  /** Focus the first empty field on mount. */
  autoFocus?: boolean
  commentPlaceholder?: string
  /** Shown on the left of the button row; the status or alert replaces it while shown. */
  hint?: string
  defaultName?: string
  onNameChange?: (name: string) => void
}

/** A Name input, a Comment textarea and a submit button; used for the top-level form and replies. */
export function CommentForm({
  onSubmit,
  onCancel,
  submitLabel = 'Post comment',
  idPrefix,
  autoFocus,
  commentPlaceholder = 'Add to the discussion',
  hint,
  defaultName = '',
  onNameChange,
}: CommentFormProps) {
  const [posted, setPosted] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    setFocus,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { name: defaultName, body: '' },
  })

  useEffect(() => {
    if (autoFocus) setFocus(defaultName.trim() ? 'body' : 'name')
    // Only on mount: the form is mounted when its reply opens.
  }, [])

  const message = failure ? null : posted ? 'Comment posted.' : hint

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async (values) => {
        setFailure(null)
        setPosted(false)
        try {
          await onSubmit(values)
        } catch (cause) {
          setFailure(
            cause instanceof Error && cause.message
              ? cause.message
              : 'Your comment could not be posted. Try again.',
          )
          return
        }
        setValue('name', values.name)
        setValue('body', '')
        setPosted(true)
      })}
    >
      <Stack gap="3">
        <Field.Root invalid={!!errors.name} ids={{ control: `${idPrefix}-name` }}>
          <Field.Label>Name</Field.Label>
          <Box maxW="17.5rem">
            <Input
              autoComplete="name"
              placeholder="Your name"
              {...register('name', { onChange: (e) => onNameChange?.(e.target.value) })}
            />
          </Box>
          <Field.ErrorText>{errors.name?.message}</Field.ErrorText>
        </Field.Root>
        <Field.Root invalid={!!errors.body} ids={{ control: `${idPrefix}-body` }}>
          <Field.Label>Comment</Field.Label>
          <Textarea rows={4} placeholder={commentPlaceholder} {...register('body')} />
          <Field.ErrorText>{errors.body?.message}</Field.ErrorText>
        </Field.Root>
        <FormAlert message={failure} />
        <Box display="flex" alignItems="center" justifyContent="space-between" gap="3">
          {posted && !failure ? (
            <Text role="status" textStyle="xs" color="fg.muted">
              {message}
            </Text>
          ) : (
            <styled.span textStyle="xs" color="fg.subtle">
              {failure ? null : message}
            </styled.span>
          )}
          <Box display="flex" gap="2" ml="auto">
            {onCancel ? (
              <Button type="button" variant="outline" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            ) : null}
            <Button type="submit" size="sm" loading={isSubmitting}>
              {submitLabel}
            </Button>
          </Box>
        </Box>
      </Stack>
    </form>
  )
}
