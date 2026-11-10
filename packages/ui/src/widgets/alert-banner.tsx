import { Flex } from '../../styled-system/jsx'
import { Alert, Button } from '../components/ui'

export interface AlertBannerProps {
  title: string
  description: string
  action?: { label: string; onSelect: () => void }
}

export function AlertBanner({ title, description, action }: AlertBannerProps) {
  return (
    <Alert.Root status="error" variant="surface">
      <Alert.Indicator />
      {/* The action sits under the text on narrow screens and beside it from `sm`. */}
      <Flex flex="1" minW="0" direction={{ base: 'column', sm: 'row' }} align="flex-start" gap="3">
        <Alert.Content>
          <Alert.Title>{title}</Alert.Title>
          <Alert.Description>{description}</Alert.Description>
        </Alert.Content>
        {action ? (
          <Button size="sm" variant="outline" flexShrink="0" onClick={action.onSelect}>
            {action.label}
          </Button>
        ) : null}
      </Flex>
    </Alert.Root>
  )
}
