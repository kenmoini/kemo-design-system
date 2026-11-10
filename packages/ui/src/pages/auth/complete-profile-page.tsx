'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Grid, Stack, styled } from '../../../styled-system/jsx'
import { Button, Text } from '../../components/ui'
import { AuthLayout } from './auth-layout'
import { FormAlert } from './form-alert'
import { completeProfileSchema, type CompleteProfileValues } from './schemas'
import { TextField } from './text-field'
import type { AuthShellProps } from './types'

const IdentityChip = styled('span', {
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2',
    alignSelf: 'flex-start',
    px: '2.5',
    py: '1',
    bg: 'gray.subtle.bg',
    borderRadius: 'l1',
    textStyle: 'xs',
    color: 'fg.muted',
  },
})

const Dot = styled('span', {
  base: { width: '1.5', height: '1.5', borderRadius: 'full', bg: 'gray.9', flexShrink: 0 },
})

/** Accepts `linkComponent` like the other pages for symmetry; it renders no links today. */
export type CompleteProfilePageProps = AuthShellProps & {
  identity: { provider: string; email: string }
  defaultValues?: Partial<CompleteProfileValues>
  onSubmit: (values: CompleteProfileValues) => void | Promise<void>
  /** Called with whatever `onSubmit` rejects with; the form stays put and shows `error`. */
  onSubmitError?: (error: unknown) => void
  isSubmitting?: boolean
  error?: string | null
  onSignOut: () => void
}

/** Post-sign-in page collecting the profile details an identity provider did not supply. */
export function CompleteProfilePage({
  identity,
  defaultValues,
  onSubmit,
  onSubmitError,
  isSubmitting,
  error,
  onSignOut,
  logo,
  brand,
  footer,
}: CompleteProfilePageProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<CompleteProfileValues>({
    resolver: zodResolver(completeProfileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues,
  })
  const submitting = isSubmitting ?? formSubmitting

  return (
    <AuthLayout
      logo={logo}
      brand={brand}
      footer={footer}
      title="Complete your profile"
      description="A few details are missing before you can continue."
      extras={
        <Text textStyle="sm">
          <Button type="button" variant="plain" size="sm" px="0" onClick={onSignOut}>
            Sign out
          </Button>{' '}
          and use a different account
        </Text>
      }
    >
      <form
        noValidate
        onSubmit={handleSubmit(async (values) => {
          try {
            await onSubmit(values)
          } catch (cause) {
            // The host reports failures through `error`; keep the form.
            onSubmitError?.(cause)
          }
        })}
      >
        <Stack gap="4">
          <IdentityChip>
            <Dot aria-hidden />
            Signed in with {identity.provider} as {identity.email}
          </IdentityChip>
          <FormAlert message={error} />
          <TextField
            label="Email"
            readOnly
            value={identity.email}
            helperText="Provided by your identity provider."
          />
          <TextField
            label="Username"
            placeholder="Choose a username"
            autoComplete="username"
            error={errors.username?.message}
            helperText={errors.username ? undefined : 'Letters, numbers and dashes only.'}
            data-autofocus=""
            {...register('username')}
          />
          <Grid columns={{ base: 1, sm: 2 }} gap="4" alignItems="start">
            <TextField
              label="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </Grid>
          <Button type="submit" width="full" loading={submitting}>
            Finish and continue
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
