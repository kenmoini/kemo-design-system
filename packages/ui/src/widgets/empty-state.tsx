import { Stack, type StackProps } from '../../styled-system/jsx'
import { Button, Text } from '../components/ui'

export interface EmptyStateProps {
  message: string
  /** Renders as an enabled button that does nothing when `onSelect` is absent. */
  action?: { label: string; onSelect?: () => void }
  /** A minimum height (a sizes token, e.g. `60`); the content centres vertically within it. */
  minH?: StackProps['minH']
}

export function EmptyState({ message, action, minH }: EmptyStateProps) {
  return (
    <Stack
      align="center"
      justify="center"
      gap="3"
      p="8"
      // eslint-disable-next-line @pandacss/no-dynamic-styling -- extracted where it is written, e.g. BlankPage's <EmptyState minH="60">
      minH={minH}
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
