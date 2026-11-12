'use client'
import { css } from '../../../../styled-system/css'
import { Box, Stack, styled } from '../../../../styled-system/jsx'
import { Text } from '../../../components/ui'
import { BlogComments } from '../blog-comments'
import { BlogLayout } from '../blog-layout'
import { BlogProse } from '../blog-prose'
import { adjacentPosts, countComments, formatDate, sortPosts, tocOf } from '../content'
import { CopyLinkButton } from '../copy-link-button'
import { HostLink } from '../host-link'
import { TopicBadge } from '../post-meta'
import type { BlogPostPageProps } from '../types'
import { OnThisPage, type OnThisPageItem } from './on-this-page'

const link = css({
  textStyle: 'sm',
  color: 'fg.muted',
  textDecoration: 'none',
  rounded: 'l1',
  _hover: { color: 'fg.default' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px' },
})

export function JournalRailPost({
  post,
  posts,
  indexTitle,
  comments,
  onAddComment,
  ...chrome
}: BlogPostPageProps) {
  const { older } = adjacentPosts(sortPosts(posts), post.slug)
  const { indexHref, postHref, linkComponent } = chrome

  const items: OnThisPageItem[] = tocOf(post.body)
  if (comments) {
    items.push({
      id: 'comments',
      text: 'Comments',
      level: 2,
      suffix: String(countComments(comments)),
    })
  }

  // The host's footer wins; the older-post link only fills an empty slot.
  const footer =
    chrome.footer !== undefined ? (
      chrome.footer
    ) : older ? (
      <HostLink as={linkComponent} href={postHref(older)} className={link}>
        ← {older.title}
      </HostLink>
    ) : undefined

  const details: [string, string][] = [
    ['Author', post.author.name],
    ['Published', formatDate(post.publishedAt)],
    ['Topic', post.topic.label],
    ['Reading', `${post.readingMinutes} min`],
  ]

  return (
    <BlogLayout {...chrome} footer={footer} hideSubscribe>
      <Box
        maxW="72rem"
        mx="auto"
        px={{ base: '4', sm: '7' }}
        py={{ base: '6', lg: '8' }}
        display="flex"
        flexDirection="column"
        gap="6"
        lg={{ display: 'grid', gridTemplateColumns: '14rem 1fr', gap: '10', alignItems: 'start' }}
      >
        {/* Below lg the rail dissolves into the column: details above the title, Copy link after. */}
        <Box
          as="aside"
          display={{ base: 'contents', lg: 'flex' }}
          flexDirection="column"
          gap="6"
          lg={{ position: 'sticky', top: '6' }}
        >
          <Box>
            <HostLink as={linkComponent} href={indexHref} className={link}>
              ← {indexTitle ?? 'All posts'}
            </HostLink>
          </Box>
          {items.length > 0 ? (
            <Box display={{ base: 'none', lg: 'block' }}>
              <OnThisPage items={items} />
            </Box>
          ) : null}
          <Box>
            <styled.h2 textStyle="xs" color="fg.subtle" mb="2">
              Details
            </styled.h2>
            <styled.dl
              m="0"
              display="grid"
              gridTemplateColumns="auto 1fr"
              columnGap="4"
              rowGap="1.5"
              textStyle="sm"
            >
              {details.map(([term, value]) => (
                <Box key={term} display="contents">
                  <styled.dt color="fg.subtle">{term}</styled.dt>
                  <styled.dd m="0">{value}</styled.dd>
                </Box>
              ))}
            </styled.dl>
          </Box>
          <Box order={{ base: 2, lg: 0 }}>
            <CopyLinkButton />
          </Box>
        </Box>
        <Box order={{ base: 1, lg: 0 }} minW="0">
          <Stack gap="4" alignItems="flex-start" maxW="40rem">
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
          </Stack>
          <Box maxW="40rem" mt="6" pt="6" borderTopWidth="1px" borderColor="border">
            <Box as="article">
              <BlogProse blocks={post.body} />
            </Box>
          </Box>
          {comments ? <BlogComments comments={comments} onAddComment={onAddComment} /> : null}
        </Box>
      </Box>
    </BlogLayout>
  )
}
