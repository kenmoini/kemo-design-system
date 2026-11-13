'use client'
import { PasswordInput as ArkPasswordInput } from '@ark-ui/react/password-input'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { forwardRef, type ComponentProps } from 'react'
import { styled } from '../../../styled-system/jsx'
import { input } from '../../../styled-system/recipes'
import { IconButton } from './icon-button'
import type { InputProps } from './input'

const Control = styled(ArkPasswordInput.Control)
const Input = styled(ArkPasswordInput.Input, input)

type InputEventProps = Pick<
  ComponentProps<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'onFocus' | 'aria-describedby'
>

// Value and event props belong to the <input>, not the Root <div>, so they are typed as input props.
// So does `aria-describedby`: a Field's helper and error text describe the input.
export interface PasswordInputProps
  extends Omit<ArkPasswordInput.RootProps, keyof InputEventProps | 'placeholder'>, InputEventProps {
  size?: InputProps['size']
  variant?: InputProps['variant']
  placeholder?: string | undefined
}

// Attributes of the <input> itself go to it; the rest (className, style props and Ark's state
// options: name, disabled, readOnly, required, which Ark applies to the input) stays on the Root.
const inputOnlyKeys = new Set([
  'id',
  'placeholder',
  'value',
  'defaultValue',
  'onChange',
  'onBlur',
  'onFocus',
  'maxLength',
  'minLength',
  'pattern',
  'autoFocus',
  'inputMode',
])

function splitInputProps(props: Record<string, unknown>) {
  const rootProps: Record<string, unknown> = {}
  const inputProps: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    const toInput = inputOnlyKeys.has(key) || key.startsWith('aria-') || key.startsWith('data-')
    ;(toInput ? inputProps : rootProps)[key] = value
  }
  return { rootProps, inputProps }
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const { size, variant, autoComplete = 'current-password', ...rest } = props
    const { rootProps, inputProps } = splitInputProps(rest)

    return (
      <ArkPasswordInput.Root autoComplete={autoComplete} {...rootProps}>
        <Control position="relative" display="flex" width="full">
          <Input ref={ref} size={size} variant={variant} {...inputProps} pe="var(--input-height)" />
          <ArkPasswordInput.VisibilityTrigger asChild>
            <IconButton
              variant="plain"
              size={size}
              position="absolute"
              insetInlineEnd="0"
              insetY="0"
              h="auto"
            >
              <ArkPasswordInput.Indicator fallback={<EyeOffIcon />}>
                <EyeIcon />
              </ArkPasswordInput.Indicator>
            </IconButton>
          </ArkPasswordInput.VisibilityTrigger>
        </Control>
      </ArkPasswordInput.Root>
    )
  },
)
