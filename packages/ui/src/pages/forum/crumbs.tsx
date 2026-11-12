import { Fragment } from 'react'
import { Breadcrumb } from '../../components/ui'
import type { LinkComponent } from '../auth/types'
import { HostLink } from '../blog/host-link'

export function Crumbs({
  items,
  linkComponent,
}: {
  items: { label: string; href?: string }[]
  linkComponent?: LinkComponent
}) {
  return (
    <Breadcrumb.Root aria-label="Breadcrumb">
      <Breadcrumb.List>
        {items.map((item, i) => {
          const last = i === items.length - 1
          return (
            <Fragment key={i}>
              {i > 0 ? <Breadcrumb.Separator /> : null}
              <Breadcrumb.Item>
                {item.href && !last ? (
                  <Breadcrumb.Link asChild>
                    <HostLink as={linkComponent} href={item.href}>
                      {item.label}
                    </HostLink>
                  </Breadcrumb.Link>
                ) : (
                  <span aria-current={last ? 'page' : undefined}>{item.label}</span>
                )}
              </Breadcrumb.Item>
            </Fragment>
          )
        })}
      </Breadcrumb.List>
    </Breadcrumb.Root>
  )
}
