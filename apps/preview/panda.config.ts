import { defineConfig } from '@pandacss/dev'

export default defineConfig({
  // Tokens, recipes, conditions, globalCss and presets arrive with the design system's lib preset.
  designSystem: '@kemo/ui',
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  outdir: 'styled-system',
  jsxFramework: 'react',
  // The preview renders every recipe variant; the library itself never sets staticCss.
  staticCss: { recipes: '*' },
})
