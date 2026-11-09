import type { Metadata } from 'next'
import { Heading, Text } from '@kemo/ui'

export const metadata: Metadata = { title: 'Reset your password' }

export default function ForgotPasswordPage() {
  return (
    <>
      <Heading as="h1" textStyle="3xl">
        Reset your password
      </Heading>
      <Text color="fg.muted">Design pending. See docs/superpowers/specs.</Text>
    </>
  )
}
