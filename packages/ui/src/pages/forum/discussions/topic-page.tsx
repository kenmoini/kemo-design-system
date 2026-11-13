'use client'
import { useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { HostLink } from '../../blog/host-link'
import {
  groupReplies,
  participantsOf,
  relatedTopics,
  replyCountOf,
  vocabulary,
  formatCount,
} from '../content'
import { Crumbs } from '../crumbs'
import { FollowButton } from '../follow-button'
import { ForumLayout } from '../forum-layout'
import {
  CategoryBadge,
  Count,
  RelativeTime,
  StaffBadge,
  StatusBadge,
  TagBadge,
  UserAvatar,
} from '../parts'
import { PostBody } from '../post-body'
import { ReactionPills } from '../reactions'
import { ReplyComposer } from '../reply-composer'
import type { ForumPost, ForumTopicPageProps } from '../types'
import { RailHeading, railLink } from './rail'
import { DiscussionReply } from './reply'

type Sort = 'oldest' | 'top'
const sorts: { id: Sort; label: string }[] = [
  { id: 'oldest', label: 'Oldest' },
  { id: 'top', label: 'Top' },
]
const MAX_AVATARS = 8

function reactionTotal(post: ForumPost): number {
  return (post.reactions ?? []).reduce((n, r) => n + r.count, 0)
}

function byTime(a: ForumPost, b: ForumPost): number {
  return Date.parse(a.postedAt) - Date.parse(b.postedAt)
}

function plural(n: number, one: string, many: string): string {
  return `${formatCount(n)} ${n === 1 ? one : many}`
}

export function DiscussionsTopic(props: ForumTopicPageProps) {
  const { topic, category, linkComponent, now, viewer, onReply, onReact } = props
  const posts = topic.posts ?? []
  const [sort, setSort] = useState<Sort>('oldest')
  const [replyingTo, setReplyingTo] = useState<string | null>(null)
  const { original, replies } = groupReplies(posts)
  const ordered = [...replies].sort(
    (a, b) =>
      Number(b.post.accepted === true) - Number(a.post.accepted === true) ||
      (sort === 'top' ? reactionTotal(b.post) - reactionTotal(a.post) : 0) ||
      byTime(a.post, b.post),
  )
  const replyCount = replyCountOf(topic)
  const participants = participantsOf(topic)
  const related = relatedTopics(topic, props.related ?? [], 3)
  const categoryHref = props.categoryHref(category)
  const react =
    onReact &&
    ((postId: string) => (emoji: Parameters<typeof onReact>[1]) => onReact(postId, emoji))

  return (
    <ForumLayout
      variant="discussions"
      logo={props.logo}
      brand={props.brand}
      section={props.section}
      nav={props.nav}
      footer={props.footer}
      year={props.year}
      linkComponent={linkComponent}
      indexHref={props.indexHref}
      signInHref={props.signInHref}
      composerHref={props.composerHref}
      searchHref={props.searchHref}
      composerCategory={category}
    >
      <Box maxW="65rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Box
          display="grid"
          gap="6"
          gridTemplateColumns={{ base: '1fr', lg: '1fr 14.75rem' }}
          columnGap={{ lg: '9' }}
        >
          <Box minW="0">
            <Stack gap="5">
              <Crumbs
                items={[
                  { label: 'Discussions', href: props.indexHref },
                  { label: category.label, href: categoryHref },
                ]}
                linkComponent={linkComponent}
                currentIsLast={false}
              />
              <div>
                <styled.h1 textStyle="2xl" fontWeight="semibold" letterSpacing="-0.02em">
                  {topic.title}
                </styled.h1>
                <HStack gap="2" flexWrap="wrap" mt="2" textStyle="xs" color="fg.subtle">
                  <StatusBadge topic={topic} />
                  <CategoryBadge
                    category={category}
                    href={categoryHref}
                    linkComponent={linkComponent}
                  />
                  <HStack as="span" gap="1.5" flexWrap="wrap">
                    <span>·</span>
                    <UserAvatar user={topic.author} size="xs" />
                    <span>
                      {topic.author.name} started <RelativeTime iso={topic.createdAt} now={now} />
                      {' · '}
                      {plural(replyCount, 'reply', 'replies')} ·{' '}
                      {plural(participants.length, 'participant', 'participants')}
                    </span>
                  </HStack>
                </HStack>
              </div>
              {original ? (
                <Box borderWidth="1px" borderColor="border" borderRadius="l2" bg="gray.surface.bg">
                  <article id={`post-${original.id}`}>
                    <HStack
                      gap="2"
                      flexWrap="wrap"
                      px="5"
                      py="3"
                      borderBottomWidth="1px"
                      borderColor="border"
                      textStyle="sm"
                    >
                      <UserAvatar user={original.author} size="md" />
                      <styled.span fontWeight="semibold">{original.author.name}</styled.span>
                      {original.author.role === 'staff' ? <StaffBadge /> : null}
                      <styled.span color="fg.subtle" textStyle="xs">
                        <RelativeTime iso={original.postedAt} now={now} />
                        {original.editedAt ? ' · edited' : ''}
                      </styled.span>
                    </HStack>
                    <Box px="5" py="4">
                      <PostBody blocks={original.body} />
                    </Box>
                    <Box px="5" pb="4">
                      <ReactionPills
                        reactions={original.reactions}
                        onReact={react?.(original.id)}
                      />
                    </Box>
                  </article>
                </Box>
              ) : null}
              <HStack justify="space-between" gap="3" flexWrap="wrap">
                <styled.h2 textStyle="lg" fontWeight="semibold">
                  {plural(replyCount, 'reply', 'replies')}
                </styled.h2>
                <HStack role="group" aria-label="Sort replies" gap="2">
                  {sorts.map((s) => (
                    <Button
                      key={s.id}
                      size="sm"
                      variant={sort === s.id ? 'solid' : 'outline'}
                      aria-pressed={sort === s.id}
                      onClick={() => setSort(s.id)}
                    >
                      {s.label}
                    </Button>
                  ))}
                </HStack>
              </HStack>
              {ordered.length === 0 ? (
                <Text color="fg.muted">No replies yet.</Text>
              ) : (
                <styled.ul
                  aria-label="Replies"
                  m="0"
                  p="0"
                  display="flex"
                  flexDirection="column"
                  gap="6"
                >
                  {ordered.map(({ post, children }) => (
                    <DiscussionReply
                      key={post.id}
                      post={post}
                      topic={topic}
                      now={now}
                      onReact={onReact}
                      onReply={onReply ? () => setReplyingTo(post.id) : undefined}
                      composer={
                        onReply && replyingTo === post.id ? (
                          <ReplyComposer
                            variant="discussions"
                            kind="reply"
                            idPrefix={`reply-${post.id}`}
                            viewer={viewer}
                            autoFocus
                            onCancel={() => setReplyingTo(null)}
                            onSubmit={async (body) => {
                              await onReply({ body, parentId: post.id })
                              setReplyingTo(null)
                            }}
                          />
                        ) : undefined
                      }
                    >
                      {children}
                    </DiscussionReply>
                  ))}
                </styled.ul>
              )}
              {onReply ? (
                <ReplyComposer
                  variant="discussions"
                  kind="reply"
                  idPrefix="reply"
                  viewer={viewer}
                  onSubmit={(body) => onReply({ body })}
                />
              ) : (
                <Text color="fg.muted">
                  {props.signInHref ? (
                    <HostLink as={linkComponent} href={props.signInHref}>
                      Sign in
                    </HostLink>
                  ) : (
                    'Sign in'
                  )}{' '}
                  to reply.
                </Text>
              )}
            </Stack>
          </Box>
          <styled.aside aria-label="About this discussion" minW="0">
            <Stack gap="6">
              <section>
                <RailHeading>Category</RailHeading>
                <HStack justify="space-between" gap="2" textStyle="sm">
                  <HostLink as={linkComponent} href={categoryHref} className={railLink}>
                    {category.label}
                  </HostLink>
                  <styled.span color="fg.muted" textStyle="xs">
                    <Count value={category.topicCount} />
                  </styled.span>
                </HStack>
              </section>
              {topic.tags.length > 0 ? (
                <section>
                  <RailHeading>Labels</RailHeading>
                  <HStack gap="1.5" flexWrap="wrap">
                    {topic.tags.map((tag) => (
                      <TagBadge key={tag} tag={{ id: tag }} />
                    ))}
                  </HStack>
                </section>
              ) : null}
              <section>
                <RailHeading>{`Participants · ${participants.length}`}</RailHeading>
                <HStack as="ul" gap="1.5" flexWrap="wrap" m="0" p="0" listStyle="none">
                  {participants.slice(0, MAX_AVATARS).map((user) => (
                    <li key={user.id} title={user.name}>
                      <UserAvatar user={user} size="sm" />
                      <styled.span srOnly>{user.name}</styled.span>
                    </li>
                  ))}
                  {participants.length > MAX_AVATARS ? (
                    <styled.li listStyle="none" color="fg.muted" textStyle="xs">
                      +{participants.length - MAX_AVATARS}
                    </styled.li>
                  ) : null}
                </HStack>
              </section>
              {props.onFollow ? (
                <section>
                  <RailHeading>Notifications</RailHeading>
                  <FollowButton
                    following={topic.following}
                    labels={{
                      off: vocabulary.discussions.followOff,
                      on: vocabulary.discussions.followOn,
                    }}
                    onFollow={(next) => props.onFollow!(topic.id, next)}
                  />
                </section>
              ) : null}
              {related.length > 0 ? (
                <section>
                  <RailHeading>Related</RailHeading>
                  <styled.ul m="0" p="0">
                    {related.map((t) => (
                      <styled.li key={t.id} listStyle="none" py="1.5" textStyle="sm">
                        <HostLink as={linkComponent} href={props.topicHref(t)} className={railLink}>
                          {t.title}
                        </HostLink>
                        <styled.span display="block" color="fg.subtle" textStyle="xs">
                          <RelativeTime iso={t.lastActivityAt} now={now} />
                        </styled.span>
                      </styled.li>
                    ))}
                  </styled.ul>
                </section>
              ) : null}
            </Stack>
          </styled.aside>
        </Box>
      </Box>
    </ForumLayout>
  )
}
