'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Grid, Stack } from '../../../../styled-system/jsx'
import {
  type OidcProviderEditValues,
  type OidcProviderValues,
  oidcProviderDefaults,
  oidcProviderEditSchema,
  oidcProviderSchema,
} from '../schemas'
import {
  FormError,
  FormFooter,
  PasswordField,
  SwitchField,
  TagsField,
  TextField,
  useFormSubmit,
} from './form-fields'

export type OidcProviderFormProps = {
  /** Starting values (Edit); missing ones come from `oidcProviderDefaults`. */
  defaultValues?: Partial<OidcProviderValues>
  submitLabel: string
  onCancel: () => void
} & (
  | {
      /** The client secret is required. */
      mode: 'create'
      /** Resolve to close the dialog; reject to keep the input and show the error's message. */
      onSubmit: (values: OidcProviderValues) => void | Promise<void>
    }
  | {
      /** A blank secret keeps the current one: `clientSecret` is then left out of the values. */
      mode: 'edit'
      /** Resolve to close the dialog; reject to keep the input and show the error's message. */
      onSubmit: (values: OidcProviderEditValues) => void | Promise<void>
    }
)

/**
 * Add or edit an OIDC provider: name, issuer URL, client id and secret, the scopes to ask for, the
 * claim that carries a user's groups, and whether a first sign-in creates the account.
 */
export function OidcProviderForm(props: OidcProviderFormProps) {
  const { mode, defaultValues, submitLabel, onCancel } = props
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OidcProviderValues, unknown, OidcProviderEditValues>({
    resolver:
      mode === 'create' ? zodResolver(oidcProviderSchema) : zodResolver(oidcProviderEditSchema),
    defaultValues: { ...oidcProviderDefaults, ...defaultValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit((values: OidcProviderEditValues) =>
    // On create the schema has required the secret, so the values carry it.
    props.mode === 'create' ? props.onSubmit(values as OidcProviderValues) : props.onSubmit(values),
  )

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack gap="4">
        <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
          <TextField
            label="Name"
            required
            autoComplete="off"
            placeholder="Okta"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Issuer URL"
            type="url"
            required
            autoComplete="off"
            placeholder="https://acme.okta.com"
            error={errors.issuer?.message}
            {...register('issuer')}
          />
          <TextField
            label="Client id"
            required
            autoComplete="off"
            error={errors.clientId?.message}
            {...register('clientId')}
          />
          <PasswordField
            label="Client secret"
            required={mode === 'create'}
            autoComplete="new-password"
            helper={mode === 'edit' ? 'Leave blank to keep the current secret' : undefined}
            error={errors.clientSecret?.message}
            {...register('clientSecret')}
          />
        </Grid>
        <Controller
          control={control}
          name="scopes"
          render={({ field, fieldState }) => (
            <TagsField
              label="Scopes"
              placeholder="Add a scope"
              helper="Type a scope and press Enter."
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextField
          label="Group claim"
          autoComplete="off"
          helper="The ID token claim that lists a user's groups; leave blank to map no groups."
          error={errors.groupClaim?.message}
          {...register('groupClaim')}
        />
        <Controller
          control={control}
          name="autoCreateUsers"
          render={({ field }) => (
            <SwitchField
              label="Create users on first sign-in"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FormError message={error} />
        <FormFooter onCancel={onCancel} submitLabel={submitLabel} submitting={isSubmitting} />
      </Stack>
    </form>
  )
}
