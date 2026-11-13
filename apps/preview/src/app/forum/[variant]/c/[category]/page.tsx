import { type ForumVariant, forumVariants } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { ForumCategoryDemo } from '@/components/forum/forum-demo'
import { forumCategories } from '@/lib/mock-forum'

interface ForumCategoryRouteProps {
  params: Promise<{ variant: string; category: string }>
}

export function generateStaticParams() {
  return Object.keys(forumVariants).flatMap((variant) =>
    forumCategories.map((category) => ({ variant, category: category.id })),
  )
}

/** The variation and category a URL names; an unknown variation or category is a 404. */
async function resolveCategory(params: ForumCategoryRouteProps['params']) {
  const { variant, category: id } = await params
  const category = forumCategories.find((candidate) => candidate.id === id)
  if (!Object.hasOwn(forumVariants, variant) || !category) notFound()
  return { variant: variant as ForumVariant, category }
}

export async function generateMetadata({ params }: ForumCategoryRouteProps): Promise<Metadata> {
  const { variant, category } = await resolveCategory(params)
  return { title: `${category.label} · ${forumVariants[variant].title}` }
}

export default async function ForumCategoryRoute({ params }: ForumCategoryRouteProps) {
  const { variant, category } = await resolveCategory(params)
  return <ForumCategoryDemo variant={variant} categoryId={category.id} />
}
