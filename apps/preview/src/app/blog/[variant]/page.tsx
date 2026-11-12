import { type BlogVariant, blogVariants } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogDemo } from '@/components/blog/blog-demo'

interface BlogIndexRouteProps {
  params: Promise<{ variant: string }>
}

export function generateStaticParams() {
  return Object.keys(blogVariants).map((variant) => ({ variant }))
}

/** The variation a URL names; an unknown one is a 404. */
async function resolveVariant(params: BlogIndexRouteProps['params']) {
  const { variant } = await params
  if (!Object.hasOwn(blogVariants, variant)) notFound()
  return variant as BlogVariant
}

export async function generateMetadata({ params }: BlogIndexRouteProps): Promise<Metadata> {
  const variant = await resolveVariant(params)
  return { title: blogVariants[variant].title }
}

export default async function BlogIndexRoute({ params }: BlogIndexRouteProps) {
  return <BlogDemo variant={await resolveVariant(params)} />
}
