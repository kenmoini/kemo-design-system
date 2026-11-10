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
 * Every x across `series`, each once, keeping each series' own order: an x first seen in a later series
 * goes before the next x it shares with what is already listed (at the end when it shares none). So a
 * series that starts later than another still lands in axis order.
 */
export function unionX(series: Series[]): (string | number)[] {
  const order: (string | number)[] = []
  const seen = new Set<string | number>()
  for (const s of series) {
    // Per point, the next x of this series that is already listed: where a new x goes in before it.
    const anchors: (string | number | undefined)[] = []
    let anchor: string | number | undefined
    for (let i = s.data.length - 1; i >= 0; i--) {
      anchors[i] = anchor
      const x = s.data[i]?.x
      if (x !== undefined && seen.has(x)) anchor = x
    }
    s.data.forEach(({ x }, i) => {
      if (seen.has(x)) return
      const at = anchors[i]
      order.splice(at === undefined ? order.length : order.indexOf(at), 0, x)
      seen.add(x)
    })
  }
  return order
}

/**
 * Keeps at most `max` series (at least one): past that, the first `max - 1` stay and the rest are summed
 * point-wise into one `{ id: 'other', label: 'Other' }` series over the union of their x (in `unionX`
 * order; an x missing from a series counts as 0).
 */
export function foldSeries(series: Series[], max = 5): Series[] {
  const keep = Math.max(1, Math.floor(max))
  if (series.length <= keep) return series
  const rest = series.slice(keep - 1)
  const sums = new Map<string | number, number>(unionX(rest).map((x) => [x, 0]))
  for (const s of rest) {
    for (const p of s.data) sums.set(p.x, (sums.get(p.x) ?? 0) + p.y)
  }
  const other: Series = {
    id: 'other',
    label: 'Other',
    data: Array.from(sums, ([x, y]) => ({ x, y })),
  }
  return [...series.slice(0, keep - 1), other]
}

export interface PlottedSeries {
  key: string
  label: string
  color: string
}

/**
 * Folds `series` and pivots it into Recharts rows (`{ x, s0, s1, … }`), one row per x in `xs` order
 * (defaults to `unionX` order); a series without a point at some x leaves that key unset. Series are
 * keyed by position, not id, so an id such as `x` or `a.b` cannot collide with the x key or be read as
 * a nested path.
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
  for (const x of xs ?? unionX(folded)) rows.set(x, { x })
  folded.forEach((s, i) => {
    for (const p of s.data) {
      const row = rows.get(p.x)
      if (row) row[`s${i}`] = p.y
    }
  })
  return { plotted, rows: [...rows.values()] }
}
