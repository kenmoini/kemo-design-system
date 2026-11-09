import { Heading } from '@kemo/ui'
import type { ReactNode } from 'react'
import { Stack } from '../../styled-system/jsx'

export function Section({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack as="section" gap="4">
      <Heading as="h2" textStyle="xl">
        {title}
      </Heading>
      {children}
    </Stack>
  )
}
