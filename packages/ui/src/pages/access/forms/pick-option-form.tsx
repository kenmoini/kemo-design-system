'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Stack } from '../../../../styled-system/jsx'
import type { Option } from '../../../widgets'
import { FormError, FormFooter, SelectField, useFormSubmit } from './form-fields'

export interface PickOptionFormProps {
  /** The select's label, e.g. "Role". */
  label: string
  options: Option[]
  placeholder?: string
  submitLabel: string
  /** Shown when nothing is chosen; defaults to "Choose a {label}." */
  requiredMessage?: string
  /** Resolve to close the dialog; reject to show the error's message. */
  onSubmit: (value: string) => void | Promise<void>
  onCancel: () => void
}

/** One `Select` and an apply button: the bulk "Add to group…" and "Assign role…" dialogs. */
export function PickOptionForm({
  label,
  options,
  placeholder,
  submitLabel,
  requiredMessage,
  onSubmit,
  onCancel,
}: PickOptionFormProps) {
  const schema = useMemo(
    () =>
      z.object({
        value: z.string().min(1, requiredMessage ?? `Choose a ${label.toLowerCase()}.`),
      }),
    [label, requiredMessage],
  )
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ value: string }>({
    resolver: zodResolver(schema),
    defaultValues: { value: '' },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit((values: { value: string }) => onSubmit(values.value))

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack gap="4">
        <Controller
          control={control}
          name="value"
          render={({ field, fieldState }) => (
            <SelectField
              ref={field.ref}
              label={label}
              options={options}
              placeholder={placeholder ?? `Choose a ${label.toLowerCase()}`}
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
