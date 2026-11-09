import type { ReactNode } from 'react'
import { Stack } from '../../../styled-system/jsx'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Stack
      gap="3"
      align="center"
      textAlign="center"
      maxWidth="md"
      marginInline="auto"
      paddingBlock="16"
    >
      {children}
    </Stack>
  )
}
