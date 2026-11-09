import { describe, expect, it } from 'vitest'
import { token } from '../../styled-system/tokens'
import { radii } from './radii'

describe('theme tokens', () => {
  it('fonts point at the DM Sans variable with DM Sans and sans-serif fallbacks', () => {
    expect(token('fonts.body')).toBe(
      "var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif",
    )
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
  it('aliases gray to the neutral palette as a CSS variable reference', () => {
    const gray9 = token('colors.gray.9')
    expect(typeof gray9).toBe('string')
    expect(gray9).not.toBe('')
    expect(gray9.startsWith('var(')).toBe(true)
  })
  it('defines the canvas semantic color', () => {
    expect(token('colors.canvas')).toBeDefined()
  })
  it('includes the blue palette fetched at init', () => {
    expect(token('colors.blue.9')).toBeDefined()
  })
})
