import { Fragment, type ReactNode } from 'react'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Avatar, Badge, Text } from '../../components/ui'
import { formatDate, formatShortDate, readingLabel } from './content'
import type { BlogAuthor, BlogPost, BlogTopic } from './types'

export function TopicBadge({ topic }: { topic: BlogTopic }) {
  return (
    <Badge variant="subtle" size="sm">
      {topic.label}
    </Badge>
  )
}

export function PostDate({ iso, short }: { iso: string; short?: boolean }) {
  return <time dateTime={iso}>{short ? formatShortDate(iso) : formatDate(iso)}</time>
}

type BylinePart = 'avatar' | 'author' | 'date' | 'shortDate' | 'reading'

const defaultParts: BylinePart[] = ['avatar', 'author', 'date', 'reading']

export function Byline({ post, show = defaultParts }: { post: BlogPost; show?: BylinePart[] }) {
  const parts: ReactNode[] = []
  for (const part of show) {
    if (part === 'avatar') {
      parts.push(
        <Avatar.Root key={part} w="4" h="4" fontSize="2xs" aria-hidden="true">
          {post.author.avatarSrc ? <Avatar.Image src={post.author.avatarSrc} alt="" /> : null}
          <Avatar.Fallback name={post.author.name} />
        </Avatar.Root>,
      )
    } else if (part === 'author') parts.push(<span key={part}>{post.author.name}</span>)
    else if (part === 'date') parts.push(<PostDate key={part} iso={post.publishedAt} />)
    else if (part === 'shortDate') parts.push(<PostDate key={part} iso={post.publishedAt} short />)
    else parts.push(<span key={part}>{readingLabel(post.readingMinutes)}</span>)
  }
  return (
    <HStack gap="1.5" flexWrap="wrap" textStyle="xs" color="fg.subtle">
      {parts.map((node, i) => (
        <Fragment key={show[i]}>
          {i > 0 && show[i - 1] !== 'avatar' ? (
            <Box as="span" aria-hidden="true">
              ·
            </Box>
          ) : null}
          {node}
        </Fragment>
      ))}
    </HStack>
  )
}

export function AuthorBlock({ author, detail }: { author: BlogAuthor; detail?: ReactNode }) {
  const sub = detail ?? author.role
  return (
    <HStack gap="3">
      <Avatar.Root w="8" h="8" fontSize="xs" aria-hidden="true">
        {author.avatarSrc ? <Avatar.Image src={author.avatarSrc} alt="" /> : null}
        <Avatar.Fallback name={author.name} />
      </Avatar.Root>
      <Stack gap="0">
        <styled.span textStyle="sm" fontWeight="medium">
          {author.name}
        </styled.span>
        {sub ? (
          <Text textStyle="xs" color="fg.subtle">
            {sub}
          </Text>
        ) : null}
      </Stack>
    </HStack>
  )
}
