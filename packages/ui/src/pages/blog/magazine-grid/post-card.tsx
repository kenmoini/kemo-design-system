import { css } from '../../../../styled-system/css'
import { Box, Stack } from '../../../../styled-system/jsx'
import { Heading, Text } from '../../../components/ui'
import type { LinkComponent } from '../../auth/types'
import { BlogCover } from '../blog-cover'
import { HostLink } from '../host-link'
import { Byline, TopicBadge } from '../post-meta'
import type { BlogPost } from '../types'

// The title link covers its whole article (which is `position: relative`), so the card is one
// target without nesting controls.
export const cardLink = css({
  color: 'inherit',
  textDecoration: 'none',
  _before: { content: '""', position: 'absolute', inset: '0', borderRadius: 'l2' },
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: 'none', _before: { outline: '2px solid', outlineOffset: '2px' } },
})

export interface PostCardProps {
  post: BlogPost
  href: string
  linkComponent?: LinkComponent
  headingLevel: 'h2' | 'h3'
}

export function PostCard({ post, href, linkComponent, headingLevel }: PostCardProps) {
  return (
    <Box as="article" position="relative" display="flex" flexDirection="column" gap="3">
      <BlogCover post={post} aspectRatio="16 / 9" w="full" />
      <Stack gap="2" alignItems="flex-start">
        <TopicBadge topic={post.topic} />
        <Heading as={headingLevel} textStyle="md" letterSpacing="-0.01em" lineHeight="1.25">
          <HostLink as={linkComponent} href={href} className={cardLink}>
            {post.title}
          </HostLink>
        </Heading>
        <Text color="fg.muted" textStyle="sm">
          {post.summary}
        </Text>
        <Byline post={post} show={['avatar', 'author', 'shortDate']} />
      </Stack>
    </Box>
  )
}
