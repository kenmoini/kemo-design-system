'use client'
import { ark } from '@ark-ui/react/factory'
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react'
import { useId } from 'react'
import { Stack, styled } from '../../../styled-system/jsx'
import { Badge, Button, IconButton, Tooltip } from '../../components/ui'
import type { LinkComponent } from '../../pages/auth/types'
import { useAppShell } from './app-shell-context'
import type { NavItem, SideNavProps } from './types'
import { MEDIA_LG, useMediaQuery } from './use-media-query'

const Root = styled('div', {
  base: { display: 'flex', flexDirection: 'column', gap: '5', minH: 'full', py: '4', px: '3' },
  variants: { rail: { true: { px: '2' }, false: {} } },
})

const GroupLabel = styled('p', {
  base: { px: '2.5', pb: '1', textStyle: 'xs', fontWeight: 'medium', color: 'fg.subtle' },
  variants: { rail: { true: { srOnly: true }, false: {} } },
})

const ItemList = styled('ul', {
  base: { display: 'flex', flexDirection: 'column', gap: '0.5', listStyle: 'none' },
})

const ItemLink = styled(ark.a, {
  base: {
    display: 'flex',
    alignItems: 'center',
    gap: '2.5',
    h: '9',
    px: '2.5',
    borderRadius: 'l2',
    color: 'fg.muted',
    textStyle: 'sm',
    textDecoration: 'none',
    outline: 'none',
    focusVisibleRing: 'inside',
    transitionProperty: 'background-color, color',
    transitionDuration: 'normal',
    _icon: { boxSize: '4', flexShrink: '0' },
    _hover: { bg: 'gray.surface.bg.hover', color: 'fg.default' },
    _currentPage: { bg: 'gray.subtle.bg', color: 'fg.default', fontWeight: 'medium' },
  },
  variants: { rail: { true: { justifyContent: 'center', px: '0' }, false: {} } },
})

interface NavLinkProps {
  item: NavItem
  rail: boolean
  linkComponent?: LinkComponent
  onNavigate?: () => void
}

/** One item: Park-style link through the host's router link when given, a tooltip in the rail. */
function NavLink({ item, rail, linkComponent: LinkComponent, onNavigate }: NavLinkProps) {
  const hasBadge = item.badge !== undefined && item.badge !== ''
  const content = (
    <>
      <styled.span display="inline-flex" aria-hidden="true">
        {item.icon}
      </styled.span>
      {rail ? (
        <styled.span srOnly>
          {item.label}
          {hasBadge ? ` ${item.badge}` : null}
        </styled.span>
      ) : (
        <>
          <styled.span flex="1" minW="0" truncate>
            {item.label}
          </styled.span>
          {/* The space keeps "Deployments 12" two words for assistive tech; flex drops it visually. */}
          {hasBadge ? (
            <>
              {' '}
              <Badge size="sm" variant="subtle" color="fg.muted">
                {item.badge}
              </Badge>
            </>
          ) : null}
        </>
      )}
    </>
  )
  const linkProps = {
    rail,
    'aria-current': item.active ? ('page' as const) : undefined,
    onClick: onNavigate,
  }
  const link = LinkComponent ? (
    <ItemLink asChild {...linkProps}>
      <LinkComponent href={item.href}>{content}</LinkComponent>
    </ItemLink>
  ) : (
    <ItemLink href={item.href} {...linkProps}>
      {content}
    </ItemLink>
  )
  if (!rail) return link
  return (
    <Tooltip
      content={hasBadge ? `${item.label} (${item.badge})` : item.label}
      positioning={{ placement: 'right' }}
    >
      {link}
    </Tooltip>
  )
}

interface NavGroupSectionProps {
  label: string
  items: NavItem[]
  rail: boolean
  linkComponent?: LinkComponent
  onNavigate?: () => void
}

function NavGroupSection({ label, items, rail, linkComponent, onNavigate }: NavGroupSectionProps) {
  const labelId = useId()
  return (
    <Stack gap="0">
      <GroupLabel id={labelId} rail={rail}>
        {label}
      </GroupLabel>
      <ItemList aria-labelledby={labelId}>
        {items.map((item) => (
          <li key={item.id}>
            <NavLink
              item={item}
              rail={rail}
              linkComponent={linkComponent}
              onNavigate={onNavigate}
            />
          </li>
        ))}
      </ItemList>
    </Stack>
  )
}

/**
 * Grouped navigation for the shell's `nav`. Inside an `AppShell` it follows the shell: the icon rail
 * from `md` below `lg` or when collapsed, and a "Collapse sidebar" control from `lg`. Rail mode is
 * client state (media queries read after hydration), so the server render shows full labels until
 * then, clipped by the shell's 56px column between `md` and `lg`.
 */
export function SideNav({ groups, footer, linkComponent }: SideNavProps) {
  const shell = useAppShell()
  const lg = useMediaQuery(MEDIA_LG)
  const rail = shell?.isRail ?? false
  // In the mobile drawer, choosing a destination closes it (a client-side route keeps the shell).
  const onNavigate = shell?.drawerOpen ? () => shell.setDrawerOpen(false) : undefined
  const showFooter = Boolean(footer) && !rail
  const toggle = shell && lg ? shell : null

  return (
    <Root rail={rail}>
      {groups.map((group) => (
        <NavGroupSection
          key={group.label}
          label={group.label}
          items={group.items}
          rail={rail}
          linkComponent={linkComponent}
          onNavigate={onNavigate}
        />
      ))}
      {showFooter || toggle ? (
        <Stack gap="2" mt="auto">
          {showFooter ? footer : null}
          {toggle ? (
            toggle.collapsed ? (
              <IconButton
                variant="plain"
                size="sm"
                color="fg.muted"
                aria-label="Expand sidebar"
                onClick={() => toggle.setCollapsed(false)}
              >
                <PanelLeftOpenIcon />
              </IconButton>
            ) : (
              <Button
                variant="plain"
                size="sm"
                color="fg.muted"
                justifyContent="flex-start"
                onClick={() => toggle.setCollapsed(true)}
              >
                <PanelLeftCloseIcon />
                Collapse sidebar
              </Button>
            )
          ) : null}
        </Stack>
      ) : null}
    </Root>
  )
}
