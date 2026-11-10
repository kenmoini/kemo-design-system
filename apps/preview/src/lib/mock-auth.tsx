import type { AuthProvider } from '@kemo/ui'
import { useState } from 'react'
import { HStack } from '../../styled-system/jsx'

// Mock behaviour for the preview's auth pages. Nothing here talks to a server.

export const mockDelayMs = 600

export type MockSubmitValues = { identifier?: string; email?: string }

/** Resolves after `mockDelayMs`; rejects when the identifier or email starts with `fail`. */
export async function mockSubmit(values: MockSubmitValues): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, mockDelayMs))
  if ([values.identifier, values.email].some((value) => value?.startsWith('fail'))) {
    throw new Error('Something went wrong. Try again.')
  }
}

export const mockProviders: AuthProvider[] = [
  { id: 'sso', label: 'single sign-on', onSelect: () => console.info('provider: sso') },
  { id: 'github', label: 'GitHub', onSelect: () => console.info('provider: github') },
]

export const authLinks = {
  signIn: '/login',
  register: '/register',
  forgotPassword: '/forgot-password',
  terms: '#terms',
  privacy: '#privacy',
}

export const brand = 'Acme Console'

export const footer = (
  <HStack justify="space-between" gap="4">
    <span>© 2026 Acme</span>
    <span>v1.4.2</span>
  </HStack>
)

/**
 * `error` and `isSubmitting` state around `mockSubmit`, wired the way a host wires a real call:
 * `submit` (the page's `onSubmit`) clears the error and rejects when the call fails, and
 * `onSubmitError` (the page's `onSubmitError`) turns that rejection into the `error` the page shows.
 */
export function useMockSubmit() {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(values: MockSubmitValues) {
    setError(null)
    setIsSubmitting(true)
    try {
      await mockSubmit(values)
    } finally {
      setIsSubmitting(false)
    }
  }

  function onSubmitError(cause: unknown) {
    setError(cause instanceof Error ? cause.message : String(cause))
  }

  return { error, isSubmitting, submit, onSubmitError }
}
