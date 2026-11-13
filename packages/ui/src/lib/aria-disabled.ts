import { css } from '../../styled-system/css'

/**
 * The Park button recipe tints on hover unless the button is `:disabled`; a button that is "off"
 * through `aria-disabled` (so it stays focusable) would still tint. These put each variant's
 * resting background back while `aria-disabled="true"`; apply one only while the button is off.
 */
export const ariaDisabledOutline = css({
  '&[aria-disabled=true]': { cursor: 'not-allowed', _hover: { bg: 'transparent' } },
})

export const ariaDisabledSolid = css({
  '&[aria-disabled=true]': { cursor: 'not-allowed', _hover: { bg: 'colorPalette.solid.bg' } },
})
