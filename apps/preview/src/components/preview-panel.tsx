'use client'
import { CloseButton, Drawer, Heading, IconButton, Link } from '@kemo/ui'
import { PanelRightOpenIcon } from 'lucide-react'
import NextLink from 'next/link'
import { usePathname } from 'next/navigation'
import { type ReactNode, useState } from 'react'
import { Stack } from '../../styled-system/jsx'
import { ThemeToggle } from './theme-toggle'

interface Route {
  href: string
  label: string
}

const pageRoutes: Route[] = [
  { href: '/', label: 'Home' },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/faq', label: 'FAQ' },
  { href: '/blank', label: 'Blank page' },
  { href: '/login', label: 'Sign in' },
  { href: '/register', label: 'Create your account' },
  { href: '/forgot-password', label: 'Reset your password' },
  { href: '/complete-profile', label: 'Complete your profile' },
]

const statusRoutes: Route[] = [
  { href: '/maintenance', label: 'Maintenance' },
  { href: '/errors/401', label: '401 Unauthorized' },
  { href: '/errors/403', label: '403 Forbidden' },
  { href: '/errors/404', label: '404 Not found' },
  { href: '/errors/500', label: '500 Server error' },
  { href: '/errors/503', label: '503 Unavailable' },
]

const componentRoutes: Route[] = [
  { href: '/components/buttons', label: 'Buttons' },
  { href: '/components/forms', label: 'Forms' },
  { href: '/components/surfaces', label: 'Surfaces' },
  { href: '/components/typography', label: 'Typography' },
]

export function PreviewPanel() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close on any navigation, including the browser's back and forward buttons. Adjusting state
  // during render (https://react.dev/learn/you-might-not-need-an-effect) avoids a setState effect.
  const [shownPathname, setShownPathname] = useState(pathname)
  if (pathname !== shownPathname) {
    setShownPathname(pathname)
    setOpen(false)
  }

  const close = () => setOpen(false)

  return (
    <Drawer.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      placement="end"
      size="sm"
    >
      <Drawer.Trigger asChild>
        <IconButton
          variant="solid"
          size="lg"
          borderRadius="full"
          position="fixed"
          bottom="4"
          insetInlineEnd="4"
          // Above the auth pages' drawer (zIndex modal), which covers narrow viewports.
          zIndex="toast"
          boxShadow="lg"
          aria-label="Open preview panel"
          data-testid="preview-panel-trigger"
        >
          <PanelRightOpenIcon />
        </IconButton>
      </Drawer.Trigger>
      <Drawer.Backdrop />
      <Drawer.Positioner>
        <Drawer.Content>
          <Drawer.Header>
            <Drawer.Title>Preview</Drawer.Title>
            <Drawer.CloseTrigger asChild>
              <CloseButton />
            </Drawer.CloseTrigger>
          </Drawer.Header>
          <Drawer.Body>
            <Stack gap="8" width="full">
              <Stack as="nav" aria-label="Preview routes" gap="8" width="full">
                <PanelSection title="Pages">
                  <RouteList routes={pageRoutes} pathname={pathname} onNavigate={close} />
                </PanelSection>
                <PanelSection title="Status pages">
                  <RouteList routes={statusRoutes} pathname={pathname} onNavigate={close} />
                </PanelSection>
                <PanelSection title="Components">
                  <RouteList routes={componentRoutes} pathname={pathname} onNavigate={close} />
                </PanelSection>
              </Stack>
              <PanelSection title="Theme">
                <ThemeToggle />
              </PanelSection>
            </Stack>
          </Drawer.Body>
        </Drawer.Content>
      </Drawer.Positioner>
    </Drawer.Root>
  )
}

function PanelSection({ title, children }: Readonly<{ title: string; children: ReactNode }>) {
  return (
    <Stack as="section" gap="3" alignItems="flex-start">
      <Heading as="h3" textStyle="sm" color="fg.muted">
        {title}
      </Heading>
      {children}
    </Stack>
  )
}

function RouteList({
  routes,
  pathname,
  onNavigate,
}: Readonly<{ routes: Route[]; pathname: string; onNavigate: () => void }>) {
  return (
    <Stack as="ul" gap="2">
      {routes.map((route) => (
        <li key={route.href}>
          <Link
            variant="plain"
            fontWeight="normal"
            _currentPage={{ fontWeight: 'semibold' }}
            asChild
          >
            <NextLink
              href={route.href}
              aria-current={route.href === pathname ? 'page' : undefined}
              onClick={onNavigate}
            >
              {route.label}
            </NextLink>
          </Link>
        </li>
      ))}
    </Stack>
  )
}
