'use client'
import { RegisterPage } from '@kemo/ui'
import NextLink from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { authLinks, brand, footer, mockProviders, useMockSubmit } from '@/lib/mock-auth'

export function RegisterDemo() {
  const { error, isSubmitting, submit } = useMockSubmit()

  return (
    <RegisterPage
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
