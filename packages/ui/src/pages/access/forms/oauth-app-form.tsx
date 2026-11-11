'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Stack } from '../../../../styled-system/jsx'
import type { Option } from '../../../widgets'
import { type OAuthAppValues, oauthAppDefaults, oauthAppSchema } from '../schemas'
import {
  CheckboxListField,
  FormError,
  FormFooter,
  RadioField,
  TagsField,
  TextareaField,
  TextField,
  useFormSubmit,
} from './form-fields'

export interface OAuthAppFormProps {
  /** Starting values (Edit, Clone); missing ones come from `oauthAppDefaults`. */
  defaultValues?: Partial<OAuthAppValues>
  submitLabel: string
  /** Resolve to close the dialog; reject to keep the input and show the error's message. */
  onSubmit: (values: OAuthAppValues) => void | Promise<void>
  onCancel: () => void
  scopes: Option[]
}

export const oauthTypeOptions: Option[] = [
  { value: 'web', label: 'Web' },
  { value: 'native', label: 'Native' },
  { value: 'machine', label: 'Machine' },
]

function isUrl(tag: string): boolean {
  return URL.canParse(tag)
}

/** Add or edit an OAuth app: name, type, redirect URIs, scopes and description. */
export function OAuthAppForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  scopes,
}: OAuthAppFormProps) {
  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OAuthAppValues>({
    resolver: zodResolver(oauthAppSchema),
    defaultValues: { ...oauthAppDefaults, ...defaultValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit(onSubmit)
  const type = watch('type')

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack gap="4">
        <TextField
          label="Name"
          required
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />
        <Controller
          control={control}
          name="type"
          render={({ field, fieldState }) => (
            <RadioField
              label="Type"
              options={oauthTypeOptions}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="redirectUris"
          render={({ field, fieldState }) => (
            <TagsField
              label="Redirect URIs"
              placeholder="https://app.example.com/callback"
              helper={
                type === 'machine'
                  ? 'Machine apps do not redirect; leave this empty.'
                  : 'Type a URL and press Enter.'
              }
              value={field.value}
              onChange={field.onChange}
              validate={isUrl}
              error={fieldState.error?.message ?? errors.redirectUris?.root?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="scopes"
          render={({ field, fieldState }) => (
            <CheckboxListField
              legend="Scopes"
              sections={[{ options: scopes }]}
              value={field.value}
              onChange={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextareaField
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />
        <FormError message={error} />
        <FormFooter onCancel={onCancel} submitLabel={submitLabel} submitting={isSubmitting} />
      </Stack>
    </form>
  )
}
