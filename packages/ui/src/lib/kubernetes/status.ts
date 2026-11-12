import type { DeploymentResource, DeploymentStatus, DeploymentSummary } from './types'

/** Paused, then degraded, then progressing, else available. */
export function deploymentStatus(d: DeploymentResource): DeploymentStatus {
  if (d.spec.paused) return 'paused'
  const conditions = d.status?.conditions ?? []
  const find = (type: string) => conditions.find((c) => c.type === type)
  if (find('Available')?.status === 'False' || find('ReplicaFailure')?.status === 'True') {
    return 'degraded'
  }
  const progressing = find('Progressing')
  if (progressing?.status === 'True' && progressing.reason !== 'NewReplicaSetAvailable') {
    return 'progressing'
  }
  // No `status` object yet means nothing is observed, so updatedReplicas is 0 and it reads progressing.
  const desired = d.spec.replicas ?? 1
  if ((d.status?.updatedReplicas ?? 0) < desired) return 'progressing'
  return 'available'
}

export function summarize(
  d: DeploymentResource,
  cluster: string,
  status: DeploymentStatus = deploymentStatus(d),
): DeploymentSummary {
  const { metadata, spec } = d
  return {
    id: `${cluster}/${metadata.namespace}/${metadata.name}`,
    cluster,
    namespace: metadata.namespace,
    name: metadata.name,
    status,
    ready: d.status?.readyReplicas ?? 0,
    desired: spec.replicas ?? 1,
    updated: d.status?.updatedReplicas ?? 0,
    available: d.status?.availableReplicas ?? 0,
    labels: metadata.labels ?? {},
    images: spec.template.spec.containers.map((c) => c.image),
    createdAt: metadata.creationTimestamp ?? '',
    paused: !!spec.paused,
  }
}
