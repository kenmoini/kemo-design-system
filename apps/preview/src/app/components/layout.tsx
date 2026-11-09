import type { ReactNode } from 'react'
import { Stack } from '../../../styled-system/jsx'

// Wide column for the component pages; the bottom padding keeps the last section clear of the
// floating preview-panel button.
export default function ComponentsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Stack
      as="main"
      gap="12"
      maxWidth="4xl"
      marginInline="auto"
      paddingInline="6"
      paddingTop="10"
      paddingBottom="24"
    >
      {children}
    </Stack>
  )
}
