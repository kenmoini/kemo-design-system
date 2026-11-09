import type { Metadata } from 'next'
import { Heading, Text } from '@kemo/ui'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return (
    <>
      <Heading as="h1" textStyle="3xl">
        Sign in
      </Heading>
      <Text color="fg.muted">Design pending. See docs/superpowers/specs.</Text>
    </>
  )
}
