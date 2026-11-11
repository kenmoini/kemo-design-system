'use client'
import { Portal } from '@ark-ui/react/portal'
import { createListCollection } from '@ark-ui/react/select'
import {
  forwardRef,
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { HStack, Stack } from '../../../../styled-system/jsx'
import {
  Badge,
  Button,
  Checkbox,
  Field,
  Fieldset,
  Input,
  type InputProps,
  NumberInput,
  PasswordInput,
  type PasswordInputProps,
  RadioGroup,
  Select,
  Switch,
  TagsInput,
  Text,
  Textarea,
  type TextareaProps,
} from '../../../components/ui'
import type { Option } from '../../../widgets'
import { FormAlert } from '../../auth/form-alert'

/** The message a rejected submit shows; non-`Error` rejections get a generic one. */
export function errorMessage(cause: unknown): string {
  if (cause instanceof Error && cause.message) return cause.message
  if (typeof cause === 'string' && cause) return cause
  return 'Something went wrong. Try again.'
}

/**
 * Wraps a form's `onSubmit` so a rejection becomes `error` (shown by `FormError`) instead of an
 * unhandled promise: the form keeps its input and the dialog stays open. A new submit clears it.
 */
export function useFormSubmit<V>(onSubmit: (values: V) => void | Promise<void>) {
  const [error, setError] = useState<string | null>(null)
  const submit = useCallback(
    async (values: V) => {
      setError(null)
      try {
        await onSubmit(values)
      } catch (cause) {
        setError(errorMessage(cause))
      }
    },
    [onSubmit],
  )
  return { submit, error }
}

/**
 * A button that is disabled while its action runs (Park's `loading`) loses focus to the page in a
 * browser. When `pending` ends and focus is still on the page, hand it back to the button, so a
 * keyboard user carries on from where they were. Focus that moved elsewhere meanwhile stays put.
 */
export function useRefocusAfter(ref: RefObject<HTMLElement | null>, pending: boolean) {
  const wasPending = useRef(false)
  useEffect(() => {
    if (pending) {
      wasPending.current = true
      return
    }
    if (!wasPending.current) return
    wasPending.current = false
    const button = ref.current
    const active = document.activeElement
    if (button?.isConnected && (active === null || active === document.body)) button.focus()
  }, [pending, ref])
}

function FieldMessages({ helper, error }: { helper?: ReactNode; error?: string }) {
  return (
    <>
      {helper ? <Field.HelperText>{helper}</Field.HelperText> : null}
      <Field.ErrorText>{error}</Field.ErrorText>
    </>
  )
}

export type TextFieldProps = Omit<InputProps, 'ref' | 'children'> & {
  label: string
  error?: string
  helper?: ReactNode
  required?: boolean
}

/** A labelled `Input` with helper and error text; spread react-hook-form's `register()` on it. */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, helper, required, ...inputProps },
  ref,
) {
  return (
    <Field.Root invalid={!!error} required={required}>
      <Field.Label>
        {label}
        <Field.RequiredIndicator />
      </Field.Label>
      <Input ref={ref} {...inputProps} />
      <FieldMessages helper={helper} error={error} />
    </Field.Root>
  )
})

export type PasswordFieldProps = Omit<PasswordInputProps, 'children'> & {
  label: string
  error?: string
  helper?: ReactNode
  required?: boolean
}

/**
 * `TextField` for secrets: a labelled Park `PasswordInput` (masked, with a show/hide button) with
 * helper and error text; spread react-hook-form's `register()` on it.
 */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField({ label, error, helper, required, ...inputProps }, ref) {
    return (
      <Field.Root invalid={!!error} required={required}>
        <Field.Label>
          {label}
          <Field.RequiredIndicator />
        </Field.Label>
        <Field.Context>
          {(field) => (
            <PasswordInput ref={ref} aria-describedby={field.ariaDescribedby} {...inputProps} />
          )}
        </Field.Context>
        <FieldMessages helper={helper} error={error} />
      </Field.Root>
    )
  },
)

export type TextareaFieldProps = Omit<TextareaProps, 'ref' | 'children'> & {
  label: string
  error?: string
  helper?: ReactNode
  required?: boolean
}

/** `TextField` for longer text: a labelled `Textarea`; spread react-hook-form's `register()` on it. */
export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  function TextareaField({ label, error, helper, required, ...textareaProps }, ref) {
    return (
      <Field.Root invalid={!!error} required={required}>
        <Field.Label>
          {label}
          <Field.RequiredIndicator />
        </Field.Label>
        <Textarea ref={ref} rows={3} {...textareaProps} />
        <FieldMessages helper={helper} error={error} />
      </Field.Root>
    )
  },
)

export interface NumberFieldProps {
  label: string
  /** `NaN` while the input is empty. */
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  helper?: ReactNode
  error?: string
  required?: boolean
  onBlur?: () => void
}

/**
 * A labelled Park `NumberInput` with steppers. It does not clamp on blur, so an out-of-range value
 * reaches the form's validation and its message. Bind it with react-hook-form's `Controller`.
 * `value` only seeds the input on mount; the field is uncontrolled afterwards (changes still flow
 * out through `onChange`), so a form that must change the value later has to remount the field.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(function NumberField(
  { label, value, onChange, min, max, helper, error, required, onBlur },
  ref,
) {
  return (
    <Field.Root invalid={!!error} required={required}>
      <NumberInput.Root
        // The input's own text is the source of truth while typing (a number round trip would
        // drop "1." or race with fast keystrokes); `value` only seeds it.
        defaultValue={Number.isNaN(value) ? '' : String(value)}
        onValueChange={(details) => onChange(details.valueAsNumber)}
        min={min}
        max={max}
        clampValueOnBlur={false}
        allowOverflow
      >
        <NumberInput.Label>
          {label}
          <Field.RequiredIndicator />
        </NumberInput.Label>
        <NumberInput.Control>
          <Field.Context>
            {(field) => (
              <NumberInput.Input
                ref={ref}
                onBlur={onBlur}
                aria-describedby={field.ariaDescribedby}
              />
            )}
          </Field.Context>
        </NumberInput.Control>
      </NumberInput.Root>
      <FieldMessages helper={helper} error={error} />
    </Field.Root>
  )
})

export interface RadioFieldProps {
  label: string
  options: Option[]
  value: string
  onChange: (value: string) => void
  helper?: ReactNode
  error?: string
}

/** A labelled Park `RadioGroup`, one radio per option. Bind it with `Controller`. */
export function RadioField({ label, options, value, onChange, helper, error }: RadioFieldProps) {
  return (
    <Field.Root invalid={!!error}>
      <Field.Context>
        {(field) => (
          <RadioGroup.Root
            value={value}
            onValueChange={(details) => onChange(details.value ?? '')}
            aria-describedby={field.ariaDescribedby}
          >
            <RadioGroup.Label>{label}</RadioGroup.Label>
            <Stack gap="2">
              {options.map((option) => (
                <RadioGroup.Item key={option.value} value={option.value}>
                  <RadioGroup.ItemControl />
                  <RadioGroup.ItemText>{option.label}</RadioGroup.ItemText>
                  <RadioGroup.ItemHiddenInput />
                </RadioGroup.Item>
              ))}
            </Stack>
          </RadioGroup.Root>
        )}
      </Field.Context>
      <FieldMessages helper={helper} error={error} />
    </Field.Root>
  )
}

export interface CheckboxGroupSection {
  /** A heading above the section's options; omitted for a single flat list. */
  heading?: string
  options: Option[]
}

export interface CheckboxListFieldProps {
  legend: string
  sections: CheckboxGroupSection[]
  value: string[]
  onChange: (value: string[]) => void
  helper?: ReactNode
  error?: string
  required?: boolean
}

/** A `Fieldset` of `Checkbox`es, optionally in headed sections; the value is the checked option values. */
export const CheckboxListField = forwardRef<HTMLFieldSetElement, CheckboxListFieldProps>(
  function CheckboxListField({ legend, sections, value, onChange, helper, error, required }, ref) {
    const toggle = (option: string, checked: boolean) =>
      onChange(checked ? [...value, option] : value.filter((v) => v !== option))
    return (
      // Focusable, so a failed submit can move focus here (react-hook-form's `field.ref`).
      <Fieldset.Root ref={ref} tabIndex={-1} invalid={!!error}>
        <Fieldset.Legend>
          {legend}
          {required ? <span aria-hidden="true"> *</span> : null}
        </Fieldset.Legend>
        <Stack gap="4">
          {sections.map((section) => (
            <Stack
              key={section.heading ?? 'all'}
              gap="2"
              role={section.heading ? 'group' : undefined}
              aria-label={section.heading}
            >
              {section.heading ? (
                <Text as="span" textStyle="sm" fontWeight="medium" color="fg.muted">
                  {section.heading}
                </Text>
              ) : null}
              {section.options.map((option) => (
                <Checkbox.Root
                  key={option.value}
                  checked={value.includes(option.value)}
                  onCheckedChange={(details) => toggle(option.value, details.checked === true)}
                >
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                  <Checkbox.Label>{option.label}</Checkbox.Label>
                  <Checkbox.HiddenInput />
                </Checkbox.Root>
              ))}
            </Stack>
          ))}
        </Stack>
        {helper ? <Fieldset.HelperText>{helper}</Fieldset.HelperText> : null}
        {error ? <Fieldset.ErrorText role="alert">{error}</Fieldset.ErrorText> : null}
      </Fieldset.Root>
    )
  },
)

interface SelectBaseProps {
  label: string
  options: Option[]
  placeholder?: string
  helper?: ReactNode
  error?: string
  required?: boolean
  disabled?: boolean
  /** react-hook-form's `field.onBlur`. */
  onBlur?: () => void
}

type SelectFieldInnerProps = SelectBaseProps & {
  multiple: boolean
  value: string[]
  onChange: (value: string[]) => void
}

const SelectFieldInner = forwardRef<HTMLButtonElement, SelectFieldInnerProps>(
  function SelectFieldInner(
    {
      label,
      options,
      value,
      onChange,
      multiple,
      placeholder,
      helper,
      error,
      required,
      disabled,
      onBlur,
    },
    ref,
  ) {
    const collection = useMemo(() => createListCollection({ items: options }), [options])
    return (
      <Field.Root invalid={!!error} required={required} disabled={disabled}>
        <Select.Root
          collection={collection}
          value={value}
          onValueChange={(details) => onChange(details.value)}
          multiple={multiple}
          positioning={{ sameWidth: true }}
        >
          <Select.Label>
            {label}
            <Field.RequiredIndicator />
          </Select.Label>
          <Select.Control>
            {/* The trigger is the control, so it carries the field's helper and error text. */}
            <Field.Context>
              {(field) =>
                multiple ? (
                  // Several values: the chosen labels as wrapping chips; the trigger grows to fit.
                  <Select.Trigger
                    ref={ref}
                    aria-describedby={field.ariaDescribedby}
                    onBlur={onBlur}
                    h="auto"
                    minH="10"
                    py="1.5"
                  >
                    <Select.Context>
                      {(select) =>
                        select.selectedItems.length > 0 ? (
                          <HStack gap="1" flexWrap="wrap" flex="1" minW="0">
                            {(select.selectedItems as Option[]).map((item) => (
                              <Badge key={item.value}>{item.label}</Badge>
                            ))}
                          </HStack>
                        ) : (
                          <Select.ValueText placeholder={placeholder} />
                        )
                      }
                    </Select.Context>
                    <Select.Indicator />
                  </Select.Trigger>
                ) : (
                  <Select.Trigger
                    ref={ref}
                    aria-describedby={field.ariaDescribedby}
                    onBlur={onBlur}
                  >
                    <Select.ValueText placeholder={placeholder} />
                    <Select.Indicator />
                  </Select.Trigger>
                )
              }
            </Field.Context>
          </Select.Control>
          <Portal>
            <Select.Positioner>
              <Select.Content>
                {collection.items.map((item) => (
                  <Select.Item key={item.value} item={item}>
                    <Select.ItemText>{item.label}</Select.ItemText>
                    <Select.ItemIndicator />
                  </Select.Item>
                ))}
              </Select.Content>
            </Select.Positioner>
          </Portal>
        </Select.Root>
        <FieldMessages helper={helper} error={error} />
      </Field.Root>
    )
  },
)

export type SelectFieldProps = SelectBaseProps & {
  /** The chosen option's value; `''` shows the placeholder. */
  value: string
  onChange: (value: string) => void
}

/**
 * A labelled Park `Select` over `options`, with helper and error text. Bind it with react-hook-form's
 * `Controller` (`value={field.value} onChange={field.onChange} ref={field.ref}`).
 */
export const SelectField = forwardRef<HTMLButtonElement, SelectFieldProps>(function SelectField(
  { value, onChange, ...props },
  ref,
) {
  return (
    <SelectFieldInner
      ref={ref}
      {...props}
      multiple={false}
      value={value ? [value] : []}
      onChange={(next) => onChange(next[0] ?? '')}
    />
  )
})

export type MultiSelectFieldProps = SelectBaseProps & {
  value: string[]
  onChange: (value: string[]) => void
}

/** `SelectField` for several values: the trigger shows each chosen label as a chip. */
export const MultiSelectField = forwardRef<HTMLButtonElement, MultiSelectFieldProps>(
  function MultiSelectField(props, ref) {
    return <SelectFieldInner ref={ref} {...props} multiple />
  },
)

export interface SwitchFieldProps {
  label: string
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  helper?: ReactNode
  disabled?: boolean
}

/** A Park `Switch` with its label on the left and the switch on the right, plus optional helper text. */
export function SwitchField({
  label,
  checked,
  onCheckedChange,
  helper,
  disabled,
}: SwitchFieldProps) {
  return (
    <Field.Root disabled={disabled}>
      <Switch.Root
        checked={checked}
        onCheckedChange={(details) => onCheckedChange(details.checked)}
        w="full"
        justifyContent="space-between"
        gap="4"
      >
        <Switch.Label>{label}</Switch.Label>
        <Switch.Control />
        <Field.Context>
          {(field) => <Switch.HiddenInput role="switch" aria-describedby={field.ariaDescribedby} />}
        </Field.Context>
      </Switch.Root>
      <FieldMessages helper={helper} />
    </Field.Root>
  )
}

export interface TagsFieldProps {
  label: string
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  helper?: ReactNode
  error?: string
  /** Return `false` to refuse a tag as it is added (a malformed URL, say). */
  validate?: (tag: string, value: string[]) => boolean
}

/**
 * A Park `TagsInput`: type a value and press Enter (or leave the field) to add it; each tag has a
 * delete button. Bind it with react-hook-form's `Controller`.
 */
export function TagsField({
  label,
  value,
  onChange,
  placeholder,
  helper,
  error,
  validate,
}: TagsFieldProps) {
  return (
    <Field.Root invalid={!!error}>
      <TagsInput.Root
        value={value}
        onValueChange={(details) => onChange(details.value)}
        validate={validate ? (details) => validate(details.inputValue, details.value) : undefined}
        blurBehavior="add"
        addOnPaste
      >
        <TagsInput.Label>{label}</TagsInput.Label>
        <TagsInput.Control>
          <TagsInput.Items />
          <Field.Context>
            {(field) => (
              <TagsInput.Input placeholder={placeholder} aria-describedby={field.ariaDescribedby} />
            )}
          </Field.Context>
        </TagsInput.Control>
      </TagsInput.Root>
      <FieldMessages helper={helper} error={error} />
    </Field.Root>
  )
}

/** A form-level error (a rejected submit) shown above the footer; nothing without a message. */
export function FormError({ message }: { message?: string | null }) {
  return <FormAlert message={message} />
}

export interface FormFooterProps {
  onCancel: () => void
  submitLabel: string
  submitting?: boolean
}

/**
 * A dialog form's footer: Cancel and the submit button, which spins while the submit runs and has
 * focus back afterwards when the wait took it away (a rejected submit keeps the dialog open).
 */
export function FormFooter({ onCancel, submitLabel, submitting = false }: FormFooterProps) {
  const submitRef = useRef<HTMLButtonElement>(null)
  useRefocusAfter(submitRef, submitting)
  return (
    <HStack justify="flex-end" gap="3" pt="2">
      <Button type="button" variant="outline" onClick={onCancel}>
        Cancel
      </Button>
      <Button ref={submitRef} type="submit" variant="solid" loading={submitting}>
        {submitLabel}
      </Button>
    </HStack>
  )
}
