import { Link } from '@kemo/ui'
import NextLink from 'next/link'
import { css } from '../../styled-system/css'
import { HStack } from '../../styled-system/jsx'
import { ThemeToggle } from './theme-toggle'

const routes = [
  { href: '/', label: 'Gallery' },
  { href: '/login', label: 'Login' },
  { href: '/register', label: 'Register' },
  { href: '/forgot-password', label: 'Forgot password' },
  { href: '/complete-profile', label: 'Complete profile' },
] as const

export function SiteNav() {
  return (
    <header className={css({ borderBottomWidth: '1px', borderColor: 'border' })}>
      <HStack
        as="nav"
        aria-label="Preview routes"
        justify="space-between"
        gap="6"
        maxWidth="6xl"
        marginInline="auto"
        paddingInline="6"
        paddingBlock="3"
      >
        <HStack gap="5" flexWrap="wrap">
          {routes.map((route) => (
            <Link key={route.href} variant="plain" textStyle="sm" asChild>
              <NextLink href={route.href}>{route.label}</NextLink>
            </Link>
          ))}
        </HStack>
        <ThemeToggle />
      </HStack>
    </header>
  )
}
