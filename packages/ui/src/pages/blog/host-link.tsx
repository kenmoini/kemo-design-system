import type { ComponentProps } from 'react'
import type { LinkComponent } from '../auth/types'

export type HostLinkProps = { as?: LinkComponent; href: string } & ComponentProps<'a'>

/** The host's link component when it supplied one, otherwise a bare `<a>`. */
export function HostLink({ as: Link, ...props }: HostLinkProps) {
  return Link ? <Link {...props} /> : <a {...props} />
}
