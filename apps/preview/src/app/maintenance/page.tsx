import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: 'Maintenance' }

export default function MaintenanceRoute() {
  return <StatusDemo page="maintenance" />
}
