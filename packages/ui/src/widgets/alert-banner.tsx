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
      <Alert.Content>
        <Alert.Title>{title}</Alert.Title>
        <Alert.Description>{description}</Alert.Description>
      </Alert.Content>
      {action ? (
        <Button size="sm" variant="outline" onClick={action.onSelect}>
          {action.label}
        </Button>
      ) : null}
    </Alert.Root>
  )
}
