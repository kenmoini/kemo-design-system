'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Grid, Stack } from '../../../../styled-system/jsx'
import type { Option } from '../../../widgets'
import { type ServiceAccountValues, serviceAccountDefaults, serviceAccountSchema } from '../schemas'
import {
  FormError,
  FormFooter,
  NumberField,
  SelectField,
  TextareaField,
  TextField,
  useFormSubmit,
} from './form-fields'

export interface ServiceAccountFormProps {
  /** Starting values (Edit, Clone); missing ones come from `serviceAccountDefaults`. */
  defaultValues?: Partial<ServiceAccountValues>
  submitLabel: string
  /** Resolve to close the dialog; reject to keep the input and show the error's message. */
  onSubmit: (values: ServiceAccountValues) => void | Promise<void>
  onCancel: () => void
  roles: Option[]
}

/** Add or edit a service account: name, description, role and the token's lifetime in days. */
export function ServiceAccountForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  roles,
}: ServiceAccountFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ServiceAccountValues>({
    resolver: zodResolver(serviceAccountSchema),
    defaultValues: { ...serviceAccountDefaults, ...defaultValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit(onSubmit)

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
        <TextareaField
          label="Description"
          error={errors.description?.message}
          {...register('description')}
        />
        <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
          <Controller
            control={control}
            name="role"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Role"
                required
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
            name="tokenLifetimeDays"
            render={({ field, fieldState }) => (
              <NumberField
                ref={field.ref}
                label="Token lifetime (days)"
                required
                min={1}
                max={365}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </Grid>
        <FormError message={error} />
        <FormFooter onCancel={onCancel} submitLabel={submitLabel} submitting={isSubmitting} />
      </Stack>
    </form>
  )
}
