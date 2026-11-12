import { type BlogVariant, blogVariants } from '@kemo/ui'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { BlogDemo } from '@/components/blog/blog-demo'
import { blogPosts, blogSlugs } from '@/lib/mock-blog'

interface BlogPostRouteProps {
  params: Promise<{ variant: string; slug: string }>
}

export function generateStaticParams() {
  return Object.keys(blogVariants).flatMap((variant) =>
    blogSlugs.map((slug) => ({ variant, slug })),
  )
}

/** The variation and post a URL names; an unknown variation or post is a 404. */
async function resolvePost(params: BlogPostRouteProps['params']) {
  const { variant, slug } = await params
  const post = blogPosts.find((candidate) => candidate.slug === slug)
  if (!Object.hasOwn(blogVariants, variant) || !post) notFound()
  return { variant: variant as BlogVariant, post }
}

export async function generateMetadata({ params }: BlogPostRouteProps): Promise<Metadata> {
  const { post } = await resolvePost(params)
  return { title: post.title }
}

export default async function BlogPostRoute({ params }: BlogPostRouteProps) {
  const { variant, post } = await resolvePost(params)
  return <BlogDemo variant={variant} slug={post.slug} />
}
