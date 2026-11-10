import type { ReactNode } from 'react'

export type Tone = 'good' | 'bad' | 'neutral'
export type StatusTone = 'good' | 'warning' | 'critical' | 'off'

export interface Delta {
  value: string
  direction: 'up' | 'down'
  tone: Tone
  suffix?: string
}

export interface Point {
  x: string | number
  y: number
}

export interface Series {
  id: string
  label: string
  data: Point[]
}

export interface TableData {
  columns: string[]
  rows: (string | number)[][]
}

export interface Column<T> {
  id: string
  header: string
  cell?: (row: T) => ReactNode
  align?: 'start' | 'end'
}
