'use client'
import { CompleteProfilePage } from '@kemo/ui'
import NextLink from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { brand, footer, useMockSubmit } from '@/lib/mock-auth'

export function CompleteProfileDemo() {
  const { error, isSubmitting, submit, onSubmitError } = useMockSubmit()

  return (
    <CompleteProfilePage
      logo={<BrandMark />}
      brand={brand}
      footer={footer}
      linkComponent={NextLink}
      identity={{ provider: 'Keycloak', email: 'ken@acme.com' }}
      defaultValues={{ lastName: 'Moini' }}
      error={error}
      isSubmitting={isSubmitting}
      // The email is fixed by the provider, so the username stands in as the mock's identifier.
      onSubmit={(values) => submit({ identifier: values.username })}
      onSubmitError={onSubmitError}
      onSignOut={() => console.info('sign out')}
    />
  )
}
