import { defineSemanticTokens } from '@pandacss/dev'

// XS radius scale
export const radii = defineSemanticTokens.radii({
  l1: { value: '0.0625rem' },
  l2: { value: '{radii.xs}' },
  l3: { value: '{radii.sm}' },
})
