import type { Metadata } from 'next'
import { Heading, Text } from '@kemo/ui'

export const metadata: Metadata = { title: 'Create your account' }

export default function RegisterPage() {
  return (
    <>
      <Heading as="h1" textStyle="3xl">
        Create your account
      </Heading>
      <Text color="fg.muted">Design pending. See docs/superpowers/specs.</Text>
    </>
  )
}
