import { Grid } from '../../styled-system/jsx'
import { Button } from '../components/ui'

export interface QuickActionsProps {
  actions: { label: string; onSelect?: () => void }[]
}

export function QuickActions({ actions }: QuickActionsProps) {
  return (
    <Grid columns={2} gap="2">
      {actions.map((a) => (
        <Button key={a.label} size="sm" variant="outline" onClick={a.onSelect}>
          {a.label}
        </Button>
      ))}
    </Grid>
  )
}
