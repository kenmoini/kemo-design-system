'use client'
import { cva } from '../../../../styled-system/css'
import { Box, styled } from '../../../../styled-system/jsx'
import { useCurrentSection } from '../../console/use-current-section'

export interface OnThisPageItem {
  id: string
  text: string
  level: 2 | 3
  /** Muted text after the label, e.g. a count. */
  suffix?: string
}

// Literal variant entries so Panda extracts both indents.
const entry = cva({
  base: {
    display: 'block',
    textStyle: 'sm',
    color: 'fg.muted',
    textDecoration: 'none',
    py: '1',
    borderLeftWidth: '2px',
    borderColor: 'border',
    _hover: { color: 'fg.default' },
    _focusVisible: { outline: '2px solid', outlineOffset: '2px' },
    '&[aria-current=location]': {
      color: 'fg.default',
      fontWeight: 'medium',
      borderColor: 'fg.default',
    },
  },
  variants: {
    level: {
      2: { pl: '3' },
      3: { pl: '6' },
    },
  },
})

/** The sections of a post as in-page links; the one the reader is in is `aria-current`. */
export function OnThisPage({ items }: { items: OnThisPageItem[] }) {
  const current = useCurrentSection(items.map((item) => item.id))
  return (
    <Box as="nav" aria-label="On this page">
      <styled.h2 textStyle="xs" color="fg.subtle" mb="2">
        On this page
      </styled.h2>
      <styled.ul m="0" p="0" listStyle="none">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={entry({ level: item.level })}
              aria-current={item.id === current ? 'location' : undefined}
            >
              {item.text}
              {item.suffix ? (
                <>
                  {' '}
                  <styled.span color="fg.subtle" fontWeight="normal">
                    {item.suffix}
                  </styled.span>
                </>
              ) : null}
            </a>
          </li>
        ))}
      </styled.ul>
    </Box>
  )
}
