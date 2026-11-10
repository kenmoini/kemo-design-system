import { Grid, Stack } from '../../styled-system/jsx'
import { Text } from '../components/ui'
import { Sparkline } from './sparkline'

export interface SmallMultiplesProps {
  items: { label: string; data: number[] }[]
  columns?: number
}

/** A grid of labelled sparklines sharing one visual language, for comparing like with like. */
export function SmallMultiples({ items, columns = 2 }: SmallMultiplesProps) {
  return (
    <Grid gap="3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <Stack key={item.label} gap="1">
          <Text textStyle="xs" color="fg.muted">
            {item.label}
          </Text>
          <Sparkline data={item.data} label={item.label} />
        </Stack>
      ))}
    </Grid>
  )
}
