import type { ComponentType, ReactNode } from 'react'

/** A link component a host can inject (e.g. Next's `Link`); the pages default to Park's `Link`. */
export type LinkComponent = ComponentType<{ href: string; className?: string; children: ReactNode }>

/** An identity provider offered as a single sign-on button. */
export interface AuthProvider {
  id: string
  label: string
  icon?: ReactNode
  onSelect: () => void
}

/** Props every auth page shares: the layout slots for `AuthLayout` and a link component. */
export interface AuthShellProps {
  logo?: ReactNode
  brand: string
  footer?: ReactNode
  linkComponent?: LinkComponent
}
