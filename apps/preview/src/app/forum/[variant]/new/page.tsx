import { type ForumVariant, forumVariants, vocabulary } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ForumComposerDemo } from '@/components/forum/forum-demo'

interface ForumComposerRouteProps {
  params: Promise<{ variant: string }>
  searchParams: Promise<{ category?: string | string[] }>
}

export function generateStaticParams() {
  return Object.keys(forumVariants).map((variant) => ({ variant }))
}

/** The variation a URL names; an unknown one is a 404. */
async function resolveVariant(params: ForumComposerRouteProps['params']) {
  const { variant } = await params
  if (!Object.hasOwn(forumVariants, variant)) notFound()
  return variant as ForumVariant
}

export async function generateMetadata({ params }: ForumComposerRouteProps): Promise<Metadata> {
  const variant = await resolveVariant(params)
  return { title: vocabulary[variant].composerHeading }
}

export default async function ForumComposerRoute({
  params,
  searchParams,
}: ForumComposerRouteProps) {
  const variant = await resolveVariant(params)
  const { category } = await searchParams
  return (
    <ForumComposerDemo
      variant={variant}
      categoryId={typeof category === 'string' ? category : undefined}
    />
  )
}
