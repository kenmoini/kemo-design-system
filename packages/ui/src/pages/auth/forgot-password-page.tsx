'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Stack } from '../../../styled-system/jsx'
import { Button, Text } from '../../components/ui'
import { AuthLayout } from './auth-layout'
import { AuthLink } from './auth-link'
import { FormAlert } from './form-alert'
import { forgotPasswordSchema, type ForgotPasswordValues } from './schemas'
import { TextField } from './text-field'
import type { AuthShellProps } from './types'

export type ForgotPasswordPageProps = AuthShellProps & {
  onSubmit: (values: ForgotPasswordValues) => void | Promise<void>
  /** Called with whatever `onSubmit` rejects with; the form stays put and shows `error`. */
  onSubmitError?: (error: unknown) => void
  isSubmitting?: boolean
  error?: string | null
  /** Force the confirmation state on or off; by default it follows a successful submit. */
  sent?: boolean
  links: { signIn: string }
}

/** Forgot-password page: request a reset link, then confirm that it is on its way. */
export function ForgotPasswordPage({
  onSubmit,
  onSubmitError,
  isSubmitting,
  error,
  sent,
  links,
  linkComponent,
  ...shell
}: ForgotPasswordPageProps) {
  const [sentEmail, setSentEmail] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const submitting = isSubmitting ?? formSubmitting
  const showSent = sent ?? sentEmail !== null

  const extras = (
    <Text textStyle="sm">
      <AuthLink href={links.signIn} linkComponent={linkComponent}>
        Back to sign in
      </AuthLink>
    </Text>
  )

  if (showSent) {
    return (
      <AuthLayout {...shell} title="Check your email" extras={extras}>
        <Text>
          If an account exists for {sentEmail ?? 'that address'}, a reset link is on its way.
        </Text>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      {...shell}
      title="Reset your password"
      description="Enter your email and we'll send you a link to choose a new one."
      extras={extras}
    >
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          try {
            await onSubmit(values)
          } catch (cause) {
            // The host reports failures through `error`; stay on the form.
            onSubmitError?.(cause)
            return
          }
          setSentEmail(values.email)
        })}
      >
        <Stack gap="4">
          <FormAlert message={error} />
          <TextField
            label="Email"
            autoComplete="email"
            error={errors.email?.message}
            {...{ 'data-autofocus': '' }}
            {...register('email')}
          />
          <Button type="submit" width="full" loading={submitting}>
            Send reset link
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
