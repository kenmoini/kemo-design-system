'use client'
import { useEffect, useRef, type ReactNode } from 'react'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Drawer, Heading, Text } from '../../components/ui'
import type { AuthShellProps } from './types'

export type AuthLayoutProps = Omit<AuthShellProps, 'linkComponent'> & {
  title: string
  description?: string
  children: ReactNode
  extras?: ReactNode
}

// The page behind the drawer: the Nightfall gradient across the whole viewport.
const GradientBackdrop = styled('div', {
  base: { position: 'fixed', inset: '0', bgGradient: 'auth' },
})

/**
 * The shell every auth page renders: the gradient page with an always-open, non-dismissable dark
 * glass drawer on the start side. It owns the spacing rules; the page supplies the form body.
 */
export function AuthLayout({
  logo,
  brand,
  title,
  description,
  children,
  extras,
  footer,
}: AuthLayoutProps) {
  // A new title means the page changed state (Forgot password's sent state, say) and its form,
  // possibly holding focus, is gone: move focus to the heading so it lands, and is announced,
  // somewhere sensible. Skip the first render; the drawer's initial focus owns that.
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousTitle = useRef(title)
  useEffect(() => {
    if (previousTitle.current === title) return
    previousTitle.current = title
    headingRef.current?.focus({ preventScroll: true })
  }, [title])

  return (
    <>
      <GradientBackdrop />
      <Drawer.Root
        open
        modal={false}
        trapFocus={false}
        preventScroll={false}
        closeOnEscape={false}
        closeOnInteractOutside={false}
        lazyMount={false}
        unmountOnExit={false}
        placement="start"
        size={{ base: 'full', md: 'lg' }}
      >
        {/* `.dark` forces Park's dark color mode on the drawer whatever the host theme (the
            theme's global CSS re-declares the palette variables on every `.dark` and `.light`
            subtree), and `colorScheme` does the same for native parts (scrollbars, autofill). The
            positioner covers the viewport, so it lets pointer events through to the page. */}
        <Drawer.Positioner className="dark" colorScheme="dark" pointerEvents="none">
          <Drawer.Content
            pointerEvents="auto"
            // No motion on load: drop the recipe's slide-in, which would play on every page view.
            animationName="none"
            bg="black.a9"
            backdropFilter="auto"
            backdropBlur="xl"
            borderInlineEndWidth="1px"
            borderColor="white.a3"
            color="fg.default"
          >
            <Stack h="full" px="8" py="7" gap="0" overflowY="auto">
              <HStack gap="3">
                {logo}
                <Text textStyle="sm" color="fg.muted">
                  {brand}
                </Text>
              </HStack>
              <Stack gap="2" mt="12" mb="8">
                {/* Focusable only from script (see above), so no ring: it is not a control. */}
                <Drawer.Title asChild>
                  <Heading
                    ref={headingRef}
                    as="h1"
                    tabIndex={-1}
                    outline="none"
                    textStyle="xl"
                    fontWeight="semibold"
                    letterSpacing="tight"
                  >
                    {title}
                  </Heading>
                </Drawer.Title>
                {description ? (
                  <Drawer.Description asChild>
                    <Text color="fg.muted">{description}</Text>
                  </Drawer.Description>
                ) : null}
              </Stack>
              {children}
              {extras ? <Box mt="4">{extras}</Box> : null}
              {footer ? (
                <Text
                  as="div"
                  mt="auto"
                  pt="8"
                  pb={{ base: '20', sm: '0' }}
                  textStyle="xs"
                  color="fg.subtle"
                >
                  {footer}
                </Text>
              ) : null}
            </Stack>
          </Drawer.Content>
        </Drawer.Positioner>
      </Drawer.Root>
    </>
  )
}
