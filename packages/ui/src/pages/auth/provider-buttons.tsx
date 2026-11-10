'use client'
import { Stack, styled } from '../../../styled-system/jsx'
import { Button } from '../../components/ui'
import type { AuthProvider } from './types'

// Holds a host-supplied icon: decorative, since the label names the provider. Inline-flex keeps an
// SVG off the text baseline.
const IconSlot = styled('span', { base: { display: 'inline-flex' } })

// Neutral stand-in when a provider supplies no icon.
const NeutralIcon = styled('span', {
  base: {
    display: 'inline-block',
    width: '14px',
    height: '14px',
    rounded: 'full',
    bg: 'fg.default',
  },
})

export interface ProviderButtonsProps {
  providers?: AuthProvider[]
  verb: 'Continue' | 'Sign up'
}

/** One full-width single sign-on button per provider. */
export function ProviderButtons({ providers, verb }: ProviderButtonsProps) {
  if (!providers || providers.length === 0) return null
  return (
    <Stack gap="3">
      {providers.map((provider) => (
        <Button
          key={provider.id}
          type="button"
          variant="subtle"
          width="full"
          onClick={provider.onSelect}
        >
          {provider.icon ? (
            <IconSlot aria-hidden>{provider.icon}</IconSlot>
          ) : (
            <NeutralIcon aria-hidden />
          )}
          {verb} with {provider.label}
        </Button>
      ))}
    </Stack>
  )
}
