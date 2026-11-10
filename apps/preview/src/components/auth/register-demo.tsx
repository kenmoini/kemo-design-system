'use client'
import { RegisterPage } from '@kemo/ui'
import NextLink from 'next/link'
import { MockFooter } from '@/components/auth/mock-footer'
import { BrandMark } from '@/components/brand-mark'
import { authLinks, brand, mockProviders } from '@/lib/mock-auth'
import { useMockSubmit } from '@/lib/use-mock-submit'

export function RegisterDemo() {
  const { error, isSubmitting, submit, onSubmitError } = useMockSubmit()

  return (
    <RegisterPage
      logo={<BrandMark />}
      brand={brand}
      footer={<MockFooter />}
      linkComponent={NextLink}
      providers={mockProviders}
      links={authLinks}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
      onSubmitError={onSubmitError}
    />
  )
}
