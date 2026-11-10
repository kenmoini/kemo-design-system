import type { ComponentProps } from 'react'
import { styled } from '../../../styled-system/jsx'

/** A link that stays visually hidden until it receives focus; render it first in the page. */
export const SkipLink = styled('a', {
  base: {
    srOnly: true,
    zIndex: 'skipLink',
    bg: 'gray.solid.bg',
    color: 'gray.solid.fg',
    borderRadius: 'l2',
    textStyle: 'sm',
    fontWeight: 'medium',
    outline: 'none',
    focusVisibleRing: 'outside',
    _focus: {
      position: 'fixed',
      top: '2',
      insetInlineStart: '2',
      width: 'auto',
      height: 'auto',
      margin: '0',
      px: '3',
      py: '2',
      overflow: 'visible',
      clip: 'auto',
      whiteSpace: 'nowrap',
    },
  },
})

export type SkipLinkProps = ComponentProps<typeof SkipLink>
