import { Flex, HStack, Stack } from '../../../styled-system/jsx'
import { Heading } from '../../components/ui'
import type { PageHeaderProps } from './types'

/** The page's `h1` with an optional muted context line and an actions row on the right. */
export function PageHeader({ title, context, actions }: PageHeaderProps) {
  return (
    <Flex gap="4" wrap="wrap" align="flex-start" justify="space-between">
      <Stack gap="1" minW="0">
        <Heading as="h1" textStyle="2xl" fontWeight="semibold" letterSpacing="tight">
          {title}
        </Heading>
        {context ? (
          <HStack gap="3" flexWrap="wrap" textStyle="sm" color="fg.muted">
            {context}
          </HStack>
        ) : null}
      </Stack>
      {actions ? (
        <HStack gap="2" flexWrap="wrap">
          {actions}
        </HStack>
      ) : null}
    </Flex>
  )
}
