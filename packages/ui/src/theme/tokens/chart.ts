import { defineSemanticTokens } from '@pandacss/dev'

// The dataviz-validated categorical series hues (light and dark), used as chart.1 to chart.5.
export const chart = defineSemanticTokens.colors({
  1: { value: { _light: '#2a78d6', _dark: '#3987e5' } },
  2: { value: { _light: '#eb6834', _dark: '#d95926' } },
  3: { value: { _light: '#1baf7a', _dark: '#199e70' } },
  4: { value: { _light: '#eda100', _dark: '#c98500' } },
  5: { value: { _light: '#e87ba4', _dark: '#d55181' } },
})
