'use client'
import {
  ForbiddenPage,
  MaintenancePage,
  NotFoundPage,
  ServerErrorPage,
  UnauthorizedPage,
  UnavailablePage,
} from '@kemo/ui'
import NextLink from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import {
  maintenanceWindow,
  type StatusDemoPage,
  statusDemoActions,
  statusDemoProps,
} from '@/lib/mock-status'

/** One named status page with the preview's brand, request id, version and routed actions. */
export function StatusDemo({ page }: Readonly<{ page: StatusDemoPage }>) {
  const props = {
    ...statusDemoProps,
    logo: <BrandMark letter="K" />,
    linkComponent: NextLink,
    actions: statusDemoActions[page],
  }
  switch (page) {
    case '401':
      return <UnauthorizedPage {...props} />
    case '403':
      return <ForbiddenPage {...props} />
    case '404':
      return <NotFoundPage {...props} />
    case '500':
      return <ServerErrorPage {...props} />
    case '503':
      return <UnavailablePage {...props} />
    case 'maintenance':
      return <MaintenancePage {...props} {...maintenanceWindow} />
  }
}
