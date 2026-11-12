'use client'
import type { ReactNode } from 'react'
import { css } from '../../../styled-system/css'
import { Box } from '../../../styled-system/jsx'
import { Button } from '../../components/ui'
import type { LinkComponent } from '../auth/types'
import { SubscribeDialog } from './subscribe-dialog'
import type { BlogChromeProps } from './types'

export type BlogLayoutProps = Pick<
  BlogChromeProps,
  'logo' | 'brand' | 'section' | 'nav' | 'footer' | 'onSubscribe' | 'linkComponent' | 'indexHref'
> & {
  /** Drop the top bar's Subscribe button (a page that shows its own form). */
  hideSubscribe?: boolean
  children: ReactNode
}

const brandLink = css({
  display: 'flex',
  alignItems: 'center',
  gap: '2',
  textStyle: 'sm',
  color: 'fg.default',
  textDecoration: 'none',
  rounded: 'l1',
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'colorPalette.default',
    outlineOffset: '2px',
  },
})
const navLink = css({
  textStyle: 'sm',
  color: 'fg.muted',
  textDecoration: 'none',
  _hover: { color: 'fg.default' },
  _focusVisible: {
    outline: '2px solid',
    outlineColor: 'colorPalette.default',
    outlineOffset: '2px',
  },
  '&[aria-current=page]': { color: 'fg.default', fontWeight: 'medium' },
})

function Anchor({
  as: Link,
  ...props
}: { as?: LinkComponent; href: string; className: string; children: ReactNode } & {
  'aria-current'?: 'page'
}) {
  return Link ? <Link {...props} /> : <a {...props} />
}

/** The blog's own page chrome (outside the console shell): top bar, main and footer. */
export function BlogLayout({
  logo,
  brand,
  section = 'Blog',
  nav,
  footer,
  onSubscribe,
  hideSubscribe,
  linkComponent,
  indexHref,
  children,
}: BlogLayoutProps) {
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
        <Anchor as={linkComponent} href={indexHref} className={brandLink}>
          {logo}
          <Box as="span" fontWeight="semibold">
            {brand}
          </Box>
          <Box as="span" color="fg.subtle">
            / {section}
          </Box>
        </Anchor>
        {nav && nav.length > 0 ? (
          <Box as="nav" aria-label="Blog" display={{ base: 'none', md: 'flex' }} gap="4">
            {nav.map((item) => (
              <Anchor
                key={item.href}
                as={linkComponent}
                href={item.href}
                className={navLink}
                aria-current={item.current ? 'page' : undefined}
              >
                {item.label}
              </Anchor>
            ))}
          </Box>
        ) : null}
        <Box flex="1" />
        {onSubscribe && !hideSubscribe ? (
          <SubscribeDialog
            onSubscribe={onSubscribe}
            trigger={<Button size="sm">Subscribe</Button>}
          />
        ) : null}
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
        <Box>
          © {new Date().getFullYear()} {brand}
        </Box>
      </Box>
    </Box>
  )
}
