'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { HStack, Stack } from '../../../styled-system/jsx'
import { Button, Checkbox, Text } from '../../components/ui'
import { AuthLayout } from './auth-layout'
import { AuthLink } from './auth-link'
import { FormAlert } from './form-alert'
import { PasswordField } from './password-field'
import { ProviderButtons } from './provider-buttons'
import { registerSchema, type RegisterValues } from './schemas'
import { TextField } from './text-field'
import type { AuthProvider, AuthShellProps } from './types'

export type RegisterPageProps = AuthShellProps & {
  onSubmit: (values: RegisterValues) => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
  providers?: AuthProvider[]
  links: { signIn: string; terms: string; privacy: string }
}

/** Registration page: profile, credentials and terms acceptance, with optional single sign-on. */
export function RegisterPage({
  onSubmit,
  isSubmitting,
  error,
  providers,
  links,
  linkComponent,
  ...shell
}: RegisterPageProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: { acceptTerms: false },
  })
  const termsErrorId = useId()
  const submitting = isSubmitting ?? formSubmitting

  return (
    <AuthLayout
      {...shell}
      linkComponent={linkComponent}
      title="Create your account"
      extras={
        <Stack gap="4">
          <ProviderButtons providers={providers} verb="Sign up" />
          <Text textStyle="sm">
            Already have an account?{' '}
            <AuthLink href={links.signIn} linkComponent={linkComponent}>
              Sign in
            </AuthLink>
          </Text>
        </Stack>
      }
    >
      <form noValidate onSubmit={handleSubmit(async (values) => onSubmit(values))}>
        <Stack gap="4">
          <FormAlert message={error} />
          <HStack gap="4" alignItems="flex-start">
            <TextField
              label="First name"
              autoComplete="given-name"
              error={errors.firstName?.message}
              {...{ 'data-autofocus': '' }}
              {...register('firstName')}
            />
            <TextField
              label="Last name"
              autoComplete="family-name"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </HStack>
          <TextField
            label="Username"
            autoComplete="username"
            error={errors.username?.message}
            {...register('username')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="email"
            error={errors.email?.message}
            {...register('email')}
          />
          <HStack gap="4" alignItems="flex-start">
            <PasswordField
              label="Password"
              autoComplete="new-password"
              placeholder="At least 12 characters"
              error={errors.password?.message}
              {...register('password')}
            />
            <PasswordField
              label="Confirm password"
              autoComplete="new-password"
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />
          </HStack>
          <Stack gap="1.5">
            {/* value="" makes react-hook-form read this single checkbox as a boolean, not "on" */}
            <Checkbox.Root invalid={!!errors.acceptTerms} value="">
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Label>
                I agree to the{' '}
                <AuthLink href={links.terms} linkComponent={linkComponent}>
                  Terms of Service
                </AuthLink>{' '}
                and{' '}
                <AuthLink href={links.privacy} linkComponent={linkComponent}>
                  Privacy Policy
                </AuthLink>
                .
              </Checkbox.Label>
              <Checkbox.HiddenInput
                aria-describedby={errors.acceptTerms ? termsErrorId : undefined}
                {...register('acceptTerms')}
              />
            </Checkbox.Root>
            {errors.acceptTerms && (
              <Text id={termsErrorId} textStyle="sm" color="error" role="alert">
                {errors.acceptTerms.message}
              </Text>
            )}
          </Stack>
          <Button type="submit" width="full" loading={submitting}>
            Create account
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
