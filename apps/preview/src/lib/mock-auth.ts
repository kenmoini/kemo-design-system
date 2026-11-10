import type { AuthProvider } from '@kemo/ui'

// Mock data and behaviour for the preview's auth pages. Nothing here talks to a server, and nothing
// here needs the client: the stateful wiring is `useMockSubmit` in `./use-mock-submit`.

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
