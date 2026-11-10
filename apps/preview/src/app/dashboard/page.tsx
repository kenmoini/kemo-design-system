import type { Metadata } from 'next'
import { DashboardDemo } from '@/components/dashboard/dashboard-demo'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return <DashboardDemo />
}
