'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Stack } from '../../../styled-system/jsx'
import { Button, Text } from '../../components/ui'
import { AuthLayout } from './auth-layout'
import { AuthLink } from './auth-link'
import { FormAlert } from './form-alert'
import { PasswordField } from './password-field'
import { ProviderButtons } from './provider-buttons'
import { signInSchema, type SignInValues } from './schemas'
import { TextField } from './text-field'
import type { AuthProvider, AuthShellProps } from './types'

export type SignInPageProps = AuthShellProps & {
  onSubmit: (values: SignInValues) => void | Promise<void>
  isSubmitting?: boolean
  error?: string | null
  providers?: AuthProvider[]
  links: { register: string; forgotPassword: string }
}

/** Sign-in page: identifier and password, optional single sign-on, and links to related flows. */
export function SignInPage({
  onSubmit,
  isSubmitting,
  error,
  providers,
  links,
  linkComponent,
  ...shell
}: SignInPageProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting: formSubmitting },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const submitting = isSubmitting ?? formSubmitting

  return (
    <AuthLayout
      {...shell}
      linkComponent={linkComponent}
      title="Welcome back"
      description="Sign in to continue."
      extras={
        <Stack gap="4">
          <ProviderButtons providers={providers} verb="Continue" />
          <Text textStyle="sm">
            New here?{' '}
            <AuthLink href={links.register} linkComponent={linkComponent}>
              Create an account
            </AuthLink>
          </Text>
          <Text textStyle="sm">
            <AuthLink href={links.forgotPassword} linkComponent={linkComponent}>
              Forgot your password?
            </AuthLink>
          </Text>
        </Stack>
      }
    >
      <form noValidate onSubmit={handleSubmit(async (values) => onSubmit(values))}>
        <Stack gap="4">
          <FormAlert message={error} />
          <TextField
            label="Email or username"
            autoComplete="username"
            error={errors.identifier?.message}
            {...{ 'data-autofocus': '' }}
            {...register('identifier')}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />
          <Button type="submit" width="full" loading={submitting}>
            Sign in
          </Button>
        </Stack>
      </form>
    </AuthLayout>
  )
}
