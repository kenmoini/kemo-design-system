import { defineConfig, definePlugin } from '@pandacss/dev'
import { animationStyles } from '~/theme/animation-styles'
import { colors as palettes } from '~/theme/colors'
import { conditions } from '~/theme/conditions'
import { globalCss } from '~/theme/global-css'
import { keyframes } from '~/theme/keyframes'
import { layerStyles } from '~/theme/layer-styles'
import { radii } from '~/theme/radii'
import { recipes, slotRecipes } from '~/theme/recipes'
import { textStyles } from '~/theme/text-styles'
import { colors } from '~/theme/tokens/colors'
import { durations } from '~/theme/tokens/durations'
import { easings } from '~/theme/tokens/easings'
import { fonts } from '~/theme/tokens/fonts'
import { gradients } from '~/theme/tokens/gradients'
import { shadows } from '~/theme/tokens/shadows'
import { zIndex } from '~/theme/tokens/z-index'

// Park UI uses Radix 12-step palettes; drop Panda's 50–950 color scale (documented by Park UI).
const removePandaPresetColors = definePlugin({
  name: 'Remove Panda Preset Colors',
  hooks: {
    'preset:resolved': ({ utils, preset, name }) =>
      name === '@pandacss/preset-panda'
        ? utils.omit(preset, ['theme.tokens.colors', 'theme.semanticTokens.colors'])
        : preset,
  },
})

export default defineConfig({
  // Panda v2 never adds preset-base implicitly.
  presets: ['@pandacss/preset-base', '@pandacss/preset-panda'],
  plugins: [removePandaPresetColors],
  preflight: true,
  include: ['./src/**/*.{ts,tsx}'],
  // Keep tests out of the shipped manifest (buildinfo.json) so consumers get no test-only styles.
  exclude: ['./src/**/*.test.{ts,tsx}', './src/test/**'],
  outdir: 'styled-system',
  jsxFramework: 'react',
  // No staticCss: `panda lib` bakes this config into the preset every consumer loads; the preview app sets it.
  // No prefix (pre-publish decision).
  conditions,
  globalCss: {
    extend: {
      ...globalCss.extend,
      html: {
        // Keeps Park's colorPalette: 'gray'; gray aliases neutral below, so the accent is neutral.
        ...globalCss.extend.html,
        '--global-font-body': 'fonts.body',
        '--global-font-mono': 'fonts.mono',
      },
    },
  },
  theme: {
    extend: {
      animationStyles,
      recipes,
      slotRecipes,
      keyframes,
      layerStyles,
      textStyles,
      tokens: { colors, durations, easings, gradients, zIndex, fonts },
      semanticTokens: {
        colors: {
          ...palettes,
          gray: palettes.neutral,
          fg: {
            default: { value: { _light: '{colors.gray.12}', _dark: '{colors.gray.12}' } },
            muted: { value: { _light: '{colors.gray.11}', _dark: '{colors.gray.11}' } },
            subtle: { value: { _light: '{colors.gray.10}', _dark: '{colors.gray.10}' } },
          },
          // Not in Park's __init; its global-css body background uses it.
          canvas: { value: { _light: '{colors.gray.1}', _dark: '{colors.gray.1}' } },
          border: { value: { _light: '{colors.gray.4}', _dark: '{colors.gray.4}' } },
          error: { value: { _light: '{colors.red.9}', _dark: '{colors.red.9}' } },
        },
        shadows,
        radii,
      },
    },
  },
})
