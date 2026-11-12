'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Box, Stack } from '../../../styled-system/jsx'
import { Button, Field, Input, Text } from '../../components/ui'
import { FormAlert } from '../auth/form-alert'
import { emailSchema } from '../auth/schemas'

const subscribeSchema = z.object({ email: emailSchema })
type SubscribeValues = z.infer<typeof subscribeSchema>

export interface SubscribeFormProps {
  /** Resolve to confirm; reject (an `Error` message is shown) to keep the form and report why. */
  onSubscribe: (email: string) => Promise<void>
  /** `inline` puts the button beside the field; `stacked` puts it underneath. */
  layout?: 'stacked' | 'inline'
  /** Prefix for the field id, so two forms on one page do not share a label target. */
  idPrefix?: string
}

/** An email field and a Subscribe button; the confirmation replaces the form on success. */
export function SubscribeForm({
  onSubscribe,
  layout = 'stacked',
  idPrefix = 'subscribe',
}: SubscribeFormProps) {
  const [confirmedEmail, setConfirmedEmail] = useState<string | null>(null)
  const [failure, setFailure] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubscribeValues>({
    resolver: zodResolver(subscribeSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })

  if (confirmedEmail !== null) {
    return (
      <Text role="status" textStyle="sm">
        Thanks. Check {confirmedEmail} to confirm.
      </Text>
    )
  }

  const field = (
    <Field.Root invalid={!!errors.email} ids={{ control: `${idPrefix}-email` }}>
      <Field.Label>Email</Field.Label>
      <Input
        type="email"
        autoComplete="email"
        placeholder="you@example.com"
        {...register('email')}
      />
      <Field.ErrorText>{errors.email?.message}</Field.ErrorText>
    </Field.Root>
  )
  const submit = (
    <Button type="submit" size="sm" loading={isSubmitting}>
      Subscribe
    </Button>
  )

  return (
    <form
      noValidate
      onSubmit={handleSubmit(async ({ email }) => {
        setFailure(null)
        try {
          await onSubscribe(email)
        } catch (cause) {
          setFailure(cause instanceof Error ? cause.message : 'Something went wrong. Try again.')
          return
        }
        setConfirmedEmail(email)
      })}
    >
      <Stack gap="3">
        <FormAlert message={failure} />
        {layout === 'inline' ? (
          <Box display="flex" gap="2" alignItems="flex-end">
            <Box flex="1">{field}</Box>
            {submit}
          </Box>
        ) : (
          <>
            {field}
            {submit}
          </>
        )}
      </Stack>
    </form>
  )
}
