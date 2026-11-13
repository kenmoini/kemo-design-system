import type { ReactNode } from 'react'
import { ForumDemoShell } from '@/components/forum/forum-demo-shell'

// The forum demo's state lives here, above every forum page and variation: Next remounts a page
// when its params change, so state held in a page would reset on every navigation. Held here, a
// reply or a new topic survives a trip to the front page or to another variation.
export default function ForumRouteLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <ForumDemoShell>{children}</ForumDemoShell>
}
