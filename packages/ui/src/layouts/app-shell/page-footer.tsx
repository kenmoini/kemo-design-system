import { Flex, HStack, styled } from '../../../styled-system/jsx'
import { Link } from '../../components/ui'
import type { PageFooterProps } from './types'

// Status colors are fixed by tone; the text beside the dot always carries the meaning.
const StatusDot = styled('span', {
  base: { flexShrink: '0', boxSize: '2', borderRadius: 'full' },
  variants: {
    tone: {
      good: { bg: 'green.9' },
      warning: { bg: 'amber.9' },
      critical: { bg: 'red.9' },
    },
  },
})

/**
 * The page's closing line: product and version, a status dot with its text, then links. `AppShell`
 * places it in the `footer` landmark at the end of the content column.
 */
export function PageFooter({ product, version, status, links }: PageFooterProps) {
  return (
    <Flex
      gap="4"
      wrap="wrap"
      align="center"
      justify="space-between"
      pt="4"
      borderTopWidth="1px"
      borderColor="border"
      textStyle="xs"
      color="fg.muted"
    >
      <span>
        {product} {version}
      </span>
      <HStack gap="2">
        <StatusDot tone={status.tone} aria-hidden="true" />
        <span>{status.text}</span>
      </HStack>
      <HStack gap="5" flexWrap="wrap">
        {links.map((link) => (
          <Link key={link.label} href={link.href} variant="plain" fontWeight="normal">
            {link.label}
          </Link>
        ))}
      </HStack>
    </Flex>
  )
}
