'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Stack } from '../../../../styled-system/jsx'
import { type RoleValues, roleDefaults, roleSchema } from '../schemas'
import type { AccessPermission } from '../types'
import {
  CheckboxListField,
  FormError,
  FormFooter,
  TextareaField,
  TextField,
  useFormSubmit,
} from './form-fields'

export interface RoleFormProps {
  /** Starting values (Edit, Clone); missing ones come from `roleDefaults`. */
  defaultValues?: Partial<RoleValues>
  submitLabel: string
  /** Resolve to close the dialog; reject to keep the input and show the error's message. */
  onSubmit: (values: RoleValues) => void | Promise<void>
  onCancel: () => void
  permissions: AccessPermission[]
}

/** Add or edit a role: name, description and its permissions, grouped by resource. */
export function RoleForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  permissions,
}: RoleFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RoleValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: { ...roleDefaults, ...defaultValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit(onSubmit)
  const sections = useMemo(() => {
    const byResource = new Map<string, { value: string; label: string }[]>()
    for (const permission of permissions) {
      const list = byResource.get(permission.resource) ?? []
      list.push({ value: permission.id, label: permission.name })
      byResource.set(permission.resource, list)
    }
    return [...byResource].map(([heading, options]) => ({ heading, options }))
  }, [permissions])

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
          name="permissions"
          render={({ field, fieldState }) => (
            <CheckboxListField
              ref={field.ref}
              legend="Permissions"
              required
              sections={sections}
              value={field.value}
              onChange={field.onChange}
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
