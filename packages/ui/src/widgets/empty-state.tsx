import { Stack } from '../../styled-system/jsx'
import { Button, Text } from '../components/ui'

export interface EmptyStateProps {
  message: string
  action?: { label: string; onSelect: () => void }
}

export function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <Stack
      align="center"
      gap="3"
      p="8"
      textAlign="center"
      borderWidth="1px"
      borderStyle="dashed"
      borderColor="border"
      borderRadius="l3"
    >
      <Text color="fg.muted" textStyle="sm">
        {message}
      </Text>
      {action ? (
        <Button size="sm" variant="outline" onClick={action.onSelect}>
          {action.label}
        </Button>
      ) : null}
    </Stack>
  )
}
