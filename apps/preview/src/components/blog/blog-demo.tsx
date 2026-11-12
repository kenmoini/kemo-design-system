'use client'
import { BlogIndexPage, BlogPostPage, type BlogComment, type BlogVariant } from '@kemo/ui'
import NextLink from 'next/link'
import { useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import { blogComments, blogPosts, blogTitles, mockAddComment, mockSubscribe } from '@/lib/mock-blog'

/** Adds `comment` to the top level, or to the replies of the comment `parentId`. */
function withComment(
  comments: BlogComment[],
  comment: BlogComment,
  parentId?: string,
): BlogComment[] {
  if (!parentId) return [...comments, comment]
  return comments.map((c) =>
    c.id === parentId ? { ...c, replies: [...(c.replies ?? []), comment] } : c,
  )
}

/** A blog index, or the post `slug` when given, in one of the three variations. */
export function BlogDemo({ variant, slug }: Readonly<{ variant: BlogVariant; slug?: string }>) {
  const [comments, setComments] = useState<BlogComment[]>(() =>
    slug ? (blogComments[slug] ?? []) : [],
  )
  const indexHref = `/blog/${variant}`
  const chrome = {
    variant,
    logo: <BrandMark letter="K" />,
    brand: 'Kemo',
    nav: [{ label: 'Posts', href: indexHref, current: !slug }],
    indexHref,
    postHref: (post: { slug: string }) => `${indexHref}/${post.slug}`,
    onSubscribe: mockSubscribe,
    linkComponent: NextLink,
  }
  const post = slug ? blogPosts.find((candidate) => candidate.slug === slug) : undefined

  if (post) {
    return (
      <BlogPostPage
        {...chrome}
        post={post}
        posts={blogPosts}
        indexTitle={variant === 'journal-rail' ? 'Platform journal' : undefined}
        comments={comments}
        onAddComment={async ({ name, body, parentId }) => {
          await mockAddComment(body)
          const comment: BlogComment = {
            id: crypto.randomUUID(),
            author: { name },
            postedAt: new Date().toISOString(),
            body,
          }
          setComments((current) => withComment(current, comment, parentId))
        }}
      />
    )
  }
  return (
    <BlogIndexPage
      {...chrome}
      title={blogTitles[variant].title}
      description={blogTitles[variant].description}
      posts={blogPosts}
    />
  )
}
