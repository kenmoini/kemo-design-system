import type { ReactNode } from 'react'
import { CenteredPage } from '@/components/centered-page'

export default function AuthLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <CenteredPage>{children}</CenteredPage>
}
