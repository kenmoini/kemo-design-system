export type DeploymentStatus = 'available' | 'progressing' | 'degraded' | 'paused'

/** `[]` means "All". */
export interface ScopeValue {
  clusters: string[]
  namespaces: string[]
}

export interface ClusterOption {
  id: string
  label: string
  namespaces: string[]
}

export interface K8sMeta {
  name: string
  namespace: string
  uid?: string
  resourceVersion?: string
  generation?: number
  creationTimestamp?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
  managedFields?: unknown[]
}

/** The subset of an apps/v1 Deployment the UI reads. */
export interface DeploymentResource {
  apiVersion: 'apps/v1'
  kind: 'Deployment'
  metadata: K8sMeta
  spec: {
    replicas?: number
    paused?: boolean
    selector: { matchLabels?: Record<string, string> }
    strategy?: {
      type?: 'RollingUpdate' | 'Recreate'
      rollingUpdate?: { maxSurge?: string | number; maxUnavailable?: string | number }
    }
    minReadySeconds?: number
    revisionHistoryLimit?: number
    progressDeadlineSeconds?: number
    template: {
      metadata?: { labels?: Record<string, string>; annotations?: Record<string, string> }
      spec: {
        containers: Container[]
        volumes?: Volume[]
        serviceAccountName?: string
        nodeSelector?: Record<string, string>
        restartPolicy?: string
      }
    }
  }
  status?: {
    replicas?: number
    updatedReplicas?: number
    readyReplicas?: number
    availableReplicas?: number
    observedGeneration?: number
    conditions?: {
      type: 'Available' | 'Progressing' | 'ReplicaFailure'
      status: 'True' | 'False' | 'Unknown'
      reason?: string
      message?: string
      lastTransitionTime?: string
    }[]
  }
}

export interface Container {
  name: string
  image: string
  ports?: { containerPort: number; name?: string }[]
  env?: {
    name: string
    value?: string
    valueFrom?: {
      configMapKeyRef?: { name: string; key: string }
      secretKeyRef?: { name: string; key: string }
    }
  }[]
  envFrom?: { configMapRef?: { name: string }; secretRef?: { name: string } }[]
  resources?: unknown
  volumeMounts?: { name: string; mountPath: string }[]
}

export interface Volume {
  name: string
  configMap?: { name: string }
  secret?: { secretName: string }
  persistentVolumeClaim?: { claimName: string }
  emptyDir?: unknown
}

export interface DeploymentSummary {
  /** `{cluster}/{namespace}/{name}` */
  id: string
  cluster: string
  namespace: string
  name: string
  status: DeploymentStatus
  ready: number
  desired: number
  updated: number
  available: number
  labels: Record<string, string>
  images: string[]
  createdAt: string
  paused: boolean
}

export interface RelatedObjects {
  pods: PodRef[]
  replicaSets: ReplicaSetRef[]
  services: ServiceRef[]
  ingresses: IngressRef[]
  configMaps: ConfigRef[]
  secrets: ConfigRef[]
  pvcs: PvcRef[]
  hpa?: HpaRef
  serviceAccount?: ServiceAccountRef
}

export interface PodRef {
  name: string
  phase: 'Running' | 'Pending' | 'Succeeded' | 'Failed' | 'Unknown'
  ready: boolean
  restarts: number
  node?: string
  createdAt: string
}

export interface ReplicaSetRef {
  name: string
  desired: number
  ready: number
  createdAt: string
  current: boolean
}

export interface ServiceRef {
  name: string
  type: 'ClusterIP' | 'NodePort' | 'LoadBalancer'
  clusterIP?: string
  ports: string[]
}

export interface IngressRef {
  name: string
  host: string
  path: string
  service: string
}

export interface ConfigRef {
  name: string
  usedAs: ('env' | 'envFrom' | 'volume')[]
  keys: number
}

export interface PvcRef {
  name: string
  status: 'Bound' | 'Pending' | 'Lost'
  capacity?: string
  storageClass?: string
}

export interface HpaRef {
  name: string
  min: number
  max: number
  target: string
  current: string
}

export interface ServiceAccountRef {
  name: string
  secrets: number
  roles: string[]
}

export interface K8sEvent {
  id: string
  type: 'Normal' | 'Warning'
  reason: string
  message: string
  involvedObject: { kind: 'Deployment' | 'ReplicaSet' | 'Pod'; name: string }
  count: number
  firstSeen: string
  lastSeen: string
  source?: string
}
