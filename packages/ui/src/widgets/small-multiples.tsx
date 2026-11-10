import { Grid, Stack } from '../../styled-system/jsx'
import { Text } from '../components/ui'
import { Sparkline, sparklineDomain } from './sparkline'

export interface SmallMultiplesProps {
  items: { label: string; data: number[] }[]
  columns?: number
}

/**
 * A grid of labelled sparklines for comparing like with like: one visual language and one y-domain
 * across every item, so a higher line means a higher value.
 */
export function SmallMultiples({ items, columns = 2 }: SmallMultiplesProps) {
  const domain = sparklineDomain(items.flatMap((item) => item.data))
  return (
    <Grid gap="3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
      {items.map((item) => (
        <Stack key={item.label} gap="1">
          <Text textStyle="xs" color="fg.muted">
            {item.label}
          </Text>
          <Sparkline data={item.data} label={item.label} domain={domain} />
        </Stack>
      ))}
    </Grid>
  )
}
