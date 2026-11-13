import type {
  ForumBlock,
  ForumCategory,
  ForumPost,
  ForumTopic,
  ForumUser,
  ForumVariant,
} from '@kemo/ui'

// The Kemo Community: static users, categories and topics for the preview's forum pages
// (`/forum/*`). Every time is an offset from FORUM_NOW (no wall clock), so the server and client
// renders match. The state that changes is `forumReducer` in `./forum-reducer`. People and events
// are fictional.

/** The demo's "now": every age reads from it; the reducer's clock starts here. */
export const FORUM_NOW = '2026-11-12T15:00:00Z'

const MINUTE_MS = 60 * 1000

/** `from` moved by `ms`, as an ISO string without milliseconds. */
export function shiftTime(from: string, ms: number): string {
  return new Date(Date.parse(from) + ms).toISOString().replace('.000Z', 'Z')
}
const ago = (ms: number) => shiftTime(FORUM_NOW, -ms)
const minutes = (n: number) => ago(n * MINUTE_MS)
const hours = (n: number) => minutes(n * 60)
const days = (n: number) => hours(n * 24)

// --- People -------------------------------------------------------------------------------------

const priya: ForumUser = {
  id: 'priya',
  name: 'Priya Raman',
  role: 'staff',
  joinedAt: '2025-11-01T00:00:00Z',
  postCount: 1430,
}
const jonas: ForumUser = {
  id: 'jonas',
  name: 'Jonas Lindqvist',
  joinedAt: '2026-03-01T00:00:00Z',
  postCount: 48,
  reputation: 48,
}
const dan: ForumUser = {
  id: 'dan',
  name: 'Dan Okafor',
  joinedAt: '2026-01-01T00:00:00Z',
  postCount: 212,
  reputation: 212,
}
const mei: ForumUser = {
  id: 'mei',
  name: 'Mei Tanaka',
  joinedAt: '2026-02-01T00:00:00Z',
  postCount: 96,
  reputation: 96,
}
const tomas: ForumUser = {
  id: 'tomas',
  name: 'Tomas Berg',
  joinedAt: '2026-03-01T00:00:00Z',
  postCount: 71,
  reputation: 71,
}
const amara: ForumUser = {
  id: 'amara',
  name: 'Amara Osei',
  joinedAt: '2026-04-01T00:00:00Z',
  postCount: 98,
  reputation: 98,
}
const lena: ForumUser = {
  id: 'lena',
  name: 'Lena Fischer',
  joinedAt: '2026-09-01T00:00:00Z',
  postCount: 5,
  reputation: 5,
}
const ana: ForumUser = {
  id: 'ana',
  name: 'Ana Souza',
  joinedAt: '2026-05-01T00:00:00Z',
  postCount: 34,
  reputation: 34,
}

export const forumUsers = { priya, jonas, dan, mei, tomas, amara, lena, ana }

/** Who is signed in: Jonas, the sample thread's author, so accept and "Author" can be seen. */
export const viewer = jonas

// --- Categories ---------------------------------------------------------------------------------

export const forumCategories: ForumCategory[] = [
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

// --- Posts --------------------------------------------------------------------------------------

const para = (content: string): ForumBlock => ({ type: 'paragraph', content })
const code = (text: string, language = 'ts'): ForumBlock => ({ type: 'code', language, code: text })
const list = (...items: string[]): ForumBlock => ({ type: 'list', items })

/** A reply: one paragraph by `author` at `postedAt`, with anything else in `more`. */
const reply = (
  id: string,
  author: ForumUser,
  postedAt: string,
  text: string,
  more: Partial<ForumPost> = {},
): ForumPost => ({ id, author, postedAt, body: [para(text)], ...more })

/** A topic whose id is its slug. */
const topic = (fields: Omit<ForumTopic, 'id'>): ForumTopic => ({ id: fields.slug, ...fields })

/** Short replies for the topics written as list rows: fictional, in the forum's voice. */
const REPLY_POOL = [
  'Same here on 4.2.1.',
  'Fixed for us after the upgrade.',
  'Could you share the request id from the error?',
  'Which console version is this on?',
  'We worked around it the same way for now.',
  'Following: we see the same on two clusters.',
  'The FAQ has a section on this that helped us.',
  'Thanks, that answers it for our setup.',
  'Would love this too; it comes up every week for us.',
  'Is there an issue to follow for this?',
]

/** A stable number for a string: where a topic's replies start in the pool and the user list. */
function hashOf(text: string): number {
  let hash = 0
  for (const ch of text) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return hash
}

/**
 * A topic written as a list row, with the posts its counts promise, so its page has a thread to
 * reply to: the opening post (the excerpt, then `more`; `reactionTotal` becomes its 👍), then
 * `replyCount` short replies from the pool by the other users, spread evenly from `createdAt`, the
 * last at `lastActivityAt`. No randomness: everything follows from the slug.
 */
function listedTopic(
  { reactionTotal = 0, ...fields }: Omit<ForumTopic, 'id' | 'posts'>,
  more?: string,
): ForumTopic {
  const others = Object.values(forumUsers).filter((user) => user.id !== fields.author.id)
  const start = hashOf(fields.slug)
  const span = Date.parse(fields.lastActivityAt) - Date.parse(fields.createdAt)
  const opening: ForumPost = {
    id: `${fields.slug}-op`,
    author: fields.author,
    postedAt: fields.createdAt,
    body: [para(more ? `${fields.excerpt} ${more}` : fields.excerpt)],
    reactions: reactionTotal > 0 ? [{ emoji: '👍', count: reactionTotal }] : [],
  }
  const replies = Array.from({ length: fields.replyCount }, (_, i): ForumPost => ({
    id: `${fields.slug}-r${i + 1}`,
    author: others[(start + i) % others.length]!,
    postedAt: shiftTime(fields.createdAt, Math.round((span * (i + 1)) / fields.replyCount)),
    body: [para(REPLY_POOL[(start + i) % REPLY_POOL.length]!)],
    reactions: [],
    votes: { score: 0 },
  }))
  return topic({ ...fields, posts: [opening, ...replies] })
}

// The sample thread, reconciled from the three thread mockups: Dan's question with Jonas's answer
// nested under it (quoting Dan, for Boards), Priya's accepted answer with two nested replies,
// Tomas's "same here", then six short replies so the Boards pager has a second page.
const sampleThreadPosts: ForumPost[] = [
  {
    id: 'p1',
    author: jonas,
    postedAt: minutes(14),
    editedAt: minutes(12),
    body: [
      para(
        'After upgrading to 4.2 the YAML tab lints fine, but the Schema panel is empty for our Gateway API objects. Deployments show the full tree. I registered the schema the way the docs say:',
      ),
      code("registry.register({ group: 'gateway.networking.k8s.io', kind: 'HTTPRoute', schema })"),
      para('Is there something else the browser needs, like a version in the key?'),
    ],
    reactions: [
      { emoji: '👍', count: 4 },
      { emoji: '👀', count: 2 },
    ],
  },
  reply(
    'p2',
    dan,
    minutes(11),
    'Which exact version, 4.2.0 or 4.2.1? And does the panel show anything for a plain Deployment on the same cluster?',
    { reactions: [{ emoji: '👍', count: 1 }], votes: { score: 1 } },
  ),
  reply(
    'p3',
    jonas,
    minutes(9),
    '4.2.1. Deployments are fine, it is only the CRD kinds. The lint still works for them, so the schema is loaded somewhere.',
    { parentId: 'p2', quote: { author: dan, excerpt: 'Which exact version, 4.2.0 or 4.2.1?' } },
  ),
  {
    id: 'p4',
    author: priya,
    postedAt: minutes(6),
    accepted: true,
    body: [
      para(
        'Since 4.2 the browser resolves the schema by apiVersion and kind together, so the key needs the version as well. Register it as:',
      ),
      code(
        "registry.register({ apiVersion: 'gateway.networking.k8s.io/v1', kind: 'HTTPRoute', schema })",
      ),
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
  reply(
    'p5',
    jonas,
    minutes(5),
    'That was it. The panel fills in as soon as the version is on the key. Thanks!',
    { parentId: 'p4', reactions: [{ emoji: '👍', count: 2 }] },
  ),
  reply(
    'p6',
    mei,
    minutes(3),
    'Worth noting that defaultSchemaRegistry already keys Deployments by version, which is why those never broke.',
    { parentId: 'p4', reactions: [{ emoji: '👍', count: 3 }], votes: { score: 3 } },
  ),
  reply('p7', tomas, minutes(2.5), 'Same symptom here with Argo Rollouts CRDs. Following.'),
  reply(
    'p8',
    amara,
    minutes(2.25),
    'Does the 4.2.2 warning cover custom registries too, or only defaultSchemaRegistry?',
  ),
  reply(
    'p9',
    priya,
    minutes(2),
    'Any register call without an apiVersion will warn, whichever registry it is on.',
  ),
  reply(
    'p10',
    tomas,
    minutes(1.75),
    'Put the version on the Rollouts registration and the panel fills in now.',
  ),
  reply(
    'p11',
    ana,
    minutes(1.5),
    'Could the docs example show the apiVersion form? That is where I copied mine from.',
  ),
  reply(
    'p12',
    priya,
    minutes(1.25),
    'Good catch. The FAQ entry on registering schemas has the new form now.',
  ),
  reply('p13', jonas, minutes(1), "Marking Priya's answer as the solution. Thanks, everyone."),
]

// --- Topics -------------------------------------------------------------------------------------

export const forumTopics: ForumTopic[] = [
  topic({
    slug: 'forum-guidelines',
    title: 'Forum guidelines and how to ask a question that gets answered',
    excerpt:
      'How this forum works, what to put in a first post and what never to paste. Read it once before you ask.',
    categoryId: 'announcements',
    author: priya,
    createdAt: days(45),
    lastActivityAt: days(9),
    replyCount: 1,
    viewCount: 8200,
    votes: { score: 15 },
    tags: [],
    kind: 'announcement',
    pinned: true,
    posts: [
      {
        id: 'p28',
        author: priya,
        postedAt: days(45),
        editedAt: days(9),
        body: [
          para(
            'This forum is where the people who run Kemo Console help each other. Staff read every topic, but most answers come from other members, so a few habits make a big difference:',
          ),
          list(
            'Search first. Many questions already have an accepted answer.',
            'Put the console version (Settings → About) and the Kubernetes version in the first post.',
            'Paste the YAML or the error as text, not a screenshot, with secrets removed.',
            'One question per topic. A follow-up gets a topic of its own, linked from the first.',
            'When an answer solves it, mark it accepted so the next person finds it.',
          ),
          {
            type: 'callout',
            tone: 'warning',
            label: 'Never post credentials',
            content:
              'Tokens, kubeconfigs and customer data do not belong here. If one slips into a post, flag it and staff will take it down.',
          },
        ],
        reactions: [
          { emoji: '👍', count: 24 },
          { emoji: '❤️', count: 6 },
        ],
      },
      reply(
        'p29',
        dan,
        days(9),
        'Could the composer remind people about the version? Half the first posts I answer start with me asking for it.',
        { reactions: [{ emoji: '👍', count: 9 }] },
      ),
    ],
  }),
  topic({
    slug: 'schema-browser-crd',
    title: 'Schema browser shows no CRD fields after 4.2',
    excerpt:
      'After upgrading, the YAML tab lints fine but the Schema panel is empty for our Gateway API objects.',
    categoryId: 'kemo-console',
    author: jonas,
    createdAt: minutes(14),
    lastActivityAt: minutes(1),
    replyCount: 12,
    viewCount: 1234,
    votes: { score: 18 },
    tags: ['yaml-editor', 'crd', '4.2'],
    following: true,
    posts: sampleThreadPosts,
  }),
  topic({
    slug: 'namespaces-per-environment',
    title: 'How do you structure namespaces across dev, stage and prod?',
    excerpt:
      'One namespace per environment per team, or one cluster per environment? Curious what people do once there are more than ten teams.',
    categoryId: 'deployments-gitops',
    author: amara,
    createdAt: days(3),
    lastActivityAt: minutes(70),
    replyCount: 2,
    viewCount: 640,
    votes: { score: 7 },
    tags: ['gitops', 'rbac'],
    kind: 'discussion',
    posts: [
      {
        id: 'p14',
        author: amara,
        postedAt: days(3),
        body: [
          para(
            'One namespace per environment per team, or one cluster per environment? Curious what people do once there are more than ten teams.',
          ),
          para(
            'We have twelve teams and three environments on one cluster: 36 namespaces, RoleBindings copied between them and a namespace picker that is a long scroll. The options we are weighing:',
          ),
          list(
            'One cluster per environment, a namespace per team.',
            'One cluster, a namespace per team and environment (what we have today).',
            'A cluster per team, with the environments as namespaces.',
          ),
        ],
        reactions: [{ emoji: '👍', count: 5 }],
      },
      reply(
        'p15',
        dan,
        hours(5),
        "We moved to one cluster per environment at about eight teams. Each cluster's namespace list stays short, and promotion is a pull request against the next environment's folder.",
        { reactions: [{ emoji: '👍', count: 2 }] },
      ),
      reply(
        'p16',
        mei,
        minutes(70),
        'Same here, plus an ApplicationSet that makes one Argo CD app per team folder, so a new team is a directory rather than a ticket.',
      ),
    ],
  }),
  topic({
    slug: 'console-4-2-released',
    title: 'Console 4.2 released: schema-aware YAML editing',
    excerpt:
      'Lint, hover docs and completion for every resource kind your cluster knows about, plus a schema browser beside the editor.',
    categoryId: 'announcements',
    author: priya,
    createdAt: days(12),
    lastActivityAt: minutes(130),
    replyCount: 1,
    viewCount: 4800,
    votes: { score: 64 },
    tags: ['4.2', 'yaml-editor', 'crd'],
    kind: 'announcement',
    posts: [
      {
        id: 'p17',
        author: priya,
        postedAt: days(12),
        body: [
          para(
            'Kemo Console 4.2 is out. The YAML editor now reads the schema of every resource kind your cluster serves, so lint, hover docs and completion work for your CRDs as well as for Deployments.',
          ),
          list(
            "Lint and completion from the cluster's OpenAPI schema, CRDs included.",
            'A schema browser beside the editor that follows the cursor.',
            'Hover docs on every field.',
            'Drafts in the YAML tab survive a trip to another tab.',
          ),
          {
            type: 'callout',
            label: 'Upgrading',
            content:
              'Schemas you register yourself are now keyed by apiVersion and kind. The FAQ has the new form.',
          },
        ],
        reactions: [
          { emoji: '👍', count: 52 },
          { emoji: '🎉', count: 12 },
        ],
      },
      reply(
        'p18',
        mei,
        minutes(130),
        'Hover docs on CRD fields alone make this worth the upgrade for us. Thanks to everyone who worked on it.',
      ),
    ],
  }),
  topic({
    slug: 'keycloak-nested-groups',
    title: 'Keycloak group mapping: nested groups are not synced',
    excerpt:
      'Top-level groups arrive, nested ones never show up in Access → Groups. Is there a flag for the full path?',
    categoryId: 'access-sso',
    author: tomas,
    createdAt: minutes(220),
    lastActivityAt: minutes(190),
    replyCount: 2,
    viewCount: 210,
    votes: { score: 2 },
    tags: ['oidc', 'groups'],
    status: 'needs-info',
    posts: [
      {
        id: 'p19',
        author: tomas,
        postedAt: minutes(220),
        body: [
          para(
            'Top-level groups arrive, nested ones never show up in Access → Groups. Is there a flag for the full path?',
          ),
          para(
            "Keycloak 25, the console's OIDC provider pointed at our realm and a Group Membership mapper on the client. A user in /platform/oncall gets platform in the console and nothing for oncall, though the ID token carries both:",
          ),
          code('"groups": ["/platform", "/platform/oncall"]', 'json'),
        ],
        reactions: [{ emoji: '👀', count: 2 }],
      },
      reply(
        'p20',
        priya,
        minutes(205),
        'Which console version is this, and does Access → Groups show anything at all for oncall with Full group path switched off in the mapper? That tells us whether the path or the nesting is the problem.',
      ),
      reply(
        'p21',
        dan,
        minutes(190),
        'We saw the same on 4.1 until we switched Full group path off and gave the nested groups unique names. Not pretty, but they synced.',
        { votes: { score: 1 } },
      ),
    ],
  }),
  listedTopic({
    slug: 'minimum-rbac-read-only',
    title: 'Minimum RBAC for a read-only console account?',
    excerpt:
      'Setting up a viewer account for the NOC. Which ClusterRole rules does the console need to render the dashboard?',
    categoryId: 'getting-started',
    author: lena,
    createdAt: minutes(310),
    lastActivityAt: minutes(310),
    replyCount: 0,
    viewCount: 85,
    votes: { score: 3 },
    reactionTotal: 2,
    tags: ['rbac'],
  }),
  topic({
    slug: 'scale-dialog-zero-replicas',
    title: 'Scale dialog rejects 0 replicas for a paused Deployment',
    excerpt:
      'With a Deployment paused, the Scale dialog will not take 0 replicas. kubectl scales the same object to zero without complaint.',
    categoryId: 'kemo-console',
    author: amara,
    createdAt: minutes(400),
    lastActivityAt: minutes(370),
    replyCount: 1,
    viewCount: 140,
    votes: { score: 1 },
    tags: ['scaling'],
    posts: [
      {
        id: 'p26',
        author: amara,
        postedAt: minutes(400),
        body: [
          para(
            'With a Deployment paused, the Scale dialog will not take 0: the field turns red with "Must be at least 1". kubectl scale --replicas=0 works on the same object.',
          ),
          para('Console 4.2.1, no HPA on it. Is that on purpose for paused Deployments?'),
        ],
      },
      reply(
        'p27',
        tomas,
        minutes(370),
        'Not on purpose as far as I can tell: the same dialog takes 0 for a running Deployment. Resuming, scaling to 0 and pausing again works around it for now.',
        { votes: { score: 1 } },
      ),
    ],
  }),
  topic({
    slug: 'gitops-dashboard-kemo-ui',
    title: 'A GitOps dashboard built with @kemo/ui',
    excerpt:
      'Weekend project: Argo sync status, drift and rollout history on the same widgets the console uses. Source on GitHub.',
    categoryId: 'show-and-tell',
    author: mei,
    createdAt: hours(70),
    lastActivityAt: hours(30),
    replyCount: 3,
    viewCount: 2300,
    votes: { score: 41 },
    tags: ['show-and-tell', 'gitops'],
    kind: 'discussion',
    posts: [
      {
        id: 'p22',
        author: mei,
        postedAt: hours(70),
        body: [
          para(
            'Weekend project: Argo sync status, drift and rollout history on the same widgets the console uses. Source on GitHub.',
          ),
          para(
            'It reads the Argo CD API and the clusters directly and renders with @kemo/ui: the table, the status badges and the Nightfall header. Drift opens in the same YAML editor the console uses, so the schema panel works there too.',
          ),
          list(
            'Sync status per app, grouped by cluster.',
            'Drift as a diff against the live object.',
            'The last ten rollouts, with who started each one.',
          ),
          para('It is rough around the edges; issues are welcome.'),
        ],
        reactions: [
          { emoji: '🚀', count: 22 },
          { emoji: '❤️', count: 9 },
          { emoji: '👍', count: 6 },
        ],
      },
      reply(
        'p23',
        priya,
        hours(50),
        'This is lovely. Would you mind if we linked it from the examples page in the docs?',
        { reactions: [{ emoji: '❤️', count: 4 }] },
      ),
      reply(
        'p24',
        amara,
        hours(40),
        'The drift view is what we have wanted for our three clusters. Does it cope with ApplicationSets?',
      ),
      reply(
        'p25',
        mei,
        hours(30),
        'It does: each generated app is a row and the set becomes a group header. And go ahead, Priya.',
      ),
    ],
  }),
  listedTopic({
    slug: 'dark-mode-schema-panel',
    title: "Dark mode for the YAML editor's schema panel",
    excerpt:
      "The editor goes dark with the theme but the schema panel stays light. Small, but it's the one bright thing on the page at night.",
    categoryId: 'feature-requests',
    author: dan,
    createdAt: days(4),
    lastActivityAt: hours(28),
    replyCount: 6,
    viewCount: 520,
    votes: { score: 23 },
    reactionTotal: 23,
    tags: ['dark-mode', 'yaml-editor'],
  }),
  listedTopic({
    slug: 'events-tab-laptop-sleep',
    title: 'Events tab stops updating after a laptop sleep',
    excerpt:
      'After the laptop wakes, the Events tab keeps the old list until a reload. The pods tab catches up on its own.',
    categoryId: 'bug-reports',
    author: ana,
    createdAt: hours(52),
    lastActivityAt: hours(52),
    replyCount: 0,
    viewCount: 60,
    votes: { score: 4 },
    reactionTotal: 3,
    tags: ['events'],
  }),
  topic({
    slug: 'deployment-drafts-closed-tab',
    title: 'Keeping Deployment drafts when the tab is closed',
    excerpt:
      'A draft in the YAML tab survives switching tabs inside the console, but not closing the browser tab. Is there a way to keep it?',
    categoryId: 'kemo-console',
    author: lena,
    createdAt: days(6),
    lastActivityAt: days(4),
    replyCount: 5,
    viewCount: 980,
    votes: { score: 11 },
    tags: ['yaml-editor'],
    posts: [
      {
        id: 'p30',
        author: lena,
        postedAt: days(6),
        body: [
          para(
            'I had a long edit open in the YAML tab, closed the browser tab by mistake and lost it. The draft survives a trip to the Events tab, so it is kept somewhere. Could it survive a closed tab too?',
          ),
        ],
      },
      reply(
        'p31',
        dan,
        hours(6 * 24 - 2),
        "Drafts live in the page's memory, so closing the tab or reloading drops them. Nothing goes to the browser's storage.",
        { votes: { score: 2 } },
      ),
      {
        id: 'p32',
        author: priya,
        postedAt: days(5),
        accepted: true,
        body: [
          para(
            'Dan is right for 4.2. From 4.2.2 the YAML tab keeps each draft in local storage for a day and offers to restore it when you come back.',
          ),
          para('Until then, copy a long edit out before closing the tab.'),
        ],
        reactions: [{ emoji: '👍', count: 6 }],
        votes: { score: 7 },
      },
      reply('p33', lena, hours(5 * 24 - 1), 'A day is plenty. Thanks, both.', {
        parentId: 'p32',
      }),
      reply(
        'p34',
        mei,
        hours(4 * 24 + 6),
        'A warning before closing a tab with an unsaved draft would help too.',
        { votes: { score: 3 } },
      ),
      reply(
        'p35',
        jonas,
        days(4),
        'Agreed, a prompt before the tab closes would have saved me twice this month.',
        { votes: { score: 1 } },
      ),
    ],
  }),
  topic({
    slug: 'crd-schema-several-versions',
    title: 'Registering a schema for a CRD with several versions',
    excerpt:
      'A CRD that serves v1 and v1beta1 only gets a schema for the version registered. Does each version need its own register call?',
    categoryId: 'kemo-console',
    author: dan,
    createdAt: days(16),
    lastActivityAt: days(14),
    replyCount: 9,
    viewCount: 1500,
    votes: { score: 9 },
    tags: ['crd', 'yaml-editor'],
    posts: [
      {
        id: 'p36',
        author: dan,
        postedAt: days(16),
        body: [
          para(
            'Our Certificate CRD serves v1 and v1beta1. With the v1 schema registered, objects still on v1beta1 get no schema at all. Do I register each version on its own?',
          ),
        ],
      },
      {
        id: 'p37',
        author: priya,
        postedAt: hours(16 * 24 - 3),
        accepted: true,
        body: [
          para(
            'Yes: one register call per served version. The key is apiVersion and kind, so the versions never collide:',
          ),
          code(
            "registry.register({ apiVersion: 'cert-manager.io/v1', kind: 'Certificate', schema: v1 })\nregistry.register({ apiVersion: 'cert-manager.io/v1beta1', kind: 'Certificate', schema: v1beta1 })",
          ),
          para('If both versions share one schema, pass the same object twice.'),
        ],
        reactions: [{ emoji: '👍', count: 5 }],
        votes: { score: 6 },
      },
      reply('p38', dan, hours(16 * 24 - 4), 'That did it, thanks.', { parentId: 'p37' }),
      reply(
        'p39',
        tomas,
        hours(15 * 24 + 10),
        'The browser opens on the storage version by default, for what it is worth.',
        { votes: { score: 2 } },
      ),
      reply(
        'p40',
        mei,
        hours(15 * 24 + 2),
        'We read spec.versions from the CRD at start-up and register each served one, so a new version needs no code change.',
        { votes: { score: 3 } },
      ),
      reply(
        'p41',
        ana,
        hours(15 * 24 - 1),
        'Does that loop need the cluster to be reachable when the console starts?',
      ),
      reply(
        'p42',
        mei,
        hours(15 * 24 - 3),
        'It does. We fall back to the bundled schemas when it is not.',
      ),
      reply(
        'p43',
        amara,
        hours(14 * 24 + 8),
        'Worth adding to the FAQ next to the Gateway API example.',
      ),
      reply('p44', jonas, hours(14 * 24 + 5), 'Seconded. I went looking there first.'),
      reply('p45', priya, days(14), 'Added to the FAQ under Registering schemas. Thanks, Amara.'),
    ],
  }),

  // Written as list rows: their posts are made up to match their counts (see listedTopic).
  listedTopic({
    slug: 'yaml-tab-diff-before-save',
    title: 'Can the YAML tab show a diff before I save?',
    excerpt:
      'Save applies straight away. A diff against the server copy would catch the odd stray indent before it rolls out.',
    categoryId: 'kemo-console',
    author: jonas,
    createdAt: days(8),
    lastActivityAt: days(7),
    replyCount: 4,
    viewCount: 410,
    votes: { score: 6 },
    reactionTotal: 5,
    tags: ['yaml-editor'],
  }),
  listedTopic({
    slug: 'access-groups-large-directory',
    title: 'Access → Groups is slow with 2,000 groups from the IdP',
    excerpt:
      'The Groups page takes a few seconds to open since we connected the corporate directory. Is there a way to sync only some groups?',
    categoryId: 'kemo-console',
    author: tomas,
    createdAt: days(10),
    lastActivityAt: days(8),
    replyCount: 7,
    viewCount: 690,
    votes: { score: 8 },
    reactionTotal: 6,
    tags: ['groups', 'oidc'],
  }),
  listedTopic({
    slug: 'events-filter-by-reason',
    title: 'Filtering the Events tab by reason',
    excerpt:
      'During a rollout the Events tab is mostly ScalingReplicaSet. Can I hide a reason, or show only the warnings?',
    categoryId: 'kemo-console',
    author: mei,
    createdAt: days(13),
    lastActivityAt: days(11),
    replyCount: 3,
    viewCount: 330,
    votes: { score: 4 },
    reactionTotal: 4,
    tags: ['events'],
  }),
  listedTopic({
    slug: 'hpa-scale-to-zero',
    title: 'Scaling to zero with an HPA attached',
    excerpt:
      'The Scale dialog warns that the HPA will undo a manual change. What is the clean way to park a Deployment overnight?',
    categoryId: 'kemo-console',
    author: amara,
    createdAt: days(18),
    lastActivityAt: days(15),
    replyCount: 6,
    viewCount: 870,
    votes: { score: 7 },
    reactionTotal: 5,
    tags: ['scaling'],
  }),
  listedTopic({
    slug: 'crd-printer-columns',
    title: "Does the list view use a CRD's printer columns?",
    excerpt:
      'kubectl get shows our additionalPrinterColumns; the console list shows only name and age. Is that planned?',
    categoryId: 'kemo-console',
    author: jonas,
    createdAt: days(22),
    lastActivityAt: days(20),
    replyCount: 2,
    viewCount: 260,
    votes: { score: 5 },
    reactionTotal: 3,
    tags: ['crd'],
  }),
  listedTopic({
    slug: 'restart-greyed-out',
    title: 'Restart is greyed out for one Deployment but not the others',
    excerpt:
      'Same namespace, same role, and Restart is disabled on exactly one Deployment. The tooltip only says "Not allowed".',
    categoryId: 'kemo-console',
    author: lena,
    createdAt: days(25),
    lastActivityAt: days(24),
    replyCount: 4,
    viewCount: 300,
    votes: { score: 2 },
    reactionTotal: 1,
    tags: ['rbac'],
  }),
  listedTopic(
    {
      slug: 'yaml-editor-windows-line-endings',
      title: 'The YAML editor flags every line after pasting from Windows',
      excerpt:
        'Pasting a manifest copied on Windows marks each line with a lint error until I retype the indentation.',
      categoryId: 'kemo-console',
      author: ana,
      createdAt: days(30),
      lastActivityAt: days(28),
      replyCount: 5,
      viewCount: 450,
      votes: { score: 6 },
      reactionTotal: 4,
      tags: ['yaml-editor'],
    },
    'The same file copied on a Mac pastes cleanly, so I suspect the line endings.',
  ),
  listedTopic({
    slug: 'argo-managed-warning',
    title: 'A warning before editing a Deployment Argo CD manages',
    excerpt:
      'Edits in the console get reverted by the next sync. A banner on objects with an Argo CD tracking label would save a few surprises.',
    categoryId: 'kemo-console',
    author: dan,
    createdAt: days(37),
    lastActivityAt: days(33),
    replyCount: 8,
    viewCount: 760,
    votes: { score: 25 },
    reactionTotal: 9,
    tags: ['gitops', 'yaml-editor'],
  }),
  listedTopic(
    {
      slug: 'dashboard-replicas-lag',
      title: 'Replica counts on the dashboard lag a minute behind kubectl',
      excerpt:
        'After a scale, kubectl shows the new count at once while the dashboard card catches up about a minute later.',
      categoryId: 'kemo-console',
      author: tomas,
      createdAt: days(55),
      lastActivityAt: days(52),
      replyCount: 3,
      viewCount: 390,
      votes: { score: 3 },
      reactionTotal: 2,
      tags: ['scaling', 'events'],
    },
    'The Deployments page is up to date at once; it is only the dashboard cards.',
  ),
  listedTopic({
    slug: 'maintenance-window-4-2-2',
    title: 'Maintenance window: the hosted console moves to 4.2.2',
    excerpt:
      'The hosted console will be read-only for up to an hour while it moves to 4.2.2. Clusters keep running; only the console pauses.',
    categoryId: 'announcements',
    author: priya,
    createdAt: days(5),
    lastActivityAt: days(4),
    replyCount: 2,
    viewCount: 1100,
    votes: { score: 9 },
    reactionTotal: 8,
    tags: ['4.2'],
    kind: 'announcement',
  }),
  listedTopic({
    slug: 'argo-sync-waves-history',
    title: 'Do sync waves show up in the rollout history?',
    excerpt:
      'Our apps roll out in three sync waves. The history lists each Deployment on its own; is there a way to see the waves?',
    categoryId: 'deployments-gitops',
    author: mei,
    createdAt: days(9),
    lastActivityAt: days(6),
    replyCount: 4,
    viewCount: 380,
    votes: { score: 5 },
    reactionTotal: 4,
    tags: ['gitops'],
  }),
  listedTopic({
    slug: 'kustomize-overlay-yaml-tab',
    title: 'Editing a Kustomize-rendered Deployment in the YAML tab',
    excerpt:
      'The YAML tab shows the rendered object. Is there a way to see which overlay a field came from before changing it?',
    categoryId: 'deployments-gitops',
    author: jonas,
    createdAt: days(27),
    lastActivityAt: days(21),
    replyCount: 6,
    viewCount: 540,
    votes: { score: 6 },
    reactionTotal: 5,
    tags: ['gitops', 'yaml-editor'],
  }),
  listedTopic({
    slug: 'oidc-hourly-sign-out',
    title: 'Signed out every hour with Entra ID as the OIDC provider',
    excerpt:
      'The console sends us back to the sign-in page every 60 minutes. Does it use refresh tokens, and what scope does it need?',
    categoryId: 'access-sso',
    author: ana,
    createdAt: days(11),
    lastActivityAt: days(10),
    replyCount: 5,
    viewCount: 620,
    votes: { score: 5 },
    reactionTotal: 3,
    tags: ['oidc'],
  }),
  listedTopic({
    slug: 'restart-only-role',
    title: 'A role that can restart Deployments but not edit them',
    excerpt:
      'On-call should be able to restart and scale, not change the spec. Which verbs does the console check for each action?',
    categoryId: 'access-sso',
    author: amara,
    createdAt: days(33),
    lastActivityAt: days(31),
    replyCount: 4,
    viewCount: 470,
    votes: { score: 8 },
    reactionTotal: 6,
    tags: ['rbac', 'groups'],
  }),
  listedTopic({
    slug: 'first-cluster-oidc-kubeconfig',
    title: 'Adding a first cluster from a kubeconfig that signs in with OIDC',
    excerpt:
      'Our kubeconfig uses an exec plugin for OIDC. The console says it cannot read the credentials; what does it expect instead?',
    categoryId: 'getting-started',
    author: lena,
    createdAt: days(40),
    lastActivityAt: days(39),
    replyCount: 3,
    viewCount: 510,
    votes: { score: 4 },
    reactionTotal: 3,
    tags: ['oidc'],
  }),
  listedTopic(
    {
      slug: 'hpa-targets-beside-replicas',
      title: 'Show HPA targets beside the replica count',
      excerpt:
        'When a Deployment has an HPA, the list could show min, max and the current target next to the replicas.',
      categoryId: 'feature-requests',
      author: tomas,
      createdAt: days(58),
      lastActivityAt: days(44),
      replyCount: 11,
      viewCount: 930,
      votes: { score: 19 },
      reactionTotal: 17,
      tags: ['scaling'],
    },
    'Today it takes a trip to the HPA itself to see why the count changed.',
  ),
]

export const forumSlugs = forumTopics.map((t) => t.slug)

/** The sample thread's linked docs (Q&A): the only documentation-like page the preview has. */
export const forumDocs = [{ label: 'Registering schemas', href: '/faq', description: 'FAQ' }]

/** The footer's links, under `/forum/{variant}`. */
export function footerLinks(variant: ForumVariant): { label: string; href: string }[] {
  const guidelines = `/forum/${variant}/t/forum-guidelines`
  return [
    { label: 'Guidelines', href: guidelines },
    { label: 'Code of conduct', href: guidelines },
    { label: 'Status', href: '/maintenance' },
  ]
}
