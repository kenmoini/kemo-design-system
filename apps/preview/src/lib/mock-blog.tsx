import type { ReactNode } from 'react'
import {
  type BlogAuthor,
  type BlogBlock,
  type BlogComment,
  type BlogPost,
  type BlogTopic,
  type BlogVariant,
  Code,
  Link,
} from '@kemo/ui'

// Static posts, comments and mock behaviour for the preview's blog pages (`/blog/*`). Nothing here
// talks to a server. An address or comment containing "fail" is rejected, like the auth pages.

export const FEATURED_SLUG = 'cold-start-62'

export const blogTitles: Record<BlogVariant, { title: string; description: string }> = {
  'editorial-list': {
    title: 'Notes from the platform team',
    description:
      'Engineering write-ups, release notes and the occasional post-incident review from the people who run Kemo Console.',
  },
  'magazine-grid': {
    title: 'Notes from the platform team',
    description:
      'Engineering write-ups, release notes and the occasional post-incident review from the people who run Kemo Console.',
  },
  'journal-rail': {
    title: 'Platform journal',
    description:
      'Engineering write-ups, release notes and the occasional post-incident review from the people who run Kemo Console.',
  },
}

const engineering: BlogTopic = { id: 'engineering', label: 'Engineering' }
const releases: BlogTopic = { id: 'releases', label: 'Releases' }
const incidents: BlogTopic = { id: 'incidents', label: 'Incidents' }
const design: BlogTopic = { id: 'design', label: 'Design' }

const priya: BlogAuthor = {
  id: 'priya',
  name: 'Priya Raman',
  role: 'Staff engineer, Console platform',
}
const dan: BlogAuthor = { id: 'dan', name: 'Dan Okafor', role: 'Product engineer' }
const mei: BlogAuthor = { id: 'mei', name: 'Mei Tanaka', role: 'Site reliability engineer' }
const ana: BlogAuthor = { id: 'ana', name: 'Ana Souza', role: 'Product designer' }

const p = (content: ReactNode): BlogBlock => ({
  type: 'paragraph',
  content,
})
const h2 = (text: string): BlogBlock => ({ type: 'heading', level: 2, text })
const h3 = (text: string): BlogBlock => ({ type: 'heading', level: 3, text })

const coldStartBody: BlogBlock[] = [
  p(
    'Opening a cluster in Kemo Console used to take a little over four seconds on a cold cache. For a page people open forty times a day, that is a long time to look at a skeleton.',
  ),
  h2('Where the time went'),
  p(
    <>
      We traced a thousand cold loads. The surprise was not the bundle, it was{' '}
      <Code>/api/resources</Code>: one request per resource kind, in sequence.
    </>,
  ),
  {
    type: 'code',
    language: 'python',
    code: [
      '# before: 38 sequential discovery calls',
      'for kind in kinds: client.list(kind, limit=1)',
      '# after: one aggregated discovery document, cached per cluster',
      'doc = discovery.aggregated(cluster, ttl="10m")',
    ].join('\n'),
  },
  {
    type: 'quote',
    content: 'The fastest request is the one the browser already has the answer to.',
  },
  h2('One discovery document'),
  p(
    'Kubernetes can describe every API group and resource kind in a single response. We fetch that document once per cluster, keep it in memory and hand it to every widget that needs to know what a cluster can do.',
  ),
  h3('Cache invalidation'),
  p(
    'The document is cached for ten minutes, but the time limit is only the fallback. We watch CustomResourceDefinitions and drop a cluster’s entry whenever one is added or removed, so a freshly installed operator shows up straight away.',
  ),
  h3('Older clusters'),
  {
    type: 'callout',
    label: 'Note',
    content:
      'Aggregated discovery needs Kubernetes 1.30 or newer. Older clusters fall back to the batched path.',
  },
  h2('Results'),
  p(
    'Measured on our largest customer cluster, from navigation start to the first interactive table:',
  ),
  {
    type: 'stats',
    items: [
      { value: '4.1s → 1.6s', label: 'p50 cold start' },
      { value: '38 → 1', label: 'discovery requests' },
      { value: '−62%', label: 'time to interactive' },
    ],
  },
  h2('What we would do differently'),
  {
    type: 'list',
    items: [
      'Measure before caching: the N+1 was visible in the first trace we took.',
      <>
        Put a budget on <Code>time to interactive</Code> in CI, so a regression fails a build
        instead of a customer.
      </>,
      <>
        Read the{' '}
        <Link href="https://kubernetes.io/docs/concepts/overview/kubernetes-api/">
          API overview
        </Link>{' '}
        before writing a client.
      </>,
    ],
  },
  p('The caching layer now ships in every 4.x release, and the numbers have held since.'),
]

const rest = (
  slug: string,
  title: string,
  summary: string,
  topic: BlogTopic,
  author: BlogAuthor,
  publishedAt: string,
  readingMinutes: number,
  cover: BlogPost['cover'],
  body: BlogBlock[],
): BlogPost => ({
  slug,
  title,
  summary,
  topic,
  author,
  publishedAt: `${publishedAt}T09:00:00Z`,
  readingMinutes,
  cover,
  body,
})

export const blogPosts: BlogPost[] = [
  {
    slug: FEATURED_SLUG,
    title: 'How we cut cold-start time for cluster consoles by 62%',
    summary:
      'A year of profiling, one embarrassing N+1 against the API server, and the caching layer we should have built first.',
    topic: engineering,
    author: priya,
    publishedAt: '2026-11-11T09:00:00Z',
    readingMinutes: 9,
    featured: true,
    cover: { preset: 1 },
    tags: ['performance', 'kubernetes', 'caching'],
    body: coldStartBody,
  },
  rest(
    'console-4-2',
    'Console 4.2: schema-aware YAML editing',
    'Lint, hover docs and completion for every resource kind your cluster knows about.',
    releases,
    dan,
    '2026-11-04',
    4,
    { preset: 2 },
    [
      p('The YAML editor now knows the shape of every resource in the cluster you are looking at.'),
      h2('What is new'),
      {
        type: 'list',
        items: [
          'Lint as you type, with the field path and the expected type in the message.',
          'Hover documentation taken from the cluster’s own schema, including custom resources.',
          'Completion for field names and enum values.',
        ],
      },
      h2('How it works'),
      p(
        <>
          The editor loads the OpenAPI schema for the kind you are editing and validates against it
          in a worker, so typing never waits on a request. Custom resources use the{' '}
          <Code>openAPIV3Schema</Code> from their definition.
        </>,
      ),
      {
        type: 'callout',
        label: 'Note',
        content: 'Resources without a published schema still open as plain YAML.',
      },
      p('Update to 4.2 from the Settings page, or pull the new image tag.'),
    ],
  ),
  rest(
    'ingress-outage-review',
    'Post-incident review: the 19 October ingress outage',
    'What failed, how we found it, and the three changes we have already shipped.',
    incidents,
    mei,
    '2026-10-28',
    12,
    { preset: 5 },
    [
      p(
        'On 19 October the ingress layer in two regions stopped routing traffic for 47 minutes. This review covers what happened, what we got wrong and what we have changed.',
      ),
      h2('Timeline'),
      {
        type: 'list',
        ordered: true,
        items: [
          '14:02 UTC: a certificate rotation job starts in both regions at once.',
          '14:05 UTC: error rate passes 40% and the first page goes out.',
          '14:31 UTC: the rotation is identified as the cause and halted.',
          '14:49 UTC: traffic is fully restored.',
        ],
      },
      h2('Root cause'),
      p(
        'The rotation job reloaded every ingress controller in a region together. A malformed certificate bundle made the reload fail, and with no controller left serving, there was nothing to roll back to.',
      ),
      {
        type: 'quote',
        content:
          'We had a rollback plan for the change. We did not have one for the tool making it.',
      },
      h2('What we changed'),
      {
        type: 'list',
        items: [
          'Rotations now roll through controllers one at a time and stop on the first failed health check.',
          'Certificate bundles are validated before they are written.',
          'The two regions rotate on different days.',
        ],
      },
    ],
  ),
  rest(
    'status-pages-at-3am',
    'Designing status pages people can read at 3am',
    'Why our error pages lost the illustrations and gained a request id.',
    design,
    ana,
    '2026-10-15',
    6,
    undefined,
    [
      p(
        'Nobody reads an error page calmly. They read it tired, worried and with a customer waiting.',
      ),
      h2('Say what happened, then what to do'),
      p(
        'Every status page now opens with one plain sentence about what went wrong and one action. The illustration that used to sit above them is gone; it pushed the useful part below the fold on a phone.',
      ),
      h2('Give support something to work with'),
      p(
        <>
          Each page carries a request id in monospace, easy to select and copy. Support can find the
          failing request from <Code>req_7f3a91</Code> in seconds instead of asking for screenshots.
        </>,
      ),
      {
        type: 'callout',
        tone: 'warning',
        label: 'Warning',
        content: 'Never show a stack trace on a status page. The request id is enough.',
      },
      p('Contrast was the last pass: the pages sit on the dark gradient and every line clears AA.'),
    ],
  ),
  rest(
    'role-bindings',
    'Role bindings without the footguns',
    'A tour of the new Access page and the guard rails behind it.',
    engineering,
    dan,
    '2026-10-02',
    7,
    { preset: 3 },
    [
      p(
        'Role bindings are the easiest way to grant too much access in Kubernetes. The new Access page makes the safe path the short one.',
      ),
      h2('Guard rails'),
      {
        type: 'list',
        items: [
          'A binding to cluster-admin asks for a reason and expires after 30 days by default.',
          'Wildcard verbs are flagged before you save.',
          'Every change appears in the audit log with the person who made it.',
        ],
      },
      h2('Previewing a change'),
      p(
        'Before anything is written, the page shows who gains which permissions and what they could already do. Most mistakes are visible at that step.',
      ),
      h3('Groups first'),
      p('Bind roles to groups, not people. When someone moves team, their access moves with them.'),
      {
        type: 'quote',
        content: 'Least privilege is easier when the least privileged option is the default.',
      },
    ],
  ),
  rest(
    'streaming-events',
    'Streaming events to ten thousand browser tabs',
    'Backpressure, batching and why we gave up on one socket per widget.',
    engineering,
    priya,
    '2026-09-21',
    8,
    { preset: 6 },
    [
      p(
        'The event stream is the busiest feature in the console. At peak, ten thousand tabs are listening at once.',
      ),
      h2('One socket per page'),
      p(
        'Our first version opened a socket for every widget. A dashboard with six widgets meant six connections and six copies of the same events.',
      ),
      {
        type: 'code',
        language: 'ts',
        code: [
          'const stream = events.subscribe({ clusters, kinds })',
          'stream.onBatch((batch) => store.apply(batch))',
        ].join('\n'),
      },
      h2('Batching and backpressure'),
      p(
        'Events are grouped into 250 ms batches on the server. A tab that falls behind receives a summary of what it missed instead of the full backlog.',
      ),
      h3('Dropping politely'),
      p(
        'A slow tab never slows the others: its queue is capped, and overflow is replaced by a single "refresh" marker.',
      ),
      p('The result is one connection per tab and flat memory use on the gateway.'),
    ],
  ),
  rest(
    'on-call-and-alerts',
    'What a year of on-call taught us about alerts',
    'Which pages we kept, which we deleted, and the rule we use to tell them apart.',
    engineering,
    mei,
    '2026-09-15',
    5,
    undefined,
    [
      p(
        'We looked at every page the on-call engineer received in a year: 1,412 of them. Fewer than a third needed a human.',
      ),
      h2('The rule'),
      p(
        'An alert that wakes someone must name an action only a person can take, right now. Everything else is a ticket or a dashboard.',
      ),
      h2('What we deleted'),
      {
        type: 'list',
        items: [
          'Pages for disk usage above 70%, which always resolved on their own.',
          'Duplicate alerts from the same underlying failure.',
          'Anything without a linked runbook.',
        ],
      },
      { type: 'quote', content: 'If the runbook says "wait and see", it was never a page.' },
      p('Pages per week dropped from 27 to 9, and the median time to acknowledge fell by half.'),
    ],
  ),
  rest(
    'console-4-1',
    'Console 4.1: deployments, rewritten',
    'Rollout history, revision diffs and a detail page that finally loads in one request.',
    releases,
    mei,
    '2026-09-09',
    6,
    { preset: 1 },
    [
      p('Deployments are what most people open the console for, so 4.1 starts there.'),
      h2('Highlights'),
      {
        type: 'list',
        items: [
          'Rollout history with the cause of every restart.',
          'Revision diffs that show what changed between two versions.',
          'A detail page that loads in one request.',
        ],
      },
      h2('Under the hood'),
      p(
        'The detail page used to stitch together nine requests. It now asks for one view and the server assembles it, which is also where the speed-up in 4.2 started.',
      ),
      {
        type: 'callout',
        label: 'Note',
        content: 'Rollout history is kept for 30 days on every plan.',
      },
      p('Thanks to everyone who sent feedback on the beta.'),
    ],
  ),
]

export const blogSlugs: string[] = blogPosts.map((post) => post.slug)

const iso = (day: number, hour: number, minute: number) =>
  new Date(Date.UTC(2026, 10, day, hour, minute)).toISOString()

export const blogComments: Record<string, BlogComment[]> = {
  [FEATURED_SLUG]: [
    {
      id: 'c1',
      author: { name: 'Jonas Lindqvist' },
      postedAt: iso(11, 14, 20),
      body: 'Did the aggregated document change how you handle CRDs that get installed after the cache is warm? We hit stale kinds for up to the TTL.',
      replies: [
        {
          id: 'c1-r1',
          author: { name: 'Priya Raman', isAuthor: true },
          postedAt: iso(11, 16, 5),
          body: "Yes. We watch CustomResourceDefinitions and drop the cluster's entry on any add or delete, so the TTL is only the fallback.",
        },
      ],
    },
    {
      id: 'c2',
      author: { name: 'Amara Osei' },
      postedAt: iso(11, 18, 42),
      body: 'The 38 → 1 number is wild. Would love a follow-up on how you measured time to interactive.',
    },
    {
      id: 'c3',
      author: { name: 'Tomas Berg' },
      postedAt: iso(12, 8, 15),
      body: 'Upgraded this morning and the difference on our largest cluster is obvious. Thanks for writing it up.',
    },
  ],
  'console-4-2': [
    {
      id: 'c4',
      author: { name: 'Lena Fischer' },
      postedAt: iso(5, 10, 30),
      body: 'Hover docs for our custom resources are a great touch. Does it pick up changes to the definition without a reload?',
    },
    {
      id: 'c5',
      author: { name: 'Ravi Menon' },
      postedAt: iso(6, 9, 10),
      body: 'Completion for enum values saved me from a typo in a PodDisruptionBudget this week.',
    },
  ],
  'role-bindings': [
    {
      id: 'c6',
      author: { name: 'Sofia Alvarez' },
      postedAt: iso(3, 13, 0),
      body: 'The expiry on cluster-admin bindings is the feature I did not know I needed.',
    },
  ],
}

/** Resolves after 600 ms; rejects when the address contains "fail". */
export async function mockSubscribe(email: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  if (email.includes('fail')) throw new Error('We could not subscribe that address. Try again.')
}

/** Resolves after 400 ms; rejects when the text contains "fail". */
export async function mockAddComment(text: string): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  if (text.includes('fail')) throw new Error('Your comment could not be posted. Try again.')
}
