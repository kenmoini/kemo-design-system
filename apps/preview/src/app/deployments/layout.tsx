import type { ReactNode } from 'react'
import { DeploymentsDemoShell } from '@/components/deployments/deployments-demo'

// The console frame and the demo's state live here, above the list, the create page and the
// detail tabs: Next remounts a page when its params change, so state held in a page would reset on
// every tab switch. Held here, a YAML draft survives a trip to another tab or page.
export default function DeploymentsLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <DeploymentsDemoShell>{children}</DeploymentsDemoShell>
}
