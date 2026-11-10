import type { ComponentPropsWithRef, ComponentType, ReactNode } from 'react'

/**
 * A link component a host can inject (e.g. Next's `Link`); the pages default to Park's `Link`.
 * Must forward rest props and ref to the rendered anchor (Next's Link does): the library passes
 * `className`, `aria-current`, event handlers and a ref through it.
 */
export type LinkComponent = ComponentType<
  Omit<ComponentPropsWithRef<'a'>, 'href'> & { href: string }
>

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
