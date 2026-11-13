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
// One band of the page: a column below `lg`; from `lg` the 14rem rail column and the main one.
const band = css({
  display: 'flex',
  flexDirection: 'column',
  gap: '6',
  lg: {
    display: 'grid',
    gridTemplateColumns: '14rem minmax(0, 1fr)',
    columnGap: '10',
    alignItems: 'start',
  },
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
      id: 'comments-section',
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
      {/* The DOM is the small-screen reading order, so Tab follows the page at every width: back
          link and details, the post, Copy link, comments. From `lg` two bands place them in the
          rail and main columns: the rail beside the post, then Copy link beside the comments. A
          sticky box stays inside its parent, so the rail follows the post down its band and comes
          to rest above Copy link where the post ends, rather than sliding over it. */}
      <Box
        maxW="72rem"
        mx="auto"
        px={{ base: '4', sm: '7' }}
        py={{ base: '6', lg: '8' }}
        display="flex"
        flexDirection="column"
        gap="6"
      >
        <div className={band}>
          <Box
            as="aside"
            display="flex"
            flexDirection="column"
            gap="6"
            lg={{ gridColumn: '1', position: 'sticky', top: '6' }}
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
          </Box>
          <Box minW="0" lg={{ gridColumn: '2' }}>
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
          </Box>
        </div>
        <div className={band}>
          <Box lg={{ gridColumn: '1' }}>
            <CopyLinkButton />
          </Box>
          {comments ? (
            <Box minW="0" lg={{ gridColumn: '2' }}>
              <BlogComments comments={comments} onAddComment={onAddComment} />
            </Box>
          ) : null}
        </div>
      </Box>
    </BlogLayout>
  )
}
