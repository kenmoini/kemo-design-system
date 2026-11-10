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
  'value' | 'defaultValue' | 'onChange' | 'onBlur' | 'onFocus'
>

// Value and event props belong to the <input>, not the Root <div>, so they are typed as input props.
export interface PasswordInputProps
  extends Omit<ArkPasswordInput.RootProps, keyof InputEventProps | 'placeholder'>, InputEventProps {
  size?: InputProps['size']
  variant?: InputProps['variant']
  placeholder?: string | undefined
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const {
      size,
      variant,
      placeholder,
      autoComplete = 'current-password',
      value,
      defaultValue,
      onChange,
      onBlur,
      onFocus,
      ...rootProps
    } = props

    return (
      <ArkPasswordInput.Root autoComplete={autoComplete} {...rootProps}>
        <Control position="relative" display="flex" width="full">
          <Input
            ref={ref}
            size={size}
            variant={variant}
            placeholder={placeholder}
            value={value}
            defaultValue={defaultValue}
            onChange={onChange}
            onBlur={onBlur}
            onFocus={onFocus}
            pe="var(--input-height)"
          />
          <ArkPasswordInput.VisibilityTrigger asChild>
            <IconButton variant="plain" size={size} position="absolute" insetInlineEnd="0" top="0">
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
