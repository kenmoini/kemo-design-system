import { describe, expect, it } from 'vitest'
import { relativeAge } from './age'

const now = '2026-06-01T00:00:00Z'
const ago = (seconds: number) => new Date(Date.parse(now) - seconds * 1000).toISOString()

describe('relativeAge', () => {
  it('formats seconds to years', () => {
    expect(relativeAge(ago(30), now)).toBe('30s')
    expect(relativeAge(ago(90), now)).toBe('1m')
    expect(relativeAge(ago(3 * 3600), now)).toBe('3h')
    expect(relativeAge(ago(42 * 86400), now)).toBe('42d')
    expect(relativeAge(ago(9 * 86400), now)).toBe('9d')
    expect(relativeAge(ago(120 * 86400), now)).toBe('120d')
    expect(relativeAge(ago(400 * 86400), now)).toBe('1y')
  })

  it('shows a dash for an invalid date', () => {
    expect(relativeAge('nope', now)).toBe('—')
  })
})
