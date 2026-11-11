'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { Grid, Stack } from '../../../../styled-system/jsx'
import type { Option } from '../../../widgets'
import {
  type PermissionValues,
  permissionActions,
  permissionDefaults,
  permissionSchema,
} from '../schemas'
import {
  FormError,
  FormFooter,
  SelectField,
  TextareaField,
  TextField,
  useFormSubmit,
} from './form-fields'

export interface PermissionFormProps {
  /** Starting values (Edit); missing ones come from `permissionDefaults`. */
  defaultValues?: Partial<PermissionValues>
  submitLabel: string
  /** Resolve to close the dialog; reject to keep the input and show the error's message. */
  onSubmit: (values: PermissionValues) => void | Promise<void>
  onCancel: () => void
  resources: string[]
}

const actionOptions: Option[] = permissionActions.map((action) => ({
  value: action,
  label: action,
}))

/** Add or edit a permission: its `resource.action` name, resource, action and description. */
export function PermissionForm({
  defaultValues,
  submitLabel,
  onSubmit,
  onCancel,
  resources,
}: PermissionFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PermissionValues>({
    resolver: zodResolver(permissionSchema),
    defaultValues: { ...permissionDefaults, ...defaultValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit(onSubmit)
  const resourceOptions: Option[] = resources.map((resource) => ({
    value: resource,
    label: resource,
  }))

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack gap="4">
        <TextField
          label="Name"
          required
          autoComplete="off"
          placeholder="deployments.create"
          error={errors.name?.message}
          {...register('name')}
        />
        <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
          <Controller
            control={control}
            name="resource"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Resource"
                required
                options={resourceOptions}
                placeholder="Choose a resource"
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="action"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Action"
                required
                options={actionOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </Grid>
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
