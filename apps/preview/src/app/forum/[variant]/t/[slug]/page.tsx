import { type ForumVariant, forumVariants } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ForumTopicDemo } from '@/components/forum/forum-demo'
import { forumSlugs, forumTopics } from '@/lib/mock-forum'

interface ForumTopicRouteProps {
  params: Promise<{ variant: string; slug: string }>
}

// Topics created during a visit live in the browser's state, so any slug renders here and the
// page decides in the browser whether it is a 404.
export const dynamicParams = true

export function generateStaticParams() {
  return Object.keys(forumVariants).flatMap((variant) =>
    forumSlugs.map((slug) => ({ variant, slug })),
  )
}

/** The variation and slug a URL names; an unknown variation is a 404 (the slug is the page's). */
async function resolveTopic(params: ForumTopicRouteProps['params']) {
  const { variant, slug } = await params
  if (!Object.hasOwn(forumVariants, variant)) notFound()
  return { variant: variant as ForumVariant, slug }
}

export async function generateMetadata({ params }: ForumTopicRouteProps): Promise<Metadata> {
  const { slug } = await resolveTopic(params)
  return { title: forumTopics.find((topic) => topic.slug === slug)?.title ?? 'Topic' }
}

export default async function ForumTopicRoute({ params }: ForumTopicRouteProps) {
  const { variant, slug } = await resolveTopic(params)
  return <ForumTopicDemo variant={variant} slug={slug} />
}
