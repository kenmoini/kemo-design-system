import type { RefObject } from 'react'
import { HStack, styled } from '../../../styled-system/jsx'
import { Button, Input } from '../../components/ui'
import { vocabulary } from './content'
import type { ForumVariant } from './types'

export interface SearchBinding {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  inputRef?: RefObject<HTMLInputElement | null>
}

export interface SearchFieldProps {
  variant: ForumVariant
  binding: SearchBinding
  size?: 'sm' | 'lg'
  label?: string
}

/** The forum search form; at `lg` (the Q&A hero) a Search button follows the input. */
export function SearchField({ variant, binding, size = 'sm', label }: SearchFieldProps) {
  const name = label ?? vocabulary[variant].searchPlaceholder
  return (
    <styled.form
      role="search"
      aria-label={name}
      w={size === 'lg' ? 'full' : '14rem'}
      onSubmit={(e) => {
        e.preventDefault()
        binding.onSubmit()
      }}
    >
      <HStack gap="2">
        <Input
          type="search"
          size={size}
          placeholder={name}
          aria-label={name}
          value={binding.value}
          onChange={(e) => binding.onChange(e.target.value)}
          ref={binding.inputRef}
        />
        {size === 'lg' ? (
          <Button type="submit" size="lg">
            Search
          </Button>
        ) : null}
      </HStack>
    </styled.form>
  )
}
