'use client'
import {
  ForumCategoryPage,
  type ForumChromeProps,
  ForumComposerPage,
  ForumIndexPage,
  ForumTopicPage,
  type ForumVariant,
  Link,
  vocabulary,
} from '@kemo/ui'
import NextLink from 'next/link'
import { notFound, useRouter } from 'next/navigation'
import { Fragment, useSyncExternalStore } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { useForumDemo } from '@/components/forum/forum-demo-shell'
import type { ForumState } from '@/lib/forum-reducer'
import { footerLinks, forumDocs } from '@/lib/mock-forum'

/** Which forum page the chrome is for. */
type ForumPage = 'front' | 'category' | 'topic' | 'composer'

const noSubscription = () => () => {}
/** False on the server and while hydrating, true after: the browser's state is only known then. */
const useHydrated = () =>
  useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  )

const indexHrefOf = (variant: ForumVariant) => `/forum/${variant}`
const topicHrefOf = (variant: ForumVariant, slug: string) => `${indexHrefOf(variant)}/t/${slug}`

/** Guidelines · Code of conduct · Status. */
function ForumFooter({ variant }: Readonly<{ variant: ForumVariant }>) {
  return footerLinks(variant).map((link, index) => (
    <Fragment key={link.label}>
      {index > 0 ? ' · ' : null}
      <Link variant="plain" fontWeight="normal" color="inherit" asChild>
        <NextLink href={link.href}>{link.label}</NextLink>
      </Link>
    </Fragment>
  ))
}

/** What every forum page of `variant` shares: the brand, the hrefs, the clock and the viewer. */
function chrome(variant: ForumVariant, page: ForumPage, state: ForumState): ForumChromeProps {
  const indexHref = indexHrefOf(variant)
  const nav: NonNullable<ForumChromeProps['nav']> = [
    { label: vocabulary[variant].sectionLabel, href: indexHref, current: page === 'front' },
  ]
  // The Discussions rail's category list, on the pages that have the rail.
  if (variant === 'discussions' && (page === 'front' || page === 'category')) {
    nav.push({ label: 'Categories', href: '#categories' })
  }
  return {
    variant,
    logo: <BrandMark letter="K" />,
    brand: 'Kemo',
    nav,
    footer: <ForumFooter variant={variant} />,
    now: state.now,
    viewer: state.viewer,
    linkComponent: NextLink,
    indexHref,
    signInHref: '/login',
    categoryHref: (category) => `${indexHref}/c/${category.id}`,
    topicHref: (topic) => topicHrefOf(variant, topic.slug),
    composerHref: (category) =>
      category ? `${indexHref}/new?category=${category.id}` : `${indexHref}/new`,
    searchHref: (query) => `${indexHref}?q=${encodeURIComponent(query)}`,
  }
}

/** The front page (`/forum/{variant}`), searching for `query` when given. */
export function ForumIndexDemo({
  variant,
  query,
}: Readonly<{ variant: ForumVariant; query?: string }>) {
  const { state, topics } = useForumDemo()
  return (
    <ForumIndexPage
      {...chrome(variant, 'front', state)}
      title="Kemo Community"
      description="Questions, answers and release talk from the people who run Kemo Console."
      categories={state.categories}
      topics={topics}
      memberCount={412}
      defaultQuery={query}
    />
  )
}

/** A category page (`/forum/{variant}/c/{categoryId}`); the route has checked the id. */
export function ForumCategoryDemo({
  variant,
  categoryId,
}: Readonly<{ variant: ForumVariant; categoryId: string }>) {
  const { state, topics } = useForumDemo()
  const category = state.categories.find((c) => c.id === categoryId)
  if (!category) notFound()
  return (
    <ForumCategoryPage
      {...chrome(variant, 'category', state)}
      category={category}
      categories={state.categories}
      topics={topics}
    />
  )
}

/**
 * A topic (`/forum/{variant}/t/{slug}`), every action wired to the layout's state.
 *
 * A slug the state doesn't have is a 404, decided here in the browser: the server knows only the
 * seeded topics, not the ones created in this visit (the Deployments detail page does the same).
 * The server render of an unknown slug is therefore empty, and the browser shows the 404 page once
 * it has hydrated.
 */
export function ForumTopicDemo({
  variant,
  slug,
}: Readonly<{ variant: ForumVariant; slug: string }>) {
  const { state, topics, reply, react, vote, accept, follow } = useForumDemo()
  const hydrated = useHydrated()
  const topic = state.topics[slug]
  const category = topic && state.categories.find((c) => c.id === topic.categoryId)
  if (!topic || !category) {
    if (hydrated) notFound()
    return null
  }
  // Only the asker (or staff) marks the accepted answer.
  const canAccept = topic.author.id === state.viewer.id || state.viewer.role === 'staff'

  return (
    <ForumTopicPage
      {...chrome(variant, 'topic', state)}
      topic={topic}
      category={category}
      related={topics.filter((t) => t.slug !== slug)}
      docs={forumDocs}
      onReply={(input) => reply(slug, input)}
      onReact={(postId, emoji) => react(slug, postId, emoji)}
      onVote={(postId, direction) => vote(slug, postId, direction)}
      onAcceptAnswer={canAccept ? (postId) => accept(slug, postId) : undefined}
      onFollow={(_topicId, following) => follow(slug, following)}
    />
  )
}

/** The composer (`/forum/{variant}/new`), with `categoryId` chosen when given; lands on the new topic. */
export function ForumComposerDemo({
  variant,
  categoryId,
}: Readonly<{ variant: ForumVariant; categoryId?: string }>) {
  const { state, create } = useForumDemo()
  const router = useRouter()
  const category = state.categories.find((c) => c.id === categoryId)
  return (
    <ForumComposerPage
      {...chrome(variant, 'composer', state)}
      categories={state.categories}
      defaultCategoryId={category?.id}
      cancelHref={category ? `${indexHrefOf(variant)}/c/${category.id}` : indexHrefOf(variant)}
      onCreateTopic={async (values) => {
        const slug = await create(values)
        router.push(topicHrefOf(variant, slug))
      }}
    />
  )
}
