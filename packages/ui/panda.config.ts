import { defineConfig } from '@pandacss/dev'
import { radii } from '~/theme/radii'
import { fonts } from '~/theme/tokens/fonts'

export default defineConfig({
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  outdir: 'styled-system',
  jsxFramework: 'react',
  theme: {
    extend: {
      tokens: { fonts },
      semanticTokens: { radii },
    },
  },
})
