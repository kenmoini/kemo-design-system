'use client'
import { PasswordInput as ArkPasswordInput } from '@ark-ui/react/password-input'
import { EyeIcon, EyeOffIcon } from 'lucide-react'
import { forwardRef } from 'react'
import { styled } from '../../../styled-system/jsx'
import { input } from '../../../styled-system/recipes'
import { IconButton } from './icon-button'
import type { InputProps } from './input'

const Control = styled(ArkPasswordInput.Control)
const Input = styled(ArkPasswordInput.Input, input)

export interface PasswordInputProps extends ArkPasswordInput.RootProps {
  size?: InputProps['size']
  variant?: InputProps['variant']
  placeholder?: string | undefined
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(props, ref) {
    const { size, variant, placeholder, autoComplete = 'current-password', ...rootProps } = props

    return (
      <ArkPasswordInput.Root autoComplete={autoComplete} {...rootProps}>
        <Control position="relative" display="flex" width="full">
          <Input
            ref={ref}
            size={size}
            variant={variant}
            placeholder={placeholder}
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
