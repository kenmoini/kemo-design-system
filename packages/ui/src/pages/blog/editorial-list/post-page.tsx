'use client'
import { css } from '../../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Text } from '../../../components/ui'
import type { LinkComponent } from '../../auth/types'
import { BlogComments } from '../blog-comments'
import { BlogLayout } from '../blog-layout'
import { BlogProse } from '../blog-prose'
import { adjacentPosts, sortPosts } from '../content'
import { CopyLinkButton } from '../copy-link-button'
import { AuthorBlock, Byline, TopicBadge } from '../post-meta'
import type { BlogPostPageProps } from '../types'

const backLink = css({
  textStyle: 'sm',
  color: 'fg.muted',
  textDecoration: 'none',
  rounded: 'l1',
  _hover: { color: 'fg.default' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px' },
})
const cellLink = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '1',
  p: '4',
  borderWidth: '1px',
  borderColor: 'border',
  borderRadius: 'l2',
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { bg: 'gray.surface.bg' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px' },
})

function Anchor({
  as: Link,
  ...props
}: {
  as?: LinkComponent
  href: string
  className: string
  children: React.ReactNode
}) {
  return Link ? <Link {...props} /> : <a {...props} />
}

export function EditorialListPost({
  post,
  posts,
  indexTitle,
  comments,
  onAddComment,
  ...chrome
}: BlogPostPageProps) {
  const { older, newer } = adjacentPosts(sortPosts(posts), post.slug)
  const { indexHref, postHref, linkComponent } = chrome

  return (
    <BlogLayout {...chrome}>
      <Box
        className="dark"
        colorScheme="dark"
        bgGradient="auth"
        color="fg.default"
        px={{ base: '4', sm: '7' }}
        py={{ base: '8', md: '10' }}
      >
        <Stack maxW="40rem" mx="auto" gap="4" alignItems="flex-start">
          <Anchor as={linkComponent} href={indexHref} className={backLink}>
            ← {indexTitle ?? 'All posts'}
          </Anchor>
          <TopicBadge topic={post.topic} />
          <styled.h1
            textStyle={{ base: '3xl', md: '4xl' }}
            fontWeight="semibold"
            letterSpacing="-0.025em"
            lineHeight="1.1"
          >
            {post.title}
          </styled.h1>
          <Text color="fg.muted" textStyle="md" maxW="56ch">
            {post.summary}
          </Text>
          <Byline post={post} />
        </Stack>
      </Box>
      <Box px={{ base: '4', sm: '7' }} pb="8">
        <Box maxW="40rem" mx="auto">
          <Box as="article" pt="8">
            <BlogProse blocks={post.body} />
          </Box>
          <HStack
            justifyContent="space-between"
            gap="4"
            mt="8"
            pt="5"
            borderTopWidth="1px"
            borderColor="border"
          >
            <AuthorBlock author={post.author} />
            <CopyLinkButton />
          </HStack>
          {comments ? (
            <Box mt="8">
              <BlogComments comments={comments} onAddComment={onAddComment} />
            </Box>
          ) : null}
          {older || newer ? (
            <Box
              as="nav"
              aria-label="More posts"
              mt="8"
              display="grid"
              gap="3"
              gridTemplateColumns={{ base: '1fr', sm: '1fr 1fr' }}
            >
              {older ? (
                <Box gridColumn={{ sm: '1' }}>
                  <Anchor as={linkComponent} href={postHref(older)} className={cellLink}>
                    <styled.span textStyle="xs" color="fg.subtle">
                      ← Previous
                    </styled.span>
                    <styled.span textStyle="sm" fontWeight="medium">
                      {older.title}
                    </styled.span>
                  </Anchor>
                </Box>
              ) : null}
              {newer ? (
                <Box gridColumn={{ sm: '2' }} textAlign="end">
                  <Anchor as={linkComponent} href={postHref(newer)} className={cellLink}>
                    <styled.span textStyle="xs" color="fg.subtle">
                      Next →
                    </styled.span>
                    <styled.span textStyle="sm" fontWeight="medium">
                      {newer.title}
                    </styled.span>
                  </Anchor>
                </Box>
              ) : null}
            </Box>
          ) : null}
        </Box>
      </Box>
    </BlogLayout>
  )
}
