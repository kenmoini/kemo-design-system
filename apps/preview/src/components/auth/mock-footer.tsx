import { HStack } from '../../../styled-system/jsx'

/** The demos' footer: a copyright line and a version, at either end. */
export function MockFooter() {
  return (
    <HStack justify="space-between" gap="4">
      <span>© 2026 Acme</span>
      <span>v1.4.2</span>
    </HStack>
  )
}
