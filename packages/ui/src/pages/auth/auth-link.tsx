'use client'
import type { ReactNode } from 'react'
import { Link } from '../../components/ui'
import type { LinkComponent } from './types'

export interface AuthLinkProps {
  href: string
  linkComponent?: LinkComponent
  children: ReactNode
}

/** Park's `Link`, rendered through the host's router link component when one is supplied. */
export function AuthLink({ href, linkComponent: LinkComponent, children }: AuthLinkProps) {
  if (LinkComponent) {
    return (
      <Link asChild>
        <LinkComponent href={href}>{children}</LinkComponent>
      </Link>
    )
  }
  return <Link href={href}>{children}</Link>
}
