'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { Stack } from '../../../styled-system/jsx'
import { EntityDialog, FormError, FormFooter, NumberField } from '../access'
import { useFormSubmit } from '../access/forms/form-fields'

const RANGE = 'Enter a number from 0 to 100.'

const scaleSchema = z.object({
  replicas: z.number(RANGE).int('Use a whole number.').min(0, RANGE).max(100, RANGE),
})

type ScaleValues = z.infer<typeof scaleSchema>

export interface ScaleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The Deployment's name, for the title. */
  name: string
  /** The current replica count: the field's starting value. */
  replicas: number
  /** Resolve (or return) to close the dialog; a rejection keeps it open with the error's message. */
  onConfirm: (replicas: number) => void | Promise<void>
  /** The element to focus on close; defaults to the element that had focus when it opened. */
  finalFocusEl?: () => HTMLElement | null
}

function ScaleForm({
  replicas,
  onConfirm,
  onCancel,
}: {
  replicas: number
  onConfirm: (replicas: number) => void | Promise<void>
  onCancel: () => void
}) {
  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<ScaleValues>({
    resolver: zodResolver(scaleSchema),
    defaultValues: { replicas },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const { submit, error } = useFormSubmit((values: ScaleValues) => onConfirm(values.replicas))

  return (
    <form noValidate onSubmit={handleSubmit(submit)}>
      <Stack gap="4">
        <Controller
          control={control}
          name="replicas"
          render={({ field, fieldState }) => (
            <NumberField
              ref={field.ref}
              label="Replicas"
              required
              min={0}
              max={100}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              error={fieldState.error?.message}
            />
          )}
        />
        <FormError message={error} />
        <FormFooter onCancel={onCancel} submitLabel="Scale" submitting={isSubmitting} />
      </Stack>
    </form>
  )
}

/**
 * "Scale {name}": a replica count from 0 to 100 and Scale. The form mounts on every open, starting
 * from `replicas`.
 */
export function ScaleDialog({
  open,
  onOpenChange,
  name,
  replicas,
  onConfirm,
  finalFocusEl,
}: ScaleDialogProps) {
  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Scale ${name}`}
      description="How many pods the Deployment runs."
      size="sm"
      finalFocusEl={finalFocusEl}
    >
      <ScaleForm
        replicas={replicas}
        onConfirm={async (next) => {
          await onConfirm(next)
          onOpenChange(false)
        }}
        onCancel={() => onOpenChange(false)}
      />
    </EntityDialog>
  )
}
