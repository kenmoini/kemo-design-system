'use client'
import { useEffect, useId, useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Badge, Button, Heading, Text } from '../../../components/ui'
import { BlogComments } from '../blog-comments'
import { BlogCover } from '../blog-cover'
import { BlogLayout } from '../blog-layout'
import { BlogProse } from '../blog-prose'
import { readingLabel, relatedPosts, sortPosts } from '../content'
import { CopyLinkButton } from '../copy-link-button'
import { AuthorBlock, PostDate, TopicBadge } from '../post-meta'
import type { BlogPostPageProps } from '../types'
import { PostCard } from './post-card'

export function MagazineGridPost({
  post,
  posts,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- kept out of the layout props
  indexTitle: _indexTitle,
  comments,
  onAddComment,
  ...chrome
}: BlogPostPageProps) {
  const { postHref, linkComponent } = chrome
  const related = relatedPosts(sortPosts(posts), post, 3)
  const keepReadingId = useId()
  // `navigator.share` is only known in the browser, so it is checked after mount.
  const [canShare, setCanShare] = useState(false)
  useEffect(() => setCanShare(typeof navigator.share === 'function'), [])

  async function share() {
    try {
      await navigator.share({ title: post.title, url: window.location.href })
    } catch {
      // A cancelled or refused share is not an error worth showing.
    }
  }

  return (
    <BlogLayout {...chrome}>
      <Box px={{ base: '4', sm: '7' }} pt={{ base: '8', md: '10' }} pb="8">
        <Stack maxW="48rem" mx="auto" gap="4" alignItems="center" textAlign="center">
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
          <AuthorBlock
            author={post.author}
            detail={
              <>
                <PostDate iso={post.publishedAt} /> · {readingLabel(post.readingMinutes)}
              </>
            }
          />
        </Stack>
        <BlogCover
          post={post}
          maxW="72rem"
          mx="auto"
          mt="8"
          w="full"
          aspectRatio="3 / 1"
          minH="40"
        />
        {/* The reading column: prose, tags row and comments share one centred 40rem column. */}
        <Box maxW="40rem" mx="auto">
          <Box as="article" pt="8">
            <BlogProse blocks={post.body} />
          </Box>
          <HStack
            justifyContent="space-between"
            alignItems="center"
            gap="4"
            flexWrap="wrap"
            mt="8"
            pt="5"
            borderTopWidth="1px"
            borderColor="border"
          >
            {post.tags && post.tags.length > 0 ? (
              <styled.ul aria-label="Tags" display="flex" gap="2" flexWrap="wrap" m="0" p="0">
                {post.tags.map((tag) => (
                  <styled.li key={tag} listStyleType="none">
                    <Badge variant="outline" size="sm">
                      {tag}
                    </Badge>
                  </styled.li>
                ))}
              </styled.ul>
            ) : (
              <span />
            )}
            <HStack gap="2">
              <CopyLinkButton />
              {canShare ? (
                <Button variant="outline" size="sm" onClick={share}>
                  Share
                </Button>
              ) : null}
            </HStack>
          </HStack>
          {comments ? (
            <Box mt="8">
              <BlogComments comments={comments} onAddComment={onAddComment} />
            </Box>
          ) : null}
        </Box>
        {related.length > 0 ? (
          <Box as="section" aria-labelledby={keepReadingId} maxW="72rem" mx="auto" mt="10">
            <Heading as="h2" id={keepReadingId} textStyle="xl" letterSpacing="-0.02em" mb="5">
              Keep reading
            </Heading>
            <Box
              as="ul"
              m="0"
              p="0"
              display="grid"
              gap="6"
              gridTemplateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
              listStyleType="none"
            >
              {related.map((p) => (
                <li key={p.slug}>
                  <PostCard
                    post={p}
                    href={postHref(p)}
                    linkComponent={linkComponent}
                    headingLevel="h3"
                  />
                </li>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>
    </BlogLayout>
  )
}
