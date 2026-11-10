'use client'
import type { ComponentProps } from 'react'
import { Field, PasswordInput } from '../../components/ui'

export type PasswordFieldProps = {
  label: string
  error?: string
  helperText?: string
  readOnly?: boolean
  required?: boolean
} & ComponentProps<typeof PasswordInput>

/** A labelled password input that surfaces a form error; spreads react-hook-form's `register()`. */
export function PasswordField({
  label,
  error,
  helperText,
  readOnly,
  required,
  ...inputProps
}: PasswordFieldProps) {
  return (
    <Field.Root invalid={!!error} readOnly={readOnly} required={required}>
      <Field.Label>
        {label}
        <Field.RequiredIndicator />
      </Field.Label>
      <PasswordInput {...inputProps} />
      {helperText && <Field.HelperText>{helperText}</Field.HelperText>}
      <Field.ErrorText>{error}</Field.ErrorText>
    </Field.Root>
  )
}
