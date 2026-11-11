'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Stack } from '../../../../styled-system/jsx'
import type { Option } from '../../../widgets'
import { type GroupValues, groupDefaults, groupSchema } from '../schemas'
import {
  FormError,
  FormFooter,
  MultiSelectField,
  TextareaField,
  TextField,
  useFormSubmit,
} from './form-fields'

export interface GroupFormProps {
  /** Starting values (Edit, Clone); missing ones come from `groupDefaults`. */
  defaultValues?: Partial<GroupValues>
  submitLabel: string
  /** Resolve to close the dialog; reject to keep the input and show the error's message. */
  onSubmit: (values: GroupValues) => void | Promise<void>
  onCancel: () => void
  roles: Option[]
}

/** Add or edit a group: name, description and the roles it grants. */
export function GroupForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  roles,
}: GroupFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GroupValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { ...groupDefaults, ...defaultValues },
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
        <Controller
          control={control}
          name="roles"
          render={({ field, fieldState }) => (
            <MultiSelectField
              ref={field.ref}
              label="Roles"
              options={roles}
              placeholder="Add a role…"
              helper="Members of the group get these roles."
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <FormError message={error} />
        <FormFooter onCancel={onCancel} submitLabel={submitLabel} submitting={isSubmitting} />
      </Stack>
    </form>
  )
}
