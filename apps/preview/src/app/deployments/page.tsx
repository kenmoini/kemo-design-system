import type { Metadata } from 'next'
import { DeploymentsDemo } from '@/components/deployments/deployments-demo'

export const metadata: Metadata = { title: 'Deployments' }

export default function DeploymentsPage() {
  return <DeploymentsDemo />
}
