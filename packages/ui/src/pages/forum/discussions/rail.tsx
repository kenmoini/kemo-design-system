import { css } from '../../../../styled-system/css'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import type { LinkComponent } from '../../auth/types'
import { HostLink } from '../../blog/host-link'
import { vocabulary } from '../content'
import { AccentSquare, Count, UserAvatar } from '../parts'
import type { ForumCategory, ForumUser } from '../types'

export const railLink = css({
  color: 'fg.default',
  textDecoration: 'none',
  _hover: { textDecoration: 'underline' },
  _focusVisible: { outline: '2px solid', outlineOffset: '2px', rounded: 'l1' },
})

export function RailHeading({ children }: { children: string }) {
  return (
    <styled.h2
      textStyle="xs"
      textTransform="uppercase"
      letterSpacing="0.04em"
      color="fg.subtle"
      mb="2"
    >
      {children}
    </styled.h2>
  )
}

export interface StartDiscussionProps {
  composerHref: string
  linkComponent?: LinkComponent
}

/** The Nightfall call to action; first in reading order below `lg`. */
export function StartDiscussion({ composerHref, linkComponent }: StartDiscussionProps) {
  return (
    <styled.section
      aria-labelledby="discussions-start"
      className="dark"
      colorScheme="dark"
      bgGradient="auth"
      borderRadius="l2"
      p="5"
      color="fg.default"
    >
      <styled.h2 id="discussions-start" textStyle="lg" fontWeight="semibold">
        Start a discussion
      </styled.h2>
      <Text color="fg.muted" textStyle="sm" mt="1" mb="4">
        Ask a question, share what you built or propose a change.
      </Text>
      <Button size="sm" asChild>
        <HostLink as={linkComponent} href={composerHref}>
          {vocabulary.discussions.primary}
        </HostLink>
      </Button>
    </styled.section>
  )
}

export interface DiscussionsRailProps {
  categories: ForumCategory[]
  current?: ForumCategory
  indexHref: string
  categoryHref: (category: ForumCategory) => string
  week: { topics: number; replies: number; solved: number }
  contributors: { user: ForumUser; count: number }[]
  linkComponent?: LinkComponent
}

/** Categories, this week and top contributors; after the feed in reading order. */
export function DiscussionsRail({
  categories,
  current,
  indexHref,
  categoryHref,
  week,
  contributors,
  linkComponent,
}: DiscussionsRailProps) {
  return (
    <styled.aside aria-label="Forum overview">
      <Stack gap="6">
        <nav aria-label="Categories" id="categories">
          <RailHeading>Categories</RailHeading>
          <styled.ul m="0" p="0">
            <CategoryItem
              href={indexHref}
              linkComponent={linkComponent}
              count={categories.reduce((n, c) => n + c.topicCount, 0)}
            >
              All
            </CategoryItem>
            {categories.map((c) => (
              <CategoryItem
                key={c.id}
                href={categoryHref(c)}
                linkComponent={linkComponent}
                count={c.topicCount}
                current={current?.id === c.id}
              >
                <AccentSquare category={c} />
                {c.label}
              </CategoryItem>
            ))}
          </styled.ul>
        </nav>
        <div>
          <RailHeading>This week</RailHeading>
          <Box display="grid" gridTemplateColumns="repeat(3, 1fr)" gap="2">
            {(
              [
                ['new topics', week.topics],
                ['replies', week.replies],
                ['solved', week.solved],
              ] as const
            ).map(([label, value]) => (
              <Box key={label} borderWidth="1px" borderColor="border" borderRadius="l2" p="2">
                <styled.b display="block" textStyle="lg" fontWeight="semibold">
                  <Count value={value} />
                </styled.b>
                <styled.span textStyle="xs" color="fg.muted">
                  {label}
                </styled.span>
              </Box>
            ))}
          </Box>
        </div>
        <div>
          <RailHeading>Top contributors</RailHeading>
          <styled.ul m="0" p="0">
            {contributors.map(({ user, count }) => (
              <styled.li
                key={user.id}
                listStyle="none"
                display="flex"
                alignItems="center"
                justifyContent="space-between"
                gap="2"
                py="1"
                textStyle="sm"
              >
                <HStack gap="2" minW="0">
                  <UserAvatar user={user} size="xs" />
                  <span>{user.name}</span>
                </HStack>
                <styled.span color="fg.muted" textStyle="xs">
                  {user.role === 'staff' ? 'Staff' : <Count value={count} />}
                </styled.span>
              </styled.li>
            ))}
          </styled.ul>
        </div>
      </Stack>
    </styled.aside>
  )
}

function CategoryItem({
  href,
  linkComponent,
  count,
  current = false,
  children,
}: {
  href: string
  linkComponent?: LinkComponent
  count: number
  current?: boolean
  children: React.ReactNode
}) {
  return (
    <styled.li listStyle="none">
      <HostLink
        as={linkComponent}
        href={href}
        aria-current={current ? 'page' : undefined}
        className={railLink}
      >
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap="2"
          px="2"
          py="1"
          borderRadius="l2"
          textStyle="sm"
          bg={current ? 'gray.surface.bg' : undefined}
          fontWeight={current ? 'medium' : undefined}
        >
          <HStack gap="2" minW="0">
            {children}
          </HStack>
          <styled.span color="fg.muted" textStyle="xs">
            <Count value={count} />
          </styled.span>
        </Box>
      </HostLink>
    </styled.li>
  )
}
