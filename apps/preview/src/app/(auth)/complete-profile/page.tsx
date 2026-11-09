import type { Metadata } from 'next'
import { Heading, Text } from '@kemo/ui'

export const metadata: Metadata = { title: 'Complete your profile' }

export default function CompleteProfilePage() {
  return (
    <>
      <Heading as="h1" textStyle="3xl">
        Complete your profile
      </Heading>
      <Text color="fg.muted">Design pending. See docs/superpowers/specs.</Text>
    </>
  )
}
