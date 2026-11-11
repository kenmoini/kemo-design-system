'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Grid, Stack } from '../../../../styled-system/jsx'
import type { Option } from '../../../widgets'
import { type UserValues, userDefaults, userSchema } from '../schemas'
import {
  FormError,
  FormFooter,
  MultiSelectField,
  SelectField,
  SwitchField,
  TextField,
  useFormSubmit,
} from './form-fields'

const SOURCE_OPTIONS: Option[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'oidc', label: 'OIDC' },
]

export interface UserFormProps {
  /** Starting values (Edit, Clone); missing ones come from `userDefaults`. */
  defaultValues?: Partial<UserValues>
  submitLabel: string
  /** Resolve to close the dialog; reject to keep the input and show the error's message. */
  onSubmit: (values: UserValues) => void | Promise<void>
  onCancel: () => void
  roles: Option[]
  groups: Option[]
}

/** Add or edit a user: name, email, role, source, groups and whether to send the invite now. */
export function UserForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  roles,
  groups,
}: UserFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UserValues>({
    resolver: zodResolver(userSchema),
    defaultValues: { ...userDefaults, ...defaultValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit(onSubmit)

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack gap="4">
        <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
          <TextField
            label="Full name"
            autoComplete="off"
            error={errors.name?.message}
            {...register('name')}
          />
          <TextField
            label="Email"
            type="email"
            autoComplete="off"
            error={errors.email?.message}
            {...register('email')}
          />
        </Grid>
        <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Role"
                options={roles}
                placeholder="Choose a role"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="source"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Source"
                options={SOURCE_OPTIONS}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </Grid>
        <Controller
          control={control}
          name="groups"
          render={({ field, fieldState }) => (
            <MultiSelectField
              ref={field.ref}
              label="Groups"
              options={groups}
              placeholder="Add a group…"
              helper="Groups grant roles; you can change them later."
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="sendInvite"
          render={({ field }) => (
            <SwitchField
              label="Send the invite email now"
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
