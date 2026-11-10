import { token } from '../../styled-system/tokens'
import type { Series } from './types'

/** The categorical series palette, in its fixed order (never cycled). CSS variables, so dark mode is the token flip. */
export const seriesColors = [
  token.var('colors.chart.1'),
  token.var('colors.chart.2'),
  token.var('colors.chart.3'),
  token.var('colors.chart.4'),
  token.var('colors.chart.5'),
] as const

const otherColor = token.var('colors.gray.8')

/**
 * The colour of the series at `index`: the palette slot for the first five, neutral gray past them.
 * Pass `isOther` for a folded "Other" series so it is gray wherever it lands.
 */
export function colorForSeries(index: number, isOther = false): string {
  return isOther ? otherColor : (seriesColors[index] ?? otherColor)
}

/**
 * Keeps at most `max` series: past that, the first `max - 1` stay and the rest are summed point-wise by
 * `x` into one `{ id: 'other', label: 'Other' }` series (x order follows the first folded series; an x
 * missing from a series counts as 0).
 */
export function foldSeries(series: Series[], max = 5): Series[] {
  if (series.length <= max) return series
  const sums = new Map<string | number, number>()
  for (const s of series.slice(max - 1)) {
    for (const p of s.data) sums.set(p.x, (sums.get(p.x) ?? 0) + p.y)
  }
  const other: Series = {
    id: 'other',
    label: 'Other',
    data: Array.from(sums, ([x, y]) => ({ x, y })),
  }
  return [...series.slice(0, max - 1), other]
}

export interface PlottedSeries {
  key: string
  label: string
  color: string
}

/**
 * Folds `series` and pivots it into Recharts rows (`{ x, s0, s1, … }`), one row per x in `xs` order
 * (defaults to first-seen order). Series are keyed by position, not id, so an id such as `x` or `a.b`
 * cannot collide with the x key or be read as a nested path.
 */
export function plotSeries(series: Series[], xs?: (string | number)[]) {
  const folded = foldSeries(series)
  const didFold = folded.length < series.length
  const plotted: PlottedSeries[] = folded.map((s, i) => ({
    key: `s${i}`,
    label: s.label,
    color: colorForSeries(i, didFold && i === folded.length - 1),
  }))
  const rows = new Map<string | number, Record<string, string | number>>()
  for (const x of xs ?? []) rows.set(x, { x })
  folded.forEach((s, i) => {
    for (const p of s.data) {
      let row = rows.get(p.x)
      if (!row) {
        if (xs) continue
        row = { x: p.x }
        rows.set(p.x, row)
      }
      row[`s${i}`] = p.y
    }
  })
  return { plotted, rows: [...rows.values()] }
}
