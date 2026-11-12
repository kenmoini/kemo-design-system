import type {
  ClusterOption,
  DeploymentResource,
  DeploymentSummary,
  K8sEvent,
  RelatedObjects,
} from '../../lib/kubernetes'

// Shared by the Deployments page tests; not exported from the package.

export const NOW = '2026-11-12T12:00:00Z'

export const clusters: ClusterOption[] = [
  { id: 'prod-us-east', label: 'prod-us-east', namespaces: ['checkout', 'billing', 'platform'] },
  { id: 'prod-eu-west', label: 'prod-eu-west', namespaces: ['search', 'platform'] },
  { id: 'staging-us-east', label: 'staging-us-east', namespaces: ['auth', 'checkout'] },
]

type SummaryInput = Partial<DeploymentSummary> &
  Pick<DeploymentSummary, 'cluster' | 'namespace' | 'name'>

function summary(input: SummaryInput): DeploymentSummary {
  const { cluster, namespace, name } = input
  return {
    id: `${cluster}/${namespace}/${name}`,
    status: 'available',
    ready: 2,
    desired: 2,
    updated: 2,
    available: 2,
    labels: { app: name },
    images: [`ghcr.io/acme/${name}:1.0.0`],
    createdAt: '2026-11-09T12:00:00Z',
    paused: false,
    ...input,
  }
}

// Data order is not alphabetical: the list sorts by name.
export const rows: DeploymentSummary[] = [
  summary({
    cluster: 'prod-us-east',
    namespace: 'checkout',
    name: 'checkout-api',
    ready: 6,
    desired: 6,
    updated: 6,
    available: 6,
    labels: {
      app: 'checkout-api',
      tier: 'api',
      team: 'payments',
      'app.kubernetes.io/part-of': 'checkout',
    },
    images: ['ghcr.io/acme/checkout-api:2.14.0'],
    createdAt: '2026-10-01T12:00:00Z',
  }),
  summary({
    cluster: 'prod-us-east',
    namespace: 'checkout',
    name: 'web-frontend',
    status: 'progressing',
    ready: 3,
    desired: 5,
    updated: 3,
    available: 3,
  }),
  summary({
    cluster: 'prod-eu-west',
    namespace: 'search',
    name: 'search-indexer',
    status: 'degraded',
    ready: 1,
    desired: 3,
    updated: 3,
    available: 1,
  }),
  summary({
    cluster: 'prod-us-east',
    namespace: 'billing',
    name: 'billing-worker',
    status: 'paused',
    paused: true,
  }),
  summary({ cluster: 'staging-us-east', namespace: 'auth', name: 'auth-service' }),
]

export const checkoutApi: DeploymentResource = {
  apiVersion: 'apps/v1',
  kind: 'Deployment',
  metadata: {
    name: 'checkout-api',
    namespace: 'checkout',
    uid: '6f1c2c1e-0d55-4a43-9d4b-1f0b8f6c1a11',
    resourceVersion: '48213',
    generation: 3,
    creationTimestamp: '2026-10-01T12:00:00Z',
    labels: { app: 'checkout-api', tier: 'api' },
    annotations: {
      'deployment.kubernetes.io/revision': '3',
      'kemo.dev/created-by': 'Priya',
    },
  },
  spec: {
    replicas: 6,
    selector: { matchLabels: { app: 'checkout-api' } },
    strategy: { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } },
    template: {
      metadata: { labels: { app: 'checkout-api', tier: 'api' } },
      spec: {
        serviceAccountName: 'checkout-api',
        nodeSelector: { pool: 'general' },
        containers: [
          {
            name: 'api',
            image: 'ghcr.io/acme/checkout-api:2.14.0',
            ports: [{ containerPort: 8080, name: 'http' }],
          },
        ],
      },
    },
  },
  status: {
    replicas: 6,
    updatedReplicas: 6,
    readyReplicas: 6,
    availableReplicas: 6,
    observedGeneration: 3,
    conditions: [
      {
        type: 'Available',
        status: 'True',
        reason: 'MinimumReplicasAvailable',
        message: 'Deployment has minimum availability.',
        lastTransitionTime: '2026-11-12T09:00:00Z',
      },
      {
        type: 'Progressing',
        status: 'True',
        reason: 'NewReplicaSetAvailable',
        message: 'ReplicaSet "checkout-api-7d9f" has successfully progressed.',
        lastTransitionTime: '2026-11-12T11:56:00Z',
      },
    ],
  },
}

export const checkoutSummary: DeploymentSummary = rows[0]!

const pod = (suffix: string, restarts = 0) => ({
  name: `checkout-api-7d9f-${suffix}`,
  phase: 'Running' as const,
  ready: true,
  restarts,
  node: 'node-3',
  createdAt: '2026-11-12T11:56:00Z',
})

export const related: RelatedObjects = {
  pods: [
    pod('x2k4q'),
    pod('b81mn', 2),
    pod('q0ls2'),
    pod('m3n8z'),
    pod('t7v1c', 1),
    { ...pod('p9w2d'), phase: 'Pending', ready: false },
  ],
  replicaSets: [
    {
      name: 'checkout-api-7d9f',
      desired: 6,
      ready: 6,
      createdAt: '2026-11-12T11:50:00Z',
      current: true,
    },
    {
      name: 'checkout-api-5c1a',
      desired: 0,
      ready: 0,
      createdAt: '2026-10-01T12:00:00Z',
      current: false,
    },
  ],
  services: [
    {
      name: 'checkout-api',
      type: 'ClusterIP',
      clusterIP: '10.0.12.4',
      ports: ['80/TCP', '443/TCP'],
    },
  ],
  ingresses: [
    { name: 'checkout', host: 'checkout.acme.dev', path: '/api', service: 'checkout-api' },
  ],
  configMaps: [{ name: 'checkout-api-config', usedAs: ['envFrom'], keys: 4 }],
  secrets: [
    { name: 'checkout-api-secrets', usedAs: ['env'], keys: 3 },
    { name: 'tls-checkout', usedAs: ['volume'], keys: 2 },
  ],
  pvcs: [],
  hpa: { name: 'checkout-api', min: 3, max: 10, target: 'cpu 70%', current: 'cpu 41%' },
  serviceAccount: { name: 'checkout-api', secrets: 1, roles: ['checkout-reader', 'metrics'] },
}

const event = (
  id: string,
  type: K8sEvent['type'],
  reason: string,
  kind: string,
  name: string,
  lastSeen: string,
): K8sEvent => ({
  id,
  type,
  reason,
  message: `${reason} on ${name}`,
  involvedObject: { kind, name },
  count: 1,
  firstSeen: lastSeen,
  lastSeen,
})

export const events: K8sEvent[] = [
  event('e1', 'Normal', 'ScalingReplicaSet', 'Deployment', 'checkout-api', '2026-11-12T11:50:00Z'),
  event(
    'e2',
    'Normal',
    'SuccessfulCreate',
    'ReplicaSet',
    'checkout-api-7d9f',
    '2026-11-12T11:51:00Z',
  ),
  event('e3', 'Warning', 'BackOff', 'Pod', 'checkout-api-7d9f-b81mn', '2026-11-12T11:55:00Z'),
]
