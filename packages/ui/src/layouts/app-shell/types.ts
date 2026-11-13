import type { ReactNode } from 'react'
import type { LinkComponent } from '../../pages/auth/types'

/** One destination in the side navigation. `icon` is drawn at 16px; `active` marks the current page. */
export interface NavItem {
  id: string
  label: string
  icon: ReactNode
  href: string
  badge?: number | string
  active?: boolean
}

/** A labelled group of navigation items ("Platform", "Manage"). */
export interface NavGroup {
  label: string
  items: NavItem[]
}

export interface TopBarProps {
  brand: { logo?: ReactNode; name: string }
  search?: { placeholder: string; onSubmit?: (query: string) => void }
  environment?: {
    options: { value: string; label: string }[]
    value: string
    onChange?: (value: string) => void
  }
  /** Extra controls placed before the help and notifications buttons. */
  actions?: ReactNode
  /** The help button is shown only with this callback. */
  onHelp?: () => void
  /** The notifications button is shown only with this callback. */
  onNotifications?: () => void
  /** Count badge on the notifications button (needs `onNotifications`); omitted or 0 shows none. */
  notificationCount?: number
  account: { initials: string; name: string; menu: { label: string; onSelect?: () => void }[] }
}

export interface SideNavProps {
  groups: NavGroup[]
  /** Pinned below the groups (a workspace switcher, say); hidden in the icon rail. */
  footer?: ReactNode
  linkComponent?: LinkComponent
}

export interface PageHeaderProps {
  title: string
  context?: ReactNode
  actions?: ReactNode
}

export interface PageFooterProps {
  product: string
  version: string
  status: { tone: 'good' | 'warning' | 'critical'; text: string }
  links: { label: string; href: string }[]
}

export interface AppShellProps {
  topBar: ReactNode
  sideNav: ReactNode
  footer?: ReactNode
  /** Start with the side navigation collapsed to the icon rail (applies from `lg`). */
  defaultCollapsed?: boolean
  children: ReactNode
}
