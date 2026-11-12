import type {
  ForumBlock,
  ForumCategory,
  ForumChromeProps,
  ForumPost,
  ForumTopic,
  ForumUser,
} from './types'

export const TEST_NOW = '2026-11-12T15:00:00Z'

export const priya: ForumUser = {
  id: 'priya',
  name: 'Priya Raman',
  role: 'staff',
  joinedAt: '2025-11-01T00:00:00Z',
  postCount: 1430,
}
export const jonas: ForumUser = {
  id: 'jonas',
  name: 'Jonas Lindqvist',
  joinedAt: '2026-03-01T00:00:00Z',
  postCount: 48,
  reputation: 48,
}
export const dan: ForumUser = {
  id: 'dan',
  name: 'Dan Okafor',
  joinedAt: '2026-01-01T00:00:00Z',
  postCount: 212,
}
export const mei: ForumUser = {
  id: 'mei',
  name: 'Mei Tanaka',
  joinedAt: '2026-02-01T00:00:00Z',
  postCount: 96,
}
export const tomas: ForumUser = {
  id: 'tomas',
  name: 'Tomas Berg',
  joinedAt: '2026-03-01T00:00:00Z',
  postCount: 71,
}
export const testUsers: ForumUser[] = [priya, jonas, dan, mei, tomas]

export const testCategories: ForumCategory[] = [
  {
    id: 'announcements',
    label: 'Announcements',
    description: 'Releases, maintenance windows and policy changes.',
    section: 'Product',
    topicCount: 32,
    postCount: 118,
    solvedCount: 20,
  },
  {
    id: 'kemo-console',
    label: 'Kemo Console',
    description: 'The web console: dashboards, Access, Deployments and the rest.',
    section: 'Product',
    topicCount: 486,
    postCount: 3902,
    solvedCount: 477,
  },
  {
    id: 'deployments-gitops',
    label: 'Deployments & GitOps',
    description: 'Rollouts, scaling, YAML and the pipelines around them.',
    section: 'Product',
    topicCount: 311,
    postCount: 2140,
    solvedCount: 274,
  },
  {
    id: 'access-sso',
    label: 'Access & SSO',
    description: 'OIDC providers, groups, roles and permissions.',
    section: 'Product',
    topicCount: 158,
    postCount: 1034,
    solvedCount: 150,
  },
  {
    id: 'getting-started',
    label: 'Getting started',
    description: 'First install, first cluster, first questions.',
    section: 'Community',
    topicCount: 97,
    postCount: 612,
    solvedCount: 94,
  },
  {
    id: 'show-and-tell',
    label: 'Show and tell',
    description: 'Things you built on or around Kemo.',
    section: 'Community',
    topicCount: 41,
    postCount: 388,
    solvedCount: 30,
  },
  {
    id: 'feature-requests',
    label: 'Feature requests',
    description: 'What should the console do next? Vote on ideas.',
    section: 'Community',
    topicCount: 88,
    postCount: 704,
    solvedCount: 70,
  },
  {
    id: 'bug-reports',
    label: 'Bug reports',
    description: 'Something broke? Include the version and a request id.',
    section: 'Community',
    topicCount: 35,
    postCount: 412,
    solvedCount: 31,
  },
]

const para = (content: string): ForumBlock => ({ type: 'paragraph', content })

// Minutes, hours and days before TEST_NOW, as ISO strings.
const ago = (minutes: number): string =>
  new Date(Date.parse(TEST_NOW) - minutes * 60_000).toISOString()
const hours = (n: number) => ago(n * 60)
const days = (n: number) => ago(n * 24 * 60)

const posts: ForumPost[] = [
  {
    id: 'p1',
    author: jonas,
    postedAt: ago(14),
    body: [
      para(
        'After upgrading to 4.2 the YAML tab lints fine, but the Schema panel is empty for our Gateway API objects. Deployments show the full tree. I registered the schema the way the docs say:',
      ),
      {
        type: 'code',
        language: 'ts',
        code: "registry.register({ group: 'gateway.networking.k8s.io', kind: 'HTTPRoute', schema })",
      },
      para('Is there something else the browser needs, like a version in the key?'),
    ],
    reactions: [
      { emoji: '👍', count: 4 },
      { emoji: '👀', count: 2 },
    ],
  },
  {
    id: 'p2',
    author: dan,
    postedAt: ago(11),
    body: [
      para(
        'Which exact version, 4.2.0 or 4.2.1? And does the panel show anything for a plain Deployment on the same cluster?',
      ),
    ],
  },
  {
    id: 'p3',
    author: jonas,
    postedAt: ago(9),
    parentId: 'p2',
    quote: { author: dan, excerpt: 'Which exact version, 4.2.0 or 4.2.1?' },
    body: [
      para(
        '4.2.1. Deployments are fine, it is only the CRD kinds. The lint still works for them, so the schema is loaded somewhere.',
      ),
    ],
  },
  {
    id: 'p4',
    author: priya,
    postedAt: ago(6),
    accepted: true,
    body: [
      para(
        'Since 4.2 the browser resolves the schema by apiVersion and kind together, so the key needs the version as well. Register it as:',
      ),
      {
        type: 'code',
        language: 'ts',
        code: "registry.register({ apiVersion: 'gateway.networking.k8s.io/v1', kind: 'HTTPRoute', schema })",
      },
      para(
        'The linter still matches by kind alone, which is why it kept working. We are adding a warning for the old shape in 4.2.2.',
      ),
    ],
    reactions: [
      { emoji: '👍', count: 18, reacted: true },
      { emoji: '🎉', count: 3 },
    ],
    votes: { score: 18 },
  },
  {
    id: 'p5',
    author: jonas,
    postedAt: ago(5),
    parentId: 'p4',
    body: [para('That was it. The panel fills in as soon as the version is on the key. Thanks!')],
  },
  {
    id: 'p6',
    author: mei,
    postedAt: ago(3),
    parentId: 'p4',
    body: [
      para(
        'Worth noting that defaultSchemaRegistry already keys Deployments by version, which is why those never broke.',
      ),
    ],
    votes: { score: 3 },
  },
  {
    id: 'p7',
    author: tomas,
    postedAt: ago(2.5),
    body: [para('Same symptom here with Argo Rollouts CRDs. Following.')],
  },
  ...(
    [
      [dan, 'Does the warning in 4.2.2 cover custom registries too?'],
      [priya, 'Yes, any register call without an apiVersion will warn.'],
      [mei, 'Good to know, I will update our wrapper.'],
      [tomas, 'Updated the Rollouts registration, the panel works now.'],
      [jonas, 'Marking this solved. Thanks everyone.'],
      [dan, 'Could the docs example show the apiVersion form?'],
    ] as const
  ).map(([author, text], i): ForumPost => ({
    id: `p${8 + i}`,
    author,
    postedAt: ago(2 - i * 0.25),
    body: [para(text)],
  })),
]

const listTopic = (
  slug: string,
  title: string,
  author: ForumUser,
  lastActivityAt: string,
  over: Partial<ForumTopic> = {},
): ForumTopic => ({
  id: slug,
  slug,
  title,
  excerpt: `${title} Details, versions and what has been tried so far.`,
  categoryId: 'kemo-console',
  author,
  createdAt: lastActivityAt,
  lastActivityAt,
  replyCount: 4,
  viewCount: 320,
  tags: ['dashboard'],
  ...over,
})

export const sampleThread: ForumTopic = {
  id: 'schema-browser-crd',
  slug: 'schema-browser-crd',
  title: 'Schema browser shows no CRD fields after 4.2',
  excerpt:
    'After upgrading, the YAML tab lints fine but the Schema panel is empty for our Gateway API objects.',
  categoryId: 'kemo-console',
  author: jonas,
  createdAt: ago(14),
  lastActivityAt: ago(1),
  replyCount: 12,
  viewCount: 1234,
  votes: { score: 18 },
  tags: ['yaml-editor', 'crd', '4.2'],
  posts,
}

export const testTopics: ForumTopic[] = [
  sampleThread,
  listTopic('console-read-first', 'Read this before posting in Kemo Console', priya, days(30), {
    pinned: true,
    kind: 'announcement',
    replyCount: 2,
    viewCount: 5400,
    tags: [],
  }),
  listTopic(
    'forum-guidelines',
    'Forum guidelines and how to ask a question that gets answered',
    priya,
    days(9),
    {
      categoryId: 'announcements',
      kind: 'announcement',
      pinned: true,
      replyCount: 4,
      viewCount: 8200,
      tags: [],
    },
  ),
  listTopic('minimum-rbac', 'Minimum RBAC for a read-only console account?', dan, hours(5), {
    categoryId: 'getting-started',
    replyCount: 0,
    tags: ['rbac'],
  }),
  listTopic('events-tab-stale', 'Events tab stops updating after a laptop sleep', mei, hours(2), {
    status: 'needs-info',
    replyCount: 3,
    tags: ['events'],
  }),
  listTopic(
    'dashboard-slow-load',
    'Dashboard takes eight seconds to load on a large cluster',
    tomas,
    hours(8),
    {
      replyCount: 6,
      viewCount: 910,
    },
  ),
  listTopic('log-viewer-wrap', 'Can the log viewer wrap long lines?', dan, days(1), {
    replyCount: 0,
    tags: ['logs'],
  }),
  listTopic(
    'pod-shell-timeout',
    'Pod shell closes after sixty seconds of silence',
    jonas,
    days(3),
    {
      replyCount: 7,
      tags: ['shell'],
    },
  ),
  listTopic('namespace-picker', 'Namespace picker forgets the last selection', mei, days(5), {
    replyCount: 2,
  }),
  listTopic('node-metrics-gap', 'Node metrics show a gap every night at 02:00', tomas, days(9), {
    replyCount: 11,
    viewCount: 2100,
    tags: ['metrics'],
  }),
  listTopic('saved-views', 'Are saved views shared across the team?', priya, days(14), {
    replyCount: 5,
  }),
  listTopic('dark-theme-contrast', 'Contrast of muted text in the dark theme', jonas, days(21), {
    replyCount: 0,
    tags: ['theme'],
  }),
  listTopic('export-yaml', 'Export a resource as YAML with managed fields removed', dan, days(40), {
    replyCount: 9,
    viewCount: 1500,
    tags: ['yaml-editor'],
  }),
  listTopic('keyboard-shortcuts', 'Keyboard shortcuts for switching clusters', mei, days(58), {
    replyCount: 0,
  }),
]

export const chrome: Omit<ForumChromeProps, 'variant'> = {
  brand: 'Kemo',
  now: TEST_NOW,
  indexHref: '/forum/boards',
  signInHref: '/login',
  categoryHref: (c) => `/forum/boards/c/${c.id}`,
  topicHref: (t) => `/forum/boards/t/${t.slug}`,
  composerHref: (c) => (c ? `/forum/boards/new?category=${c.id}` : '/forum/boards/new'),
  searchHref: (q) => `/forum/boards?q=${encodeURIComponent(q)}`,
}
