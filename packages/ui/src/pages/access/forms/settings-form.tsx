'use client'
import { zodResolver } from '@hookform/resolvers/zod'
import { type ReactNode, useRef, useState } from 'react'
import { type Control, Controller, useForm, useWatch } from 'react-hook-form'
import { Box, Grid, HStack, Stack } from '../../../../styled-system/jsx'
import { Button, Card, Heading, Loader, Text } from '../../../components/ui'
import { ariaDisabledOutline, ariaDisabledSolid } from '../../../lib/aria-disabled'
import type { Option } from '../../../widgets'
import { accessSettingsSchema } from '../schemas'
import type { AccessSettingsValues } from '../types'
import {
  errorMessage,
  FormError,
  NumberField,
  PasswordField,
  SelectField,
  SwitchField,
  TextField,
  useRefocusAfter,
} from './form-fields'

type LifetimeName =
  'accessTokenMinutes' | 'refreshTokenDays' | 'idleTimeoutHours' | 'serviceTokenMaxDays'

function counted(values: number[], unit: string): Option[] {
  return values.map((value) => ({
    value: String(value),
    label: `${value} ${value === 1 ? unit : `${unit}s`}`,
  }))
}

/** The four lifetime selects' choices; each value is the number as a string. */
export const accessSettingsOptions = {
  accessTokenMinutes: counted([15, 30, 60, 120], 'minute'),
  refreshTokenDays: counted([7, 30, 90], 'day'),
  idleTimeoutHours: counted([1, 8, 24], 'hour'),
  serviceTokenMaxDays: counted([30, 90, 365], 'day'),
} satisfies Record<LifetimeName, Option[]>

export interface AccessSettingsFormProps {
  /** The saved settings. The form follows later changes to them, except in fields being edited. */
  values: AccessSettingsValues
  /** "Save settings": resolve when saved (the form is clean again); a rejection keeps the
   * changes and shows the error's message. */
  onSubmit: (values: AccessSettingsValues) => void | Promise<void>
  /** "Send test email": a rejection shows the error's message. */
  onSendTestEmail: () => void | Promise<void>
}

/** One settings section: a heading and what it is for on the left (above, below `md`), the fields. */
function Section({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <Grid
      gridTemplateColumns={{ base: 'minmax(0, 1fr)', md: '12rem minmax(0, 1fr)' }}
      gap="6"
      p="6"
      borderBottomWidth="1px"
    >
      <Stack gap="1">
        <Heading as="h2" textStyle="md">
          {title}
        </Heading>
        <Text textStyle="sm" color="fg.muted">
          {description}
        </Text>
      </Stack>
      <Stack gap="4" minW="0">
        {children}
      </Stack>
    </Grid>
  )
}

function LifetimeSelect({
  control,
  name,
  label,
}: {
  control: Control<AccessSettingsValues>
  name: LifetimeName
  label: string
}) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <SelectField
          ref={field.ref}
          label={label}
          options={accessSettingsOptions[name]}
          value={String(field.value)}
          onChange={(value) => field.onChange(Number(value))}
          onBlur={field.onBlur}
          error={fieldState.error?.message}
        />
      )}
    />
  )
}

/**
 * The Access settings as one card: internal authentication, token and session lifetimes, and the
 * email (SMTP) settings for invites and verification. "Discard changes" and "Save settings" stay off
 * until something changes; a resolved save makes the saved values the new starting point.
 */
export function AccessSettingsForm({ values, onSubmit, onSendTestEmail }: AccessSettingsFormProps) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    trigger,
    formState: { errors, isDirty, isSubmitted, isSubmitting, defaultValues },
  } = useForm<AccessSettingsValues>({
    resolver: zodResolver(accessSettingsSchema),
    values,
    resetOptions: { keepDirtyValues: true },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  })
  const requireVerifiedEmail = useWatch({ control, name: 'requireVerifiedEmail' })
  const [saveError, setSaveError] = useState<string | null>(null)
  const [testError, setTestError] = useState<string | null>(null)
  const [sendingTest, setSendingTest] = useState(false)
  // The port's number input is uncontrolled once mounted: a reset remounts it with the new value.
  const [resets, setResets] = useState(0)
  // What the last Save or Discard did, announced politely; the next change clears it.
  const [outcome, setOutcome] = useState('')
  const [wasDirty, setWasDirty] = useState(isDirty)
  if (isDirty !== wasDirty) {
    setWasDirty(isDirty)
    if (isDirty) setOutcome('')
  }
  // "Send test email" is disabled while it runs; focus comes back to it afterwards.
  const testRef = useRef<HTMLButtonElement>(null)
  useRefocusAfter(testRef, sendingTest)

  // Discard and a saved submit replace every value, edited or not (`reset` would otherwise take
  // `keepDirtyValues` from `resetOptions`, which is only for later `values`), and write them into
  // the inputs already registered (`keepFieldsRef`; without it react-hook-form drops their refs).
  const resetTo = (clean: AccessSettingsValues) => {
    reset(clean, { keepDirtyValues: false, keepFieldsRef: true })
    setResets((n) => n + 1)
  }

  const save = async (next: AccessSettingsValues) => {
    setSaveError(null)
    setOutcome('')
    try {
      await onSubmit(next)
      resetTo(next)
      setOutcome('Settings saved')
    } catch (cause) {
      setSaveError(errorMessage(cause))
    }
  }

  // Save and Discard stay focusable when there is nothing to do (`aria-disabled`) and while a save
  // runs (`aria-busy`), so focus never drops to the page; their handlers refuse instead.
  const discard = () => {
    if (!isDirty || isSubmitting) return
    setSaveError(null)
    resetTo(defaultValues as AccessSettingsValues)
    setOutcome('Changes discarded')
  }

  const sendTestEmail = async () => {
    setTestError(null)
    setSendingTest(true)
    try {
      await onSendTestEmail()
    } catch (cause) {
      setTestError(errorMessage(cause))
    } finally {
      setSendingTest(false)
    }
  }

  return (
    <form
      noValidate
      aria-label="Access settings"
      onSubmit={(event) => {
        if (!isDirty || isSubmitting) {
          event.preventDefault()
          return
        }
        void handleSubmit(save)(event)
      }}
    >
      <Card.Root variant="outline">
        <Section
          title="Internal authentication"
          description="Email and password sign-in alongside OIDC."
        >
          <Controller
            control={control}
            name="passwordSignIn"
            render={({ field }) => (
              <SwitchField
                label="Allow password sign-in"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Controller
            control={control}
            name="requireMfaForAdmins"
            render={({ field }) => (
              <SwitchField
                label="Require MFA for admins"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
        </Section>
        <Section
          title="Tokens and sessions"
          description="How long access lasts before people sign in again."
        >
          <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
            <LifetimeSelect
              control={control}
              name="accessTokenMinutes"
              label="Access token lifetime"
            />
            <LifetimeSelect
              control={control}
              name="refreshTokenDays"
              label="Refresh token lifetime"
            />
            <LifetimeSelect control={control} name="idleTimeoutHours" label="Idle timeout" />
            <LifetimeSelect
              control={control}
              name="serviceTokenMaxDays"
              label="Service account token max"
            />
          </Grid>
        </Section>
        <Section
          title="Email verification"
          description="Used for invites, verification and password resets."
        >
          <Controller
            control={control}
            name="requireVerifiedEmail"
            render={({ field }) => (
              <SwitchField
                label="Require verified email before first sign-in"
                checked={field.value}
                onCheckedChange={(checked) => {
                  field.onChange(checked)
                  // The From address depends on it: after a submit, check it again at once.
                  if (isSubmitted) void trigger('smtp.from')
                }}
              />
            )}
          />
          <Grid columns={{ base: 1, md: 2 }} gap="4" alignItems="start">
            <TextField
              label="SMTP host"
              autoComplete="off"
              placeholder="smtp.example.com"
              error={errors.smtp?.host?.message}
              {...register('smtp.host')}
            />
            <Controller
              control={control}
              name="smtp.port"
              render={({ field, fieldState }) => (
                <NumberField
                  key={`${resets}:${values.smtp.port}`}
                  ref={field.ref}
                  label="Port"
                  min={1}
                  max={65535}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldState.error?.message}
                />
              )}
            />
            <TextField
              label="Username"
              autoComplete="off"
              error={errors.smtp?.username?.message}
              {...register('smtp.username')}
            />
            <PasswordField
              label="Password"
              autoComplete="new-password"
              error={errors.smtp?.password?.message}
              {...register('smtp.password')}
            />
          </Grid>
          <TextField
            label="From address"
            required={requireVerifiedEmail}
            autoComplete="off"
            placeholder="Kemo Console <no-reply@example.com>"
            error={errors.smtp?.from?.message}
            {...register('smtp.from')}
          />
          <HStack>
            <Button
              ref={testRef}
              type="button"
              variant="outline"
              size="sm"
              loading={sendingTest}
              onClick={sendTestEmail}
            >
              Send test email
            </Button>
          </HStack>
          <FormError message={testError} />
        </Section>
        {saveError ? (
          <Box px="6" pt="6">
            <FormError message={saveError} />
          </Box>
        ) : null}
        <Card.Footer pt="6" alignItems="center" flexWrap="wrap">
          <Text role="status" textStyle="sm" color="fg.muted" me="auto">
            {outcome}
          </Text>
          <Button
            type="button"
            variant="outline"
            aria-disabled={!isDirty || isSubmitting || undefined}
            className={!isDirty || isSubmitting ? ariaDisabledOutline : undefined}
            onClick={discard}
          >
            Discard changes
          </Button>
          <Button
            type="submit"
            variant="solid"
            aria-disabled={!isDirty || undefined}
            className={!isDirty ? ariaDisabledSolid : undefined}
            aria-busy={isSubmitting || undefined}
          >
            <Loader visible={isSubmitting} text="Saving…">
              Save settings
            </Loader>
          </Button>
        </Card.Footer>
      </Card.Root>
    </form>
  )
}
