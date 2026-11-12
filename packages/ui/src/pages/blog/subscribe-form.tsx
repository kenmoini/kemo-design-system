'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { Stack } from '../../../styled-system/jsx'
import { Button, Field, Input, Text } from '../../components/ui'
import { FormAlert } from '../auth/form-alert'
import { emailSchema } from '../auth/schemas'

const subscribeSchema = z.object({ email: emailSchema })
type SubscribeValues = z.infer<typeof subscribeSchema>

export interface SubscribeFormProps {
  /** Resolve to confirm; reject (an `Error` message is shown) to keep the form and report why. */
  onSubscribe: (email: string) => Promise<void>
  /** Prefix for the field id, so two forms on one page do not share a label target. */
  idPrefix?: string
}

/** An email field over a Subscribe button; the confirmation replaces the form on success. */
export function SubscribeForm({ onSubscribe, idPrefix = 'subscribe' }: SubscribeFormProps) {
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

  // The confirmation replaces the form, and with it the focused button: move focus to the message
  // so it does not fall to the page (or out of the dialog's content).
  const confirmationRef = useRef<HTMLParagraphElement>(null)
  useEffect(() => {
    if (confirmedEmail !== null) confirmationRef.current?.focus()
  }, [confirmedEmail])

  if (confirmedEmail !== null) {
    return (
      // Focusable only from script, so no ring: it is not a control.
      <Text ref={confirmationRef} role="status" tabIndex={-1} outline="none" textStyle="sm">
        Thanks. Check {confirmedEmail} to confirm.
      </Text>
    )
  }

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
        <Button type="submit" size="sm" loading={isSubmitting}>
          Subscribe
        </Button>
      </Stack>
    </form>
  )
}
