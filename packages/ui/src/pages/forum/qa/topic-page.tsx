'use client'
import { CheckIcon } from 'lucide-react'
import { useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { HostLink } from '../../blog/host-link'
import { abbreviate, groupReplies, hotTags, relatedTopics } from '../content'
import { Crumbs } from '../crumbs'
import { RailHeading, railLink } from '../discussions/rail'
import { ForumLayout } from '../forum-layout'
import { RelativeTime, StatusBadge, TagBadge } from '../parts'
import { ReplyComposer } from '../reply-composer'
import type { ForumPost, ForumTopicPageProps } from '../types'
import { QaAnswer } from './answer'
import { QuestionCell } from './question-cell'

type Sort = 'votes' | 'oldest' | 'newest'
const sorts: { id: Sort; label: string }[] = [
  { id: 'votes', label: 'Votes' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'newest', label: 'Newest' },
]

function time(post: ForumPost): number {
  return Date.parse(post.postedAt)
}

function compare(sort: Sort, a: ForumPost, b: ForumPost): number {
  if (sort === 'newest') return time(b) - time(a)
  if (sort === 'votes') return (b.votes?.score ?? 0) - (a.votes?.score ?? 0) || time(a) - time(b)
  return time(a) - time(b)
}

function MetaItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <span>
      {label}{' '}
      <styled.span color="fg.default" fontWeight="medium">
        {children}
      </styled.span>
    </span>
  )
}

export function QaTopic(props: ForumTopicPageProps) {
  const { topic, category, linkComponent, now, viewer, onReply } = props
  const [sort, setSort] = useState<Sort>('votes')
  const [commentingOn, setCommentingOn] = useState<string | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const { original, originalChildren, replies } = groupReplies(topic.posts ?? [])
  const ordered = [...replies].sort(
    (a, b) =>
      Number(b.post.accepted === true) - Number(a.post.accepted === true) ||
      compare(sort, a.post, b.post),
  )
  const answers = replies.length
  const categoryHref = props.categoryHref(category)
  const related = relatedTopics(topic, props.related ?? [], 4)
  const docs = props.docs ?? []
  const tags = props.searchHref ? hotTags([topic, ...(props.related ?? [])], 5) : []

  const shared = {
    topic,
    now,
    viewer,
    onVote: props.onVote,
    onReply:
      onReply &&
      (async (input: { body: string; parentId?: string }) => {
        await onReply(input)
        setAnnouncement('Comment posted.')
      }),
    onFollow: props.onFollow,
  }
  const comment = (id: string) => ({
    commentOpen: commentingOn === id,
    onOpenComment: () => {
      setAnnouncement('')
      setCommentingOn(id)
    },
    onCloseComment: () => setCommentingOn((current) => (current === id ? null : current)),
  })

  return (
    <ForumLayout
      variant="qa"
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
      navigate={props.navigate}
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
              <styled.p srOnly role="status" aria-live="polite">
                {announcement}
              </styled.p>
              <Crumbs
                items={[
                  { label: 'Questions', href: props.indexHref },
                  { label: category.label, href: categoryHref },
                ]}
                linkComponent={linkComponent}
                currentIsLast={false}
              />
              <div>
                <styled.h1 textStyle="2xl" fontWeight="semibold" letterSpacing="-0.02em">
                  {topic.title}
                </styled.h1>
                <HStack gap="4" flexWrap="wrap" mt="2" textStyle="xs" color="fg.subtle">
                  <MetaItem label="Asked">
                    <RelativeTime iso={topic.createdAt} now={now} />
                  </MetaItem>
                  <MetaItem label="Modified">
                    <RelativeTime iso={topic.lastActivityAt} now={now} />
                  </MetaItem>
                  <MetaItem label="Viewed">{abbreviate(topic.viewCount)}</MetaItem>
                  <StatusBadge topic={topic} />
                </HStack>
              </div>
              {original ? (
                <QaAnswer post={original} role="question" {...shared} {...comment(original.id)}>
                  {originalChildren}
                </QaAnswer>
              ) : null}
              <HStack justify="space-between" gap="3" flexWrap="wrap">
                <styled.h2 textStyle="lg" fontWeight="semibold">
                  {answers} {answers === 1 ? 'answer' : 'answers'}
                </styled.h2>
                <HStack role="group" aria-label="Sort answers" gap="2">
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
                <Text color="fg.muted">No answers yet.</Text>
              ) : (
                <styled.ul
                  aria-label="Answers"
                  m="0"
                  p="0"
                  display="flex"
                  flexDirection="column"
                  gap="6"
                >
                  {ordered.map(({ post, children }) => {
                    const accepted = post.accepted === true
                    const answer = (
                      <QaAnswer
                        post={post}
                        role="answer"
                        {...shared}
                        {...comment(post.id)}
                        onAccept={props.onAcceptAnswer}
                      >
                        {children}
                      </QaAnswer>
                    )
                    return (
                      <styled.li key={post.id} listStyle="none">
                        {accepted ? (
                          <>
                            <HStack
                              gap="1.5"
                              mb="2"
                              textStyle="sm"
                              color="green.11"
                              fontWeight="medium"
                            >
                              <CheckIcon size={14} aria-hidden="true" />
                              <span>Accepted answer</span>
                            </HStack>
                            <Box
                              borderWidth="1px"
                              borderColor="green.6"
                              bg="green.2"
                              borderRadius="l2"
                              p="4"
                            >
                              {answer}
                            </Box>
                          </>
                        ) : (
                          answer
                        )}
                      </styled.li>
                    )
                  })}
                </styled.ul>
              )}
              {onReply ? (
                <Stack gap="3">
                  <styled.h2 textStyle="lg" fontWeight="semibold">
                    Your answer
                  </styled.h2>
                  <ReplyComposer
                    variant="qa"
                    kind="reply"
                    idPrefix="answer"
                    viewer={viewer}
                    onSubmit={(body) => onReply({ body })}
                  />
                </Stack>
              ) : (
                <Text color="fg.muted">
                  {props.signInHref ? (
                    <HostLink as={linkComponent} href={props.signInHref}>
                      Sign in
                    </HostLink>
                  ) : (
                    'Sign in'
                  )}{' '}
                  to answer.
                </Text>
              )}
            </Stack>
          </Box>
          <styled.aside aria-label="About this question" minW="0">
            <Stack gap="6">
              {related.length > 0 ? (
                <section aria-labelledby="qa-related">
                  <RailHeading id="qa-related">Related questions</RailHeading>
                  <styled.ul m="0" p="0">
                    {related.map((t) => (
                      <QuestionCell
                        key={t.id}
                        topic={t}
                        href={props.topicHref(t)}
                        linkComponent={linkComponent}
                        now={now}
                        trailing="votes"
                      />
                    ))}
                  </styled.ul>
                </section>
              ) : null}
              {docs.length > 0 ? (
                <section aria-labelledby="qa-docs">
                  <RailHeading id="qa-docs">Linked docs</RailHeading>
                  <styled.ul m="0" p="0">
                    {docs.map((doc) => (
                      <styled.li key={doc.href} listStyle="none" py="1.5" textStyle="sm">
                        <HostLink as={linkComponent} href={doc.href} className={railLink}>
                          {doc.label}
                        </HostLink>
                        {doc.description ? (
                          <styled.span display="block" color="fg.subtle" textStyle="xs">
                            {doc.description}
                          </styled.span>
                        ) : null}
                      </styled.li>
                    ))}
                  </styled.ul>
                </section>
              ) : null}
              {tags.length > 0 ? (
                <section aria-labelledby="qa-tags">
                  <RailHeading id="qa-tags">Hot tags</RailHeading>
                  <HStack gap="1.5" flexWrap="wrap">
                    {tags.map((tag) => (
                      <TagBadge
                        key={tag}
                        tag={{ id: tag }}
                        href={props.searchHref!(tag)}
                        linkComponent={linkComponent}
                      />
                    ))}
                  </HStack>
                </section>
              ) : null}
            </Stack>
          </styled.aside>
        </Box>
      </Box>
    </ForumLayout>
  )
}
