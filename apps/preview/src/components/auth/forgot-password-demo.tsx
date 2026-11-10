'use client'
import { ForgotPasswordPage } from '@kemo/ui'
import NextLink from 'next/link'
import { MockFooter } from '@/components/auth/mock-footer'
import { BrandMark } from '@/components/brand-mark'
import { authLinks, brand } from '@/lib/mock-auth'
import { useMockSubmit } from '@/lib/use-mock-submit'

export function ForgotPasswordDemo() {
  const { error, isSubmitting, submit, onSubmitError } = useMockSubmit()

  return (
    <ForgotPasswordPage
      logo={<BrandMark />}
      brand={brand}
      footer={<MockFooter />}
      linkComponent={NextLink}
      links={authLinks}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={submit}
      onSubmitError={onSubmitError}
    />
  )
}
