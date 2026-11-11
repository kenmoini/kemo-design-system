import type { ReactNode } from 'react'
import { AccessDemoShell } from '@/components/access/access-demo'

// The shell, the tab strip and the demo's state live here, above the `[[...tab]]` page: Next
// remounts a page when its params change, so state held in the page would reset on every tab
// switch (and focus would leave the tab that was clicked).
export default function AccessLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <AccessDemoShell>{children}</AccessDemoShell>
}
