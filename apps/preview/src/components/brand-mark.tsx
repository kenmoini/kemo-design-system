import { css } from '../../styled-system/css'

/** The preview's stand-in logo: a 24px neutral square with a white "A". */
export function BrandMark() {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      aria-hidden
      className={css({ color: 'gray.9', flexShrink: 0 })}
    >
      <rect width="24" height="24" rx="2" fill="currentColor" />
      <text
        x="12"
        y="16.5"
        textAnchor="middle"
        fontSize="13"
        fontWeight="700"
        className={css({ fill: 'white' })}
      >
        A
      </text>
    </svg>
  )
}
