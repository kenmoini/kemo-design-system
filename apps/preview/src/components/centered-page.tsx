import type { ReactNode } from 'react'
import { Stack } from '../../styled-system/jsx'

// Narrow centered column for the landing page and the auth stubs. The bottom padding keeps the
// last line of a long page clear of the floating preview-panel button.
export function CenteredPage({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Stack
      as="main"
      gap="3"
      align="center"
      textAlign="center"
      maxWidth="md"
      marginInline="auto"
      paddingInline="6"
      paddingTop="16"
      paddingBottom="24"
    >
      {children}
    </Stack>
  )
}
