'use client'
import { useState, type ReactNode } from 'react'
import { css } from '../../../styled-system/css'
import { Box } from '../../../styled-system/jsx'
import { Button } from '../../components/ui'
import { HostLink } from '../blog/host-link'
import { vocabulary } from './content'
import { SearchField, type SearchBinding } from './search-field'
import type { ForumCategory, ForumChromeProps } from './types'

export type ForumLayoutProps = Pick<
  ForumChromeProps,
  | 'variant'
  | 'logo'
  | 'brand'
  | 'section'
  | 'nav'
  | 'footer'
  | 'year'
  | 'linkComponent'
  | 'indexHref'
  | 'signInHref'
  | 'composerHref'
  | 'searchHref'
> & {
  /** Binds the top bar's search field to the page's own query. */
  search?: SearchBinding
  /** The category the primary action pre-selects. */
  composerCategory?: ForumCategory
  children: ReactNode
}

const focusRing = {
  outline: '2px solid',
  outlineColor: 'colorPalette.default',
  outlineOffset: '2px',
} as const
const brandLink = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  textStyle: 'sm',
  color: 'fg.default',
  textDecoration: 'none',
  rounded: 'l1',
  _focusVisible: focusRing,
})
const navLink = css({
  textStyle: 'sm',
  color: 'fg.muted',
  textDecoration: 'none',
  _hover: { color: 'fg.default' },
  _focusVisible: focusRing,
  '&[aria-current=page]': { color: 'fg.default', fontWeight: 'medium' },
})

/** A search field that sends the visitor to `searchHref(query)` on submit. */
function NavigatingSearch({
  variant,
  searchHref,
}: {
  variant: ForumChromeProps['variant']
  searchHref: (query: string) => string
}) {
  const [value, setValue] = useState('')
  return (
    <SearchField
      variant={variant}
      binding={{
        value,
        onChange: setValue,
        onSubmit: () => {
          const q = value.trim()
          if (q) window.location.assign(searchHref(q))
        },
      }}
    />
  )
}

/** The forum's own page chrome (outside the console shell): top bar, main and footer. */
export function ForumLayout({
  variant,
  logo,
  brand,
  section = 'Community',
  nav,
  footer,
  year,
  linkComponent,
  indexHref,
  signInHref,
  composerHref,
  searchHref,
  search,
  composerCategory,
  children,
}: ForumLayoutProps) {
  let field: ReactNode = null
  if (variant !== 'qa') {
    if (search) field = <SearchField variant={variant} binding={search} />
    else if (searchHref) field = <NavigatingSearch variant={variant} searchHref={searchHref} />
  }
  return (
    <Box minH="100dvh" bg="canvas" display="flex" flexDirection="column">
      <Box
        as="header"
        h="14"
        bg="gray.surface.bg"
        borderBottomWidth="1px"
        borderColor="border"
        display="flex"
        alignItems="center"
        gap="6"
        px={{ base: '4', md: '7' }}
      >
        <HostLink as={linkComponent} href={indexHref} className={brandLink}>
          {logo}
          <Box as="span" fontWeight="semibold">
            {brand}
          </Box>
          <Box as="span" color="fg.subtle">
            / {section}
          </Box>
        </HostLink>
        {nav && nav.length > 0 ? (
          <Box as="nav" aria-label="Forum" display={{ base: 'none', md: 'flex' }} gap="4">
            {nav.map((item) => (
              <HostLink
                key={item.href}
                as={linkComponent}
                href={item.href}
                className={navLink}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </HostLink>
            ))}
          </Box>
        ) : null}
        {field ? <Box display={{ base: 'none', md: 'block' }}>{field}</Box> : null}
        <Box flex="1" />
        {signInHref ? (
          <Button asChild variant="outline" size="sm">
            <HostLink as={linkComponent} href={signInHref}>
              Sign in
            </HostLink>
          </Button>
        ) : null}
        <Button asChild size="sm">
          <HostLink as={linkComponent} href={composerHref(composerCategory)}>
            {vocabulary[variant].primary}
          </HostLink>
        </Button>
      </Box>
      <Box as="main" flex="1">
        {children}
      </Box>
      <Box
        as="footer"
        borderTopWidth="1px"
        borderColor="border"
        px={{ base: '4', md: '7' }}
        py="4"
        display="flex"
        justifyContent="space-between"
        gap="4"
        textStyle="xs"
        color="fg.subtle"
      >
        <Box>{footer ?? null}</Box>
        {/* Without `year`, a page rendered in one year and hydrated in the next differs here. */}
        <Box suppressHydrationWarning>
          © {year ?? new Date().getFullYear()} {brand}
        </Box>
      </Box>
    </Box>
  )
}
