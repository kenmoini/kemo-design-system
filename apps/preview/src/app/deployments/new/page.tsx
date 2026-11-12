import type { Metadata } from 'next'
import { DeploymentCreateDemo } from '@/components/deployments/deployment-create-demo'

export const metadata: Metadata = { title: 'Create deployment' }

export default function CreateDeploymentPage() {
  return <DeploymentCreateDemo />
}
