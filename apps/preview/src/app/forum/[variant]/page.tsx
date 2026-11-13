import { type ForumVariant, forumVariants } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ForumIndexDemo } from '@/components/forum/forum-demo'

interface ForumIndexRouteProps {
  params: Promise<{ variant: string }>
  searchParams: Promise<{ q?: string | string[] }>
}

export function generateStaticParams() {
  return Object.keys(forumVariants).map((variant) => ({ variant }))
}

/** The variation a URL names; an unknown one is a 404. */
async function resolveVariant(params: ForumIndexRouteProps['params']) {
  const { variant } = await params
  if (!Object.hasOwn(forumVariants, variant)) notFound()
  return variant as ForumVariant
}

export async function generateMetadata({ params }: ForumIndexRouteProps): Promise<Metadata> {
  const variant = await resolveVariant(params)
  return { title: forumVariants[variant].title }
}

export default async function ForumIndexRoute({ params, searchParams }: ForumIndexRouteProps) {
  const variant = await resolveVariant(params)
  const { q } = await searchParams
  return <ForumIndexDemo variant={variant} query={typeof q === 'string' ? q : undefined} />
}
