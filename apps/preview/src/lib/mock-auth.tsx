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
 * `error` and `isSubmitting` state around `mockSubmit`, wired the way a host wires a real call: the
 * error clears when a submit starts and is set when it fails. A failure resolves by default (the
 * page shows `error`); `rejectOnError` re-throws it for a page that branches on the outcome, like
 * Forgot password, which shows its sent state only after `onSubmit` resolves.
 */
export function useMockSubmit({ rejectOnError = false }: { rejectOnError?: boolean } = {}) {
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function submit(values: MockSubmitValues) {
    setError(null)
    setIsSubmitting(true)
    try {
      await mockSubmit(values)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause))
      if (rejectOnError) throw cause
    } finally {
      setIsSubmitting(false)
    }
  }

  return { error, isSubmitting, submit }
}
