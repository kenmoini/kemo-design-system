'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Grid, HStack, Stack } from '../../../../styled-system/jsx'
import { Button, Checkbox, Text } from '../../../components/ui'
import type { Option } from '../../../widgets'
import { auditForwardingSchema } from '../schemas'
import type { AuditForwardingValues } from '../types'
import {
  CheckboxListField,
  errorMessage,
  FormError,
  PasswordField,
  SelectField,
  SwitchField,
  TextField,
} from './form-fields'

export const auditDestinationOptions: Option[] = [
  { value: 'splunk', label: 'Splunk HEC' },
  { value: 'syslog', label: 'Syslog' },
  { value: 's3', label: 'S3 bucket' },
  { value: 'webhook', label: 'Webhook' },
]

export const auditFormatOptions: Option[] = [
  { value: 'json', label: 'JSON' },
  { value: 'cef', label: 'CEF' },
]

export const auditIncludeOptions: Option[] = [
  { value: 'signins', label: 'Sign-ins' },
  { value: 'admin', label: 'Admin changes' },
  { value: 'api', label: 'API calls' },
]

export interface AuditForwardingFormProps {
  /** The saved settings. The form follows later changes to them, except in fields being edited. */
  values: AuditForwardingValues
  /** "Save": resolve when saved; a rejection keeps the input and shows the error's message. */
  onSubmit: (values: AuditForwardingValues) => void | Promise<void>
  /** "Send test event": a rejection shows the error's message. */
  onSendTest: () => void | Promise<void>
  /** When the last event reached the destination; none shows "Not yet delivered". */
  lastDeliveryAt?: string
  /** The id of the heading that names the form. */
  'aria-labelledby'?: string
}

/**
 * Where the audit log streams to: destination, format, endpoint and token, which events to send,
 * and whether forwarding is on; then "Send test event", "Save" and when the last event arrived.
 */
export function AuditForwardingForm({
  values,
  onSubmit,
  onSendTest,
  lastDeliveryAt,
  'aria-labelledby': labelledBy,
}: AuditForwardingFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuditForwardingValues>({
    resolver: zodResolver(auditForwardingSchema),
    values,
    resetOptions: { keepDirtyValues: true },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  // One message for both buttons: whichever ran last.
  const [error, setError] = useState<string | null>(null)
  const [testing, setTesting] = useState(false)

  const save = async (next: AuditForwardingValues) => {
    setError(null)
    try {
      await onSubmit(next)
      // The saved values become the starting point, written into the inputs already registered
      // (`reset` would otherwise take `keepDirtyValues` from `resetOptions`, meant for `values`).
      reset(next, { keepDirtyValues: false, keepFieldsRef: true })
    } catch (cause) {
      setError(errorMessage(cause))
    }
  }

  const sendTest = async () => {
    setError(null)
    setTesting(true)
    try {
      await onSendTest()
    } catch (cause) {
      setError(errorMessage(cause))
    } finally {
      setTesting(false)
    }
  }

  return (
    <form noValidate aria-labelledby={labelledBy} onSubmit={handleSubmit(save)}>
      <Stack gap="4">
        <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
          <Controller
            control={control}
            name="destination"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Destination"
                options={auditDestinationOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="format"
            render={({ field, fieldState }) => (
              <SelectField
                ref={field.ref}
                label="Format"
                options={auditFormatOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                error={fieldState.error?.message}
              />
            )}
          />
        </Grid>
        <TextField
          label="Endpoint URL"
          type="url"
          required
          autoComplete="off"
          placeholder="https://splunk.example.com:8088/services/collector"
          error={errors.endpoint?.message}
          {...register('endpoint')}
        />
        <PasswordField
          label="Token"
          required
          autoComplete="new-password"
          error={errors.token?.message}
          {...register('token')}
        />
        <Controller
          control={control}
          name="include"
          render={({ field, fieldState }) => (
            <CheckboxListField
              ref={field.ref}
              legend="Include"
              required
              sections={[{ options: auditIncludeOptions }]}
              value={field.value}
              onChange={(next) => field.onChange(next as AuditForwardingValues['include'])}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="failedOnly"
          render={({ field }) => (
            <Checkbox.Root
              checked={field.value}
              onCheckedChange={(details) => field.onChange(details.checked === true)}
            >
              <Checkbox.Control>
                <Checkbox.Indicator />
              </Checkbox.Control>
              <Checkbox.Label>Failed requests only</Checkbox.Label>
              <Checkbox.HiddenInput />
            </Checkbox.Root>
          )}
        />
        <Controller
          control={control}
          name="enabled"
          render={({ field }) => (
            <SwitchField
              label="Forwarding enabled"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
        <FormError message={error} />
        <HStack gap="3" flexWrap="wrap" pt="2">
          <Button type="button" variant="outline" loading={testing} onClick={sendTest}>
            Send test event
          </Button>
          <Button type="submit" variant="solid" loading={isSubmitting}>
            Save
          </Button>
          {/* Announced when it changes, so a test event's arrival is heard. */}
          <Text role="status" textStyle="sm" color={lastDeliveryAt ? 'green.11' : 'fg.muted'}>
            {lastDeliveryAt ? (
              <>
                <span aria-hidden="true">● </span>
                {`Last delivery ${lastDeliveryAt}`}
              </>
            ) : (
              'Not yet delivered'
            )}
          </Text>
        </HStack>
      </Stack>
    </form>
  )
}
