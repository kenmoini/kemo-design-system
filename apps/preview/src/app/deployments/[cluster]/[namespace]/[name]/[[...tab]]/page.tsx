import type { DeploymentTab } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { DeploymentDetailDemo } from '@/components/deployments/deployment-detail-demo'
import { clusters, deployments } from '@/lib/mock-deployments'

interface DeploymentRouteProps {
  params: Promise<{ cluster: string; namespace: string; name: string; tab?: string[] }>
}

/** The tabs and the URL segment of each; the Overview is the bare URL. */
const TABS: { id: DeploymentTab; segment?: string; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'yaml', segment: 'yaml', label: 'YAML' },
  { id: 'events', segment: 'events', label: 'Events' },
]

export function generateStaticParams() {
  return deployments.flatMap(({ cluster, resource: { metadata } }) =>
    TABS.map(({ segment }) => ({
      cluster,
      namespace: metadata.namespace,
      name: metadata.name,
      tab: segment ? [segment] : [],
    })),
  )
}

/**
 * What a URL names: an unknown cluster, a namespace the cluster doesn't have, an unknown tab or
 * anything below one is a 404. The name is checked by the page, which knows the Deployments
 * created since the visit began.
 */
async function resolve(params: DeploymentRouteProps['params']) {
  const { cluster, namespace, name, tab = [] } = await params
  const match = TABS.find(({ segment }) => segment === tab[0])
  const known = clusters.find((c) => c.id === cluster)
  if (!known?.namespaces.includes(namespace) || !match || tab.length > 1) notFound()
  return { cluster, namespace, name, tab: match }
}

export async function generateMetadata({ params }: DeploymentRouteProps): Promise<Metadata> {
  const { name, tab } = await resolve(params)
  return { title: `${name} · ${tab.label}` }
}

export default async function DeploymentRoute({ params }: DeploymentRouteProps) {
  const { cluster, namespace, name, tab } = await resolve(params)
  return <DeploymentDetailDemo cluster={cluster} namespace={namespace} name={name} tab={tab.id} />
}
