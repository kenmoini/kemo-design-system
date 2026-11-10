'use client'
import { SignInPage } from '@kemo/ui'
import NextLink from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { authLinks, brand, footer, mockProviders, useMockSubmit } from '@/lib/mock-auth'

export function SignInDemo() {
  const { error, isSubmitting, submit } = useMockSubmit()

  return (
    <SignInPage
      logo={<BrandMark />}
      brand={brand}
      footer={footer}
      linkComponent={NextLink}
      providers={mockProviders}
      links={authLinks}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
    />
  )
}
