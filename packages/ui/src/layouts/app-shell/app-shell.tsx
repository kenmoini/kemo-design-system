'use client'
import { Portal } from '@ark-ui/react/portal'
import { Stack, styled } from '../../../styled-system/jsx'
import { CloseButton, Drawer } from '../../components/ui'
import { AppShellProvider, useAppShell } from './app-shell-context'
import { SkipLink } from './skip-link'
import type { AppShellProps } from './types'

// The columns follow the same breakpoints as the context (md 48em, lg 64em) so the server render
// already has the right layout: content only, then the 56px rail, then the 240px side navigation.
const Body = styled('div', {
  base: {
    display: 'grid',
    flex: '1',
    gridTemplateColumns: { base: '1fr', md: '56px 1fr', lg: '240px 1fr' },
  },
  variants: {
    collapsed: { true: { gridTemplateColumns: { lg: '56px 1fr' } }, false: {} },
  },
})

/**
 * The signed-in application frame: a skip link, the top bar across the page, the side navigation
 * (240px, an icon rail below `lg` or when collapsed, a drawer below `md`), the content, and the
 * footer at the end of the content column. State is shared with the parts through `useAppShell()`.
 */
export function AppShell({ defaultCollapsed, ...props }: AppShellProps) {
  return (
    <AppShellProvider defaultCollapsed={defaultCollapsed}>
      <ShellFrame {...props} />
    </AppShellProvider>
  )
}

function ShellFrame({
  topBar,
  sideNav,
  footer,
  children,
}: Omit<AppShellProps, 'defaultCollapsed'>) {
  // Always rendered inside the provider above.
  const shell = useAppShell()!

  return (
    <Stack gap="0" minH="100dvh" bg="canvas" color="fg.default">
      <SkipLink href="#main">Skip to content</SkipLink>
      <styled.header
        position="sticky"
        top="0"
        zIndex="sticky"
        h="14"
        flexShrink="0"
        bg="gray.surface.bg"
        borderBottomWidth="1px"
        borderColor="border"
      >
        {topBar}
      </styled.header>
      <Body collapsed={shell.collapsed}>
        <styled.nav
          aria-label="Primary"
          data-rail={shell.isRail ? 'true' : 'false'}
          display={{ base: 'none', md: 'block' }}
          position="sticky"
          top="14"
          alignSelf="start"
          h="calc(100dvh - {sizes.14})"
          overflowX="hidden"
          overflowY="auto"
          bg="gray.surface.bg"
          borderInlineEndWidth="1px"
          borderColor="border"
        >
          {sideNav}
        </styled.nav>
        <Stack gap="10" minW="0" px={{ base: '4', md: '6' }} py="6">
          <styled.main id="main" tabIndex={-1} flex="1" minW="0" outline="none">
            {children}
          </styled.main>
          {footer ? <footer>{footer}</footer> : null}
        </Stack>
      </Body>
      <Drawer.Root
        open={shell.drawerOpen}
        onOpenChange={(details) => shell.setDrawerOpen(details.open)}
        placement="start"
        size="xs"
      >
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content>
              <Drawer.Title srOnly>Navigation</Drawer.Title>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" />
              </Drawer.CloseTrigger>
              <styled.nav aria-label="Primary" h="full" overflowY="auto" pt="8">
                {sideNav}
              </styled.nav>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Stack>
  )
}
