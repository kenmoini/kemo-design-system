import { PinIcon } from 'lucide-react'
import { cva } from '../../../styled-system/css'
import { Box, styled } from '../../../styled-system/jsx'
import { Avatar, Badge } from '../../components/ui'
import type { LinkComponent } from '../auth/types'
import { HostLink } from '../blog/host-link'
import {
  abbreviate,
  absoluteTime,
  categoryAccent,
  formatCount,
  isSolved,
  relativeTime,
} from './content'
import type { ForumCategory, ForumTag, ForumTopic, ForumUser } from './types'

export function UserAvatar({ user, size }: { user: ForumUser; size: 'xs' | 'sm' | 'md' }) {
  return (
    <Avatar.Root size={size}>
      {user.avatarSrc ? <Avatar.Image src={user.avatarSrc} alt={user.name} /> : null}
      <Avatar.Fallback name={user.name} />
    </Avatar.Root>
  )
}

export function StaffBadge() {
  return (
    <Badge variant="solid" size="sm">
      Staff
    </Badge>
  )
}

export function AuthorBadge() {
  return (
    <Badge variant="subtle" size="sm">
      Author
    </Badge>
  )
}

export function StatusBadge({ topic }: { topic: ForumTopic }) {
  return (
    <>
      {isSolved(topic) ? (
        <Badge variant="subtle" size="sm" colorPalette="green">
          Solved
        </Badge>
      ) : null}
      {topic.status === 'needs-info' ? (
        <Badge variant="subtle" size="sm" colorPalette="amber">
          Needs info
        </Badge>
      ) : null}
      {topic.kind === 'announcement' ? (
        <Badge variant="subtle" size="sm" colorPalette="blue">
          Announcement
        </Badge>
      ) : null}
      {topic.pinned ? (
        <Badge variant="subtle" size="sm">
          <PinIcon size={12} aria-hidden="true" />
          Pinned
        </Badge>
      ) : null}
    </>
  )
}

interface LinkProps {
  href?: string
  linkComponent?: LinkComponent
}

export function CategoryBadge({
  category,
  href,
  linkComponent,
}: LinkProps & { category: ForumCategory }) {
  return (
    <Badge variant="subtle" size="sm">
      {href ? (
        <HostLink as={linkComponent} href={href}>
          {category.label}
        </HostLink>
      ) : (
        category.label
      )}
    </Badge>
  )
}

export function TagBadge({ tag, href, linkComponent }: LinkProps & { tag: ForumTag }) {
  return (
    <Badge variant="subtle" size="sm">
      {href ? (
        <HostLink as={linkComponent} href={href}>
          {tag.id}
        </HostLink>
      ) : (
        tag.id
      )}
    </Badge>
  )
}

export function RelativeTime({ iso, now, prefix }: { iso: string; now: string; prefix?: string }) {
  return (
    <time dateTime={iso} title={absoluteTime(iso)}>
      {prefix ? `${prefix} ` : ''}
      {relativeTime(iso, now)}
    </time>
  )
}

// A literal variant map keeps the six gradients statically extractable by Panda.
const accentFill = cva({
  variants: {
    accent: {
      1: { bgGradient: 'cover1' },
      2: { bgGradient: 'cover2' },
      3: { bgGradient: 'cover3' },
      4: { bgGradient: 'cover4' },
      5: { bgGradient: 'cover5' },
      6: { bgGradient: 'cover6' },
    },
  },
})

export function CategoryTile({ category }: { category: ForumCategory }) {
  return (
    <Box
      className={accentFill({ accent: categoryAccent(category) })}
      w="7"
      h="7"
      borderRadius="l2"
      display="grid"
      placeItems="center"
      textStyle="xs"
      fontWeight="semibold"
      color="white"
      aria-hidden="true"
    >
      {category.label.charAt(0)}
    </Box>
  )
}

export function AccentSquare({ category }: { category: ForumCategory }) {
  return (
    <Box
      className={accentFill({ accent: categoryAccent(category) })}
      w="2"
      h="2"
      borderRadius="l1"
      display="inline-block"
      aria-hidden="true"
    />
  )
}

export function Count({ value, abbreviate: short }: { value: number; abbreviate?: boolean }) {
  return (
    <styled.span fontVariantNumeric="tabular-nums">
      {short ? abbreviate(value) : formatCount(value)}
    </styled.span>
  )
}
