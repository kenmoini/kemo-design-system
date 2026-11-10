'use client'
import { ForgotPasswordPage } from '@kemo/ui'
import NextLink from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { authLinks, brand, footer, useMockSubmit } from '@/lib/mock-auth'

export function ForgotPasswordDemo() {
  // The page shows "Check your email" once onSubmit resolves, so a failure has to reject.
  const { error, isSubmitting, submit } = useMockSubmit({ rejectOnError: true })

  return (
    <ForgotPasswordPage
      logo={<BrandMark />}
      brand={brand}
      footer={footer}
      linkComponent={NextLink}
      links={authLinks}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
    />
  )
}
