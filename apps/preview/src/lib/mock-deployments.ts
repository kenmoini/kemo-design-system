import {
  type ClusterOption,
  type Container,
  CREATED_BY_ANNOTATION,
  type DeploymentResource,
  type K8sEvent,
  type PodRef,
  type RelatedObjects,
  type Volume,
} from '@kemo/ui'

// Mock data for the preview's Deployments pages (`/deployments/*`). Every Deployment is generated
// from the seed lists below and a string hash (no `Math.random`, no wall clock), so the server and
// client renders match. The state that changes is `deploymentsReducer` in `./deployments-reducer`.

/** The demo's "now": the ages read from it, and new events and Deployments are stamped with it. */
export const now = '2026-11-12T14:02:11Z'

const SECOND_MS = 1000
const MINUTE_MS = 60 * SECOND_MS
const HOUR_MS = 60 * MINUTE_MS
const DAY_MS = 24 * HOUR_MS

/** `from` moved by `ms`, as an ISO string without milliseconds. */
export function shiftTime(from: string, ms: number): string {
  return new Date(Date.parse(from) + ms).toISOString().replace('.000Z', 'Z')
}
const ago = (ms: number) => shiftTime(now, -ms)

/** FNV-1a: a stable 32-bit number for a string, the seed of every "random" choice below. */
export function hash(text: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// The characters Kubernetes uses for generated name suffixes (no vowels, no look-alikes).
const SAFE = 'bcdfghjklmnpqrstvwxz2456789'

/** `length` characters of Kubernetes' suffix alphabet, derived from `seed`. */
function suffix(seed: string, length: number): string {
  let out = ''
  let h = hash(seed)
  for (let i = 0; i < length; i++) {
    out += SAFE[h % SAFE.length]
    h = hash(`${seed}:${i}:${h}`)
  }
  return out
}

const pick = <T>(seed: string, list: readonly T[]): T => list[hash(seed) % list.length]!

// --- Clusters ----------------------------------------------------------------------------------

export const clusters: ClusterOption[] = [
  {
    id: 'prod-us-east',
    label: 'prod-us-east',
    namespaces: ['checkout', 'billing', 'platform', 'search'],
  },
  {
    id: 'prod-eu-west',
    label: 'prod-eu-west',
    namespaces: ['search', 'platform', 'notifications'],
  },
  { id: 'staging-us-east', label: 'staging-us-east', namespaces: ['auth', 'checkout', 'platform'] },
]

/** The public host suffix of each cluster's ingresses. */
const DOMAINS: Record<string, string> = {
  'prod-us-east': 'acme.dev',
  'prod-eu-west': 'eu.acme.dev',
  'staging-us-east': 'staging.acme.dev',
}

// --- Seeds -------------------------------------------------------------------------------------

type Tier = 'api' | 'web' | 'worker' | 'infra'

interface AppSeed {
  tier: Tier
  /** The image without its tag; `ghcr.io/acme/{name}` unless given. */
  image?: string
  version: string
  replicas: number
  port?: number
  /** A persistent volume claim `{name}-data` of this size. */
  data?: string
}

/** Every app the clusters run, by name. */
const APPS: Record<string, AppSeed> = {
  'checkout-api': { tier: 'api', version: '2.14.0', replicas: 6, port: 8080 },
  'web-frontend': { tier: 'web', version: '5.3.1', replicas: 5, port: 3000 },
  'cart-service': { tier: 'api', version: '1.9.2', replicas: 3, port: 8080 },
  'payment-gateway': { tier: 'api', version: '3.2.0', replicas: 4, port: 8443 },
  'order-events': { tier: 'worker', version: '0.18.4', replicas: 2 },
  'billing-worker': { tier: 'worker', version: '4.1.0', replicas: 2 },
  'invoice-api': { tier: 'api', version: '2.0.3', replicas: 3, port: 8080 },
  'ledger-sync': { tier: 'worker', version: '1.4.7', replicas: 1 },
  'tax-calculator': { tier: 'api', version: '0.9.12', replicas: 2, port: 8080 },
  'ingress-gateway': {
    tier: 'infra',
    image: 'registry.k8s.io/ingress-nginx/controller',
    version: 'v1.12.1',
    replicas: 3,
    port: 443,
  },
  'cert-manager': {
    tier: 'infra',
    image: 'quay.io/jetstack/cert-manager-controller',
    version: 'v1.16.2',
    replicas: 1,
  },
  'otel-collector': {
    tier: 'infra',
    image: 'otel/opentelemetry-collector-contrib',
    version: '0.118.0',
    replicas: 2,
    port: 4317,
  },
  'log-aggregator': { tier: 'infra', image: 'fluent/fluent-bit', version: '3.2.4', replicas: 2 },
  'config-server': { tier: 'api', version: '1.2.0', replicas: 2, port: 8888 },
  'search-api': { tier: 'api', version: '7.4.0', replicas: 4, port: 8080 },
  'search-indexer': { tier: 'worker', version: '7.4.0', replicas: 3 },
  'query-cache': {
    tier: 'infra',
    image: 'docker.io/library/redis',
    version: '7.4.2',
    replicas: 1,
    port: 6379,
    data: '10Gi',
  },
  'ranking-service': { tier: 'api', version: '2.8.1', replicas: 2, port: 8080 },
  notifications: { tier: 'worker', version: '3.0.2', replicas: 4 },
  'email-sender': { tier: 'worker', version: '1.11.0', replicas: 2 },
  'push-gateway': { tier: 'api', version: '0.7.3', replicas: 4, port: 8080 },
  'sms-relay': { tier: 'worker', version: '0.4.1', replicas: 1 },
  'auth-service': { tier: 'api', version: '5.0.0-rc.2', replicas: 2, port: 8080 },
  'session-store': {
    tier: 'infra',
    image: 'docker.io/library/redis',
    version: '7.4.2',
    replicas: 1,
    port: 6379,
    data: '5Gi',
  },
  'token-issuer': { tier: 'api', version: '1.3.0', replicas: 2, port: 8080 },
  'oidc-proxy': {
    tier: 'web',
    image: 'quay.io/oauth2-proxy/oauth2-proxy',
    version: 'v7.8.1',
    replicas: 2,
    port: 4180,
  },
  'mfa-service': { tier: 'api', version: '0.3.0', replicas: 1, port: 8080 },
}

const PLATFORM = [
  'ingress-gateway',
  'cert-manager',
  'otel-collector',
  'log-aggregator',
  'config-server',
]
const SEARCH = ['search-api', 'search-indexer', 'query-cache', 'ranking-service']

/** What runs where: cluster → namespace → app names. 18 + 13 + 14 = 45 Deployments. */
const PLACEMENT: Record<string, Record<string, string[]>> = {
  'prod-us-east': {
    checkout: ['checkout-api', 'web-frontend', 'cart-service', 'payment-gateway', 'order-events'],
    billing: ['billing-worker', 'invoice-api', 'ledger-sync', 'tax-calculator'],
    platform: PLATFORM,
    search: SEARCH,
  },
  'prod-eu-west': {
    search: SEARCH,
    platform: PLATFORM,
    notifications: ['notifications', 'email-sender', 'push-gateway', 'sms-relay'],
  },
  'staging-us-east': {
    auth: ['auth-service', 'session-store', 'token-issuer', 'oidc-proxy', 'mfa-service'],
    checkout: ['web-frontend', 'cart-service', 'payment-gateway', 'order-events'],
    platform: PLATFORM,
  },
}

type Health = 'progressing' | 'degraded' | 'paused'

/** Everything that is not available (38 are): 4 progressing, 2 degraded, 1 paused. */
const HEALTH: Record<string, { health: Health; ready: number }> = {
  'prod-us-east/checkout/web-frontend': { health: 'progressing', ready: 3 },
  'prod-eu-west/notifications/push-gateway': { health: 'progressing', ready: 2 },
  'staging-us-east/auth/token-issuer': { health: 'progressing', ready: 0 },
  'staging-us-east/checkout/cart-service': { health: 'progressing', ready: 1 },
  'prod-eu-west/search/search-indexer': { health: 'degraded', ready: 1 },
  'staging-us-east/checkout/payment-gateway': { health: 'degraded', ready: 0 },
  'prod-us-east/billing/billing-worker': { health: 'paused', ready: 2 },
}

/** Ages the mockups show; the rest come from the seed. */
const CREATED_DAYS: Record<string, number> = {
  'prod-us-east/checkout/checkout-api': 42,
  'prod-us-east/checkout/web-frontend': 42,
  'prod-eu-west/search/search-indexer': 9,
  'prod-us-east/billing/billing-worker': 120,
  'staging-us-east/auth/auth-service': 3,
  'prod-eu-west/notifications/notifications': 61,
}
const AGE_DAYS = [7, 14, 19, 27, 33, 56, 63, 88, 150, 201, 365, 410]

const CREATORS = ['Priya', 'Marcus', 'Lena', 'Tomás', 'Aiko']

/** Autoscalers on a few: min, max, target, current. */
const HPAS: Record<string, [number, number, string, string]> = {
  'prod-us-east/checkout/checkout-api': [3, 10, 'cpu 70%', 'cpu 42%'],
  'prod-us-east/checkout/web-frontend': [5, 12, 'cpu 60%', 'cpu 81%'],
  'prod-us-east/search/search-api': [2, 8, 'cpu 75%', 'cpu 38%'],
  'prod-eu-west/search/search-api': [2, 8, 'cpu 75%', 'cpu 51%'],
  'prod-eu-west/notifications/push-gateway': [2, 6, 'cpu 65%', 'cpu 88%'],
}

/** The RBAC roles bound to the service accounts that have any. */
const ROLES: Record<string, string[]> = {
  'checkout-api': ['checkout-api-reader', 'view'],
  'cert-manager': ['cert-manager-controller', 'cluster-issuers'],
  'ingress-gateway': ['ingress-nginx'],
  'otel-collector': ['view'],
  'search-indexer': ['search-indexer'],
}

// --- Deployments -------------------------------------------------------------------------------

const resources = (cpu: string, memory: string) => ({
  requests: { cpu, memory },
  limits: { memory: memory.replace(/\d+/, (n) => String(Number(n) * 2)) },
})

/** The containers and volumes of an app; three run sidecars, four reference config and storage. */
function podParts(
  id: string,
  name: string,
  seed: AppSeed,
): { containers: Container[]; volumes?: Volume[] } {
  const image = `${seed.image ?? `ghcr.io/acme/${name}`}:${seed.version}`
  const ports = seed.port ? [{ containerPort: seed.port, name: 'http' }] : undefined
  const acme = !seed.image
  const main: Container = {
    name: seed.tier === 'infra' ? name : seed.tier,
    image,
    ...(ports ? { ports } : {}),
    ...(acme ? { envFrom: [{ configMapRef: { name: `${name}-config` } }] } : {}),
    resources: resources(seed.tier === 'worker' ? '500m' : '250m', '256Mi'),
  }

  switch (id) {
    case 'prod-us-east/checkout/checkout-api':
      return {
        containers: [
          {
            name: 'api',
            image,
            ports,
            env: [
              { name: 'LOG_LEVEL', value: 'info' },
              {
                name: 'DATABASE_PASSWORD',
                valueFrom: { secretKeyRef: { name: 'checkout-api-secrets', key: 'db-password' } },
              },
              {
                name: 'STRIPE_API_KEY',
                valueFrom: { secretKeyRef: { name: 'checkout-api-secrets', key: 'stripe-key' } },
              },
            ],
            envFrom: [{ configMapRef: { name: 'checkout-api-config' } }],
            resources: resources('500m', '512Mi'),
            volumeMounts: [
              { name: 'tls', mountPath: '/etc/tls' },
              { name: 'cache', mountPath: '/var/cache/checkout' },
            ],
          },
        ],
        volumes: [
          { name: 'tls', secret: { secretName: 'tls-checkout' } },
          { name: 'cache', persistentVolumeClaim: { claimName: 'checkout-cache' } },
        ],
      }
    case 'prod-us-east/checkout/web-frontend':
      return {
        containers: [
          {
            ...main,
            env: [
              {
                name: 'SESSION_SECRET',
                valueFrom: { secretKeyRef: { name: 'web-frontend-secrets', key: 'session' } },
              },
            ],
          },
          {
            name: 'envoy',
            image: 'envoyproxy/envoy:v1.32.3',
            ports: [{ containerPort: 8443, name: 'https' }],
            resources: resources('100m', '128Mi'),
            volumeMounts: [
              { name: 'envoy-config', mountPath: '/etc/envoy' },
              { name: 'tls', mountPath: '/etc/tls' },
            ],
          },
        ],
        volumes: [
          { name: 'envoy-config', configMap: { name: 'web-frontend-envoy' } },
          { name: 'tls', secret: { secretName: 'tls-web' } },
        ],
      }
    case 'prod-eu-west/search/search-indexer':
      return {
        containers: [
          {
            name: 'indexer',
            image,
            envFrom: [
              { configMapRef: { name: 'search-indexer-config' } },
              { secretRef: { name: 'search-credentials' } },
            ],
            resources: resources('1', '2Gi'),
            volumeMounts: [{ name: 'index-data', mountPath: '/var/lib/index' }],
          },
          {
            name: 'log-forwarder',
            image: 'fluent/fluent-bit:3.2.4',
            resources: resources('50m', '64Mi'),
            volumeMounts: [{ name: 'fluent-bit-config', mountPath: '/fluent-bit/etc' }],
          },
        ],
        volumes: [
          { name: 'index-data', persistentVolumeClaim: { claimName: 'search-index-data' } },
          { name: 'fluent-bit-config', configMap: { name: 'search-indexer-fluent-bit' } },
        ],
      }
    case 'prod-eu-west/notifications/notifications':
      return {
        containers: [
          {
            ...main,
            env: [
              {
                name: 'SMTP_PASSWORD',
                valueFrom: { secretKeyRef: { name: 'notifications-smtp', key: 'password' } },
              },
              {
                name: 'PUSH_TOPIC',
                valueFrom: { configMapKeyRef: { name: 'notifications-routing', key: 'topic' } },
              },
            ],
          },
          {
            name: 'otel',
            image: 'otel/opentelemetry-collector-contrib:0.118.0',
            ports: [{ containerPort: 4317, name: 'otlp' }],
            resources: resources('100m', '128Mi'),
            volumeMounts: [{ name: 'otel-config', mountPath: '/etc/otelcol' }],
          },
        ],
        volumes: [{ name: 'otel-config', configMap: { name: 'notifications-otel' } }],
      }
  }

  if (seed.data) {
    return {
      containers: [{ ...main, volumeMounts: [{ name: 'data', mountPath: '/data' }] }],
      volumes: [{ name: 'data', persistentVolumeClaim: { claimName: `${name}-data` } }],
    }
  }
  return { containers: [main] }
}

/** The conditions a Deployment in `health` reports, the latest change at `at`. */
function conditionsFor(
  health: Health | 'available',
  rs: string,
  at: string,
): NonNullable<DeploymentResource['status']>['conditions'] {
  const available = availableCondition(at)
  switch (health) {
    case 'available':
      return [available, progressed(rs, at)]
    case 'progressing':
      return [available, progressingCondition(rs, at)]
    case 'paused':
      return [
        available,
        {
          type: 'Progressing',
          status: 'Unknown',
          reason: 'DeploymentPaused',
          message: 'Deployment is paused',
          lastTransitionTime: at,
        },
      ]
    case 'degraded':
      return [
        {
          type: 'Available',
          status: 'False',
          reason: 'MinimumReplicasUnavailable',
          message: 'Deployment does not have minimum availability.',
          lastTransitionTime: at,
        },
        {
          type: 'Progressing',
          status: 'False',
          reason: 'ProgressDeadlineExceeded',
          message: `ReplicaSet "${rs}" has timed out progressing.`,
          lastTransitionTime: at,
        },
      ]
  }
}

/** The Available condition of a Deployment with enough ready replicas. */
export function availableCondition(at: string) {
  return {
    type: 'Available' as const,
    status: 'True' as const,
    reason: 'MinimumReplicasAvailable',
    message: 'Deployment has minimum availability.',
    lastTransitionTime: at,
  }
}

/** The Progressing condition of a finished rollout. */
export function progressed(rs: string, at: string) {
  return {
    type: 'Progressing' as const,
    status: 'True' as const,
    reason: 'NewReplicaSetAvailable',
    message: `ReplicaSet "${rs}" has successfully progressed.`,
    lastTransitionTime: at,
  }
}

/** The Progressing condition of a rollout under way. */
export function progressingCondition(rs: string, at: string) {
  return {
    type: 'Progressing' as const,
    status: 'True' as const,
    reason: 'ReplicaSetUpdated',
    message: `ReplicaSet "${rs}" is progressing.`,
    lastTransitionTime: at,
  }
}

/** The pod-template-hash: what a ReplicaSet and its pods are named after; a new template, a new one. */
export function templateHash(resource: DeploymentResource): string {
  return suffix(JSON.stringify(resource.spec.template), 10)
}

/** The current ReplicaSet's name. */
export const replicaSetName = (resource: DeploymentResource) =>
  `${resource.metadata.name}-${templateHash(resource)}`

/** The ReplicaSet the current one replaced (scaled to zero, kept for a rollback). */
const previousReplicaSetName = (resource: DeploymentResource) =>
  `${resource.metadata.name}-${suffix(`previous:${replicaSetName(resource)}`, 10)}`

function generate(cluster: string, namespace: string, name: string): DeploymentResource {
  const id = `${cluster}/${namespace}/${name}`
  const seed = APPS[name]!
  const { health, ready } = HEALTH[id] ?? { health: 'available' as const, ready: undefined }
  const replicas = cluster === 'staging-us-east' ? Math.ceil(seed.replicas / 2) : seed.replicas
  const days = CREATED_DAYS[id] ?? pick(`${id}:age`, AGE_DAYS)
  const created = ago(days * DAY_MS + (hash(`${id}:minute`) % 600) * MINUTE_MS)
  // checkout-api finished its last rollout 4 minutes ago (the mockup); the others, hours to days
  // ago, never before they were created.
  const rolloutMs =
    id === 'prod-us-east/checkout/checkout-api'
      ? 4 * MINUTE_MS
      : health === 'progressing'
        ? (2 + (hash(`${id}:rollout`) % 6)) * MINUTE_MS
        : Math.min(days * DAY_MS, (1 + (hash(`${id}:rollout`) % 240)) * HOUR_MS)
  const rolledOut = ago(rolloutMs)
  const revision = 1 + (hash(`${id}:revision`) % 9)
  const partOf = namespace === 'platform' ? 'platform' : namespace
  const labels = { app: name, tier: seed.tier, 'app.kubernetes.io/part-of': partOf }
  const creator =
    id === 'prod-us-east/checkout/checkout-api'
      ? 'Priya'
      : hash(`${id}:creator`) % 2 === 0
        ? pick(`${id}:who`, CREATORS)
        : undefined
  const serviceAccountName =
    seed.tier === 'api' || seed.tier === 'infra' || ROLES[name] ? name : undefined
  const nodeSelector =
    seed.tier === 'infra'
      ? { pool: 'system' }
      : cluster.startsWith('prod') && seed.tier === 'api'
        ? { pool: 'general' }
        : undefined

  const resource: DeploymentResource = {
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    metadata: {
      name,
      namespace,
      uid: uidFor(id),
      resourceVersion: String(40_000 + (hash(`${id}:rv`) % 60_000)),
      generation: revision,
      creationTimestamp: created,
      labels,
      annotations: {
        'deployment.kubernetes.io/revision': String(revision),
        ...(creator ? { [CREATED_BY_ANNOTATION]: creator } : {}),
      },
    },
    spec: {
      replicas,
      ...(health === 'paused' ? { paused: true } : {}),
      selector: { matchLabels: { app: name } },
      strategy:
        seed.data !== undefined
          ? { type: 'Recreate' }
          : { type: 'RollingUpdate', rollingUpdate: { maxSurge: '25%', maxUnavailable: '25%' } },
      revisionHistoryLimit: 10,
      progressDeadlineSeconds: 600,
      template: {
        metadata: { labels: { app: name, tier: seed.tier } },
        spec: {
          ...(serviceAccountName ? { serviceAccountName } : {}),
          ...(nodeSelector ? { nodeSelector } : {}),
          ...podParts(id, name, seed),
        },
      },
    },
  }

  const readyCount = ready ?? replicas
  const updated = health === 'progressing' ? readyCount : replicas
  resource.status = {
    replicas,
    updatedReplicas: updated,
    readyReplicas: readyCount,
    availableReplicas: readyCount,
    observedGeneration: revision,
    conditions: conditionsFor(health, replicaSetName(resource), rolledOut),
  }
  return resource
}

/** A uid-shaped id derived from `seed`. */
export function uidFor(seed: string): string {
  const hex = (part: string, length: number) =>
    hash(`${seed}:${part}`).toString(16).padStart(8, '0').slice(0, length)
  return `${hex('a', 8)}-${hex('b', 4)}-4${hex('c', 3)}-a${hex('d', 3)}-${hex('e', 8)}${hex('f', 4)}`
}

/** The 45 Deployments, with the cluster each runs in. */
export const deployments: { cluster: string; resource: DeploymentResource }[] = Object.entries(
  PLACEMENT,
).flatMap(([cluster, namespaces]) =>
  Object.entries(namespaces).flatMap(([namespace, names]) =>
    names.map((name) => ({ cluster, resource: generate(cluster, namespace, name) })),
  ),
)

// --- Related objects ---------------------------------------------------------------------------

/** The time of the Deployment's current rollout: its Progressing condition's last change. */
function rolloutTime(resource: DeploymentResource): string {
  const progressing = resource.status?.conditions?.find((c) => c.type === 'Progressing')
  return progressing?.lastTransitionTime ?? resource.metadata.creationTimestamp ?? now
}

const NODES = 12

/** The `index`th pod of ReplicaSet `rs`, and the node it runs on. */
const podName = (rs: string, index: number) => `${rs}-${suffix(`${rs}/${index}`, 5)}`
const nodeOf = (pod: string) => `node-${1 + (hash(pod) % NODES)}`

/** The pods of the current ReplicaSet: `{name}-{hash}-{5 chars}`, one per replica. */
function podsFor(resource: DeploymentResource): PodRef[] {
  const status = resource.status ?? {}
  const replicas = status.replicas ?? resource.spec.replicas ?? 1
  const ready = Math.min(status.readyReplicas ?? 0, replicas)
  const rs = replicaSetName(resource)
  const degraded = isDegraded(resource)
  const started = rolloutTime(resource)
  return Array.from({ length: replicas }, (_, index) => {
    const name = podName(rs, index)
    const node = nodeOf(name)
    if (index < ready) {
      return { name, phase: 'Running', ready: true, restarts: 0, node, createdAt: started }
    }
    // Not ready: crash-looping on a degraded Deployment, still starting on the others.
    return degraded
      ? {
          name,
          phase: 'Running',
          ready: false,
          restarts: 6 + (hash(name) % 9),
          node,
          createdAt: started,
        }
      : { name, phase: 'Pending', ready: false, restarts: 0, createdAt: ago(MINUTE_MS) }
  })
}

/** How many keys a ConfigMap or Secret holds (1–8). */
const keysOf = (name: string) => 1 + (hash(`keys:${name}`) % 8)

/**
 * The objects around a Deployment, derived the way a console would find them: its ReplicaSets
 * (current and one old) and their pods; the Service whose selector matches the pod labels (when a
 * container has a port) and an Ingress for web and `-api` apps (`{part-of}.{cluster domain}`); the
 * ConfigMaps and Secrets its containers read through env, envFrom and volumes; the PVCs it mounts;
 * an autoscaler for a few; and its service account.
 */
export function relatedFor(resource: DeploymentResource, cluster: string): RelatedObjects {
  const { name, namespace, labels = {} } = resource.metadata
  const podSpec = resource.spec.template.spec
  const replicas = resource.spec.replicas ?? 1
  const rs = replicaSetName(resource)
  const id = `${cluster}/${namespace}/${name}`

  const ports = podSpec.containers.flatMap((c) => c.ports ?? [])
  const services: RelatedObjects['services'] =
    ports.length > 0
      ? [
          {
            name,
            type: name === 'ingress-gateway' ? 'LoadBalancer' : 'ClusterIP',
            clusterIP: `10.96.${hash(`${id}:ip3`) % 256}.${1 + (hash(`${id}:ip4`) % 254)}`,
            ports: ports.map((p) => `${p.containerPort}/TCP`),
          },
        ]
      : []

  const tier = labels.tier
  const partOf = labels['app.kubernetes.io/part-of'] ?? name
  const ingresses: RelatedObjects['ingresses'] =
    services.length > 0 && (tier === 'web' || name.endsWith('-api'))
      ? [
          {
            name: partOf,
            host: `${partOf}.${DOMAINS[cluster] ?? 'acme.dev'}`,
            path: tier === 'web' ? '/' : '/api',
            service: name,
          },
        ]
      : []

  // ConfigMaps and Secrets by name, with every way the pod reads them.
  type Use = 'env' | 'envFrom' | 'volume'
  const configMaps = new Map<string, Set<Use>>()
  const secrets = new Map<string, Set<Use>>()
  const note = (map: Map<string, Set<Use>>, ref: string, how: Use) =>
    map.set(ref, (map.get(ref) ?? new Set<Use>()).add(how))
  for (const container of podSpec.containers) {
    for (const env of container.env ?? []) {
      if (env.valueFrom?.configMapKeyRef)
        note(configMaps, env.valueFrom.configMapKeyRef.name, 'env')
      if (env.valueFrom?.secretKeyRef) note(secrets, env.valueFrom.secretKeyRef.name, 'env')
    }
    for (const from of container.envFrom ?? []) {
      if (from.configMapRef) note(configMaps, from.configMapRef.name, 'envFrom')
      if (from.secretRef) note(secrets, from.secretRef.name, 'envFrom')
    }
  }
  const pvcs: RelatedObjects['pvcs'] = []
  for (const volume of podSpec.volumes ?? []) {
    if (volume.configMap) note(configMaps, volume.configMap.name, 'volume')
    if (volume.secret) note(secrets, volume.secret.secretName, 'volume')
    if (volume.persistentVolumeClaim) {
      const claim = volume.persistentVolumeClaim.claimName
      pvcs.push({
        name: claim,
        status: 'Bound',
        capacity: claim === 'checkout-cache' ? '20Gi' : (APPS[name]?.data ?? '50Gi'),
        storageClass: cluster.startsWith('prod') ? 'gp3' : 'standard',
      })
    }
  }
  const refs = (map: Map<string, Set<Use>>) =>
    [...map].map(([ref, uses]) => ({ name: ref, usedAs: [...uses], keys: keysOf(ref) }))

  const hpa = HPAS[id]
  const account = podSpec.serviceAccountName ?? 'default'

  return {
    pods: podsFor(resource),
    replicaSets: [
      {
        name: rs,
        desired: replicas,
        ready: resource.status?.readyReplicas ?? 0,
        createdAt: rolloutTime(resource),
        current: true,
      },
      {
        name: previousReplicaSetName(resource),
        desired: 0,
        ready: 0,
        createdAt: resource.metadata.creationTimestamp ?? now,
        current: false,
      },
    ],
    services,
    ingresses,
    configMaps: refs(configMaps),
    secrets: refs(secrets),
    pvcs,
    ...(hpa
      ? {
          hpa: {
            name: `${name}-hpa`,
            min: hpa[0],
            max: hpa[1],
            target: hpa[2],
            current: hpa[3],
          },
        }
      : {}),
    serviceAccount: {
      name: account,
      secrets: account === 'default' ? 0 : 1,
      roles: ROLES[name] ?? [],
    },
  }
}

// --- Events ------------------------------------------------------------------------------------

/** An event without what the stream stamps on it (its id and times). */
export type EventTemplate = Omit<K8sEvent, 'id' | 'firstSeen' | 'lastSeen'>

/** The names an event can mention: the current and an old ReplicaSet, three pods, a node. */
function eventNames(resource: DeploymentResource) {
  const { name } = resource.metadata
  const rs = replicaSetName(resource)
  const pods = [podName(rs, 0), podName(rs, 1), podName(rs, 2)] as const
  const container = resource.spec.template.spec.containers[0]
  return {
    name,
    rs,
    oldRs: previousReplicaSetName(resource),
    pods,
    container: container?.name ?? name,
    image: container?.image ?? name,
    node: nodeOf(pods[0]),
  }
}

const PROBE_FAILED = 'Readiness probe failed: HTTP probe failed with statuscode: 503'
const NO_CPU = '0/12 nodes are available: 12 Insufficient cpu.'

type Kind = 'Deployment' | 'ReplicaSet' | 'Pod'

/** An event on `kind`/`name`, reported by `source`. */
function event(
  type: K8sEvent['type'],
  reason: string,
  message: string,
  [kind, name]: [Kind, string],
  source = 'kubelet',
): EventTemplate {
  return { type, reason, message, involvedObject: { kind, name }, count: 1, source }
}

const isDegraded = (resource: DeploymentResource) =>
  resource.status?.conditions?.some((c) => c.type === 'Available' && c.status === 'False') ?? false

/**
 * 8–14 events for a Deployment and its children, newest first: the last rollout's scaling, pod
 * creation and start, two warnings (a failed readiness probe, an unschedulable pod), and on a
 * degraded Deployment the crash loop.
 */
export function eventsFor(resource: DeploymentResource): K8sEvent[] {
  const n = eventNames(resource)
  const replicas = resource.spec.replicas ?? 1
  const { namespace } = resource.metadata
  const id = `${namespace}/${n.name}`
  const deployment: [Kind, string] = ['Deployment', n.name]
  const rs: [Kind, string] = ['ReplicaSet', n.rs]
  const oldRs: [Kind, string] = ['ReplicaSet', n.oldRs]
  const pod = (index: 0 | 1 | 2): [Kind, string] => ['Pod', n.pods[index]]
  const controller = 'deployment-controller'
  const replicaSets = 'replicaset-controller'
  const scheduler = 'default-scheduler'
  const scaled = `Scaled up replica set ${n.rs} to ${replicas} from ${Math.max(0, replicas - 1)}`
  const oldPod = `${n.oldRs}-${suffix(n.oldRs, 5)}`

  // [minutes ago, how many times it happened, the event]
  const pool: [number, number, EventTemplate][] = [
    [4, 1, event('Normal', 'ScalingReplicaSet', scaled, deployment, controller)],
    [4, 1, event('Normal', 'SuccessfulCreate', `Created pod: ${n.pods[0]}`, rs, replicaSets)],
    [6, 3, event('Warning', 'Unhealthy', PROBE_FAILED, pod(1))],
    [
      6,
      1,
      event('Normal', 'Pulled', `Container image "${n.image}" already present on machine`, pod(1)),
    ],
    [9, 2, event('Warning', 'FailedScheduling', NO_CPU, pod(2), scheduler)],
    [12, 1, event('Normal', 'Started', `Started container ${n.container}`, pod(0))],
    [12, 1, event('Normal', 'Created', `Created container ${n.container}`, pod(0))],
    [
      13,
      1,
      event(
        'Normal',
        'Scheduled',
        `Successfully assigned ${namespace}/${n.pods[0]} to ${n.node}`,
        pod(0),
        scheduler,
      ),
    ],
    [
      14,
      1,
      event(
        'Normal',
        'ScalingReplicaSet',
        `Scaled down replica set ${n.oldRs} to 0 from 1`,
        deployment,
        controller,
      ),
    ],
    [14, 1, event('Normal', 'SuccessfulDelete', `Deleted pod: ${oldPod}`, oldRs, replicaSets)],
    [18, 1, event('Normal', 'Pulling', `Pulling image "${n.image}"`, pod(2))],
    [20, 1, event('Normal', 'SuccessfulCreate', `Created pod: ${n.pods[2]}`, rs, replicaSets)],
    [
      22,
      1,
      event(
        'Normal',
        'ScalingReplicaSet',
        `Scaled up replica set ${n.rs} to 1`,
        deployment,
        controller,
      ),
    ],
    [22, 1, event('Normal', 'SuccessfulCreate', `Created pod: ${n.pods[1]}`, rs, replicaSets)],
  ]
  if (isDegraded(resource)) {
    const backOff = `Back-off restarting failed container ${n.container} in pod ${n.pods[1]}`
    const timedOut = `ReplicaSet "${n.rs}" has timed out progressing.`
    pool.unshift(
      [1, 14, event('Warning', 'BackOff', backOff, pod(1))],
      [3, 1, event('Warning', 'ProgressDeadlineExceeded', timedOut, deployment, controller)],
    )
  }

  // checkout-api has all 14 (the mockup); the others 8–14, the newest first.
  const length = n.name === 'checkout-api' ? 14 : 8 + (hash(`${id}:events`) % 7)
  return pool.slice(0, length).map(([minutes, count, template], index) => ({
    ...template,
    id: `${id}#${index}`,
    count,
    firstSeen: ago((minutes + (count > 1 ? 30 : 0)) * MINUTE_MS),
    lastSeen: ago(minutes * MINUTE_MS),
  }))
}

/**
 * What the live stream adds next, in turn (six): a pod's image pulled, its container created and
 * started, a failed readiness probe, a new pod and the ReplicaSet's count. An event that is already
 * listed counts once more instead of adding a row.
 */
export function eventRotation(resource: DeploymentResource): EventTemplate[] {
  const n = eventNames(resource)
  const pod: [Kind, string] = ['Pod', n.pods[2]]
  const replicas = resource.spec.replicas ?? 1
  return [
    event('Normal', 'Pulled', `Container image "${n.image}" already present on machine`, pod),
    event('Normal', 'Created', `Created container ${n.container}`, pod),
    event('Normal', 'Started', `Started container ${n.container}`, pod),
    event('Warning', 'Unhealthy', PROBE_FAILED, ['Pod', n.pods[1]]),
    event(
      'Normal',
      'SuccessfulCreate',
      `Created pod: ${n.pods[2]}`,
      ['ReplicaSet', n.rs],
      'replicaset-controller',
    ),
    event(
      'Normal',
      'ScalingReplicaSet',
      `Scaled up replica set ${n.rs} to ${replicas}`,
      ['Deployment', n.name],
      'deployment-controller',
    ),
  ]
}

// --- Create ------------------------------------------------------------------------------------

/** The YAML `/deployments/new` starts from; the namespace follows the picker. */
export const starterTemplate = `apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  namespace: checkout
  labels:
    app: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: my-app
          image: ghcr.io/acme/my-app:1.0.0
          ports:
            - containerPort: 8080
`

/** The `metadata.namespace` a YAML document names, read from its lines (it may not parse). */
export function namespaceOf(text: string): string | undefined {
  const metadata = metadataLines(text)
  if (!metadata) return undefined
  for (const line of metadata.lines) {
    const match = /^ {2}namespace:\s*["']?([^"'\s#]+)["']?\s*(#.*)?$/.exec(line)
    if (match) return match[1]
  }
  return undefined
}

/** `text` with `metadata.namespace` set to `namespace`, keeping every other line as typed. */
export function withNamespace(text: string, namespace: string): string {
  const lines = text.split('\n')
  const metadata = metadataLines(text)
  if (!metadata) return text
  const index = metadata.lines.findIndex((line) => /^ {2}namespace:/.test(line))
  if (index >= 0) {
    lines[metadata.start + index] = `  namespace: ${namespace}`
  } else {
    lines.splice(metadata.start, 0, `  namespace: ${namespace}`)
  }
  return lines.join('\n')
}

/** The lines under the top-level `metadata:` key, and the index of the first of them. */
function metadataLines(text: string): { start: number; lines: string[] } | undefined {
  const lines = text.split('\n')
  const at = lines.findIndex((line) => /^metadata:\s*(#.*)?$/.test(line))
  if (at < 0) return undefined
  const start = at + 1
  let end = start
  while (end < lines.length && (lines[end]!.startsWith(' ') || lines[end]!.trim() === '')) end++
  return { start, lines: lines.slice(start, end) }
}
