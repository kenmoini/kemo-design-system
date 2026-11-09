import { Heading, Text } from '@kemo/ui'
import type { ReactNode } from 'react'
import { Stack } from '../../styled-system/jsx'

export function PageHeader({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack gap="2">
      <Heading as="h1" textStyle="4xl">
        {title}
      </Heading>
      <Text color="fg.muted">{children}</Text>
    </Stack>
  )
}
