import { describe, expect, it } from 'vitest'
import { token } from '../../styled-system/tokens'
import { radii } from './radii'

describe('theme tokens', () => {
  it('fonts point at the DM Sans variable with a sans-serif fallback', () => {
    expect(token('fonts.body')).toBe('var(--font-dm-sans), ui-sans-serif, system-ui, sans-serif')
    expect(token('fonts.heading')).toBe(token('fonts.body'))
  })
  it('defines the XS radius scale as semantic tokens', () => {
    expect(radii.l1.value).toBe('0.0625rem')
    expect(radii.l2.value).toBe('{radii.xs}')
    expect(radii.l3.value).toBe('{radii.sm}')
  })
  it('generates the radius tokens', () => {
    expect(token.var('radii.l1')).toBe('var(--radii-l1)')
    expect(token.var('radii.l2')).toBe('var(--radii-l2)')
    expect(token.var('radii.l3')).toBe('var(--radii-l3)')
  })
})
