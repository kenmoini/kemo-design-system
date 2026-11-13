'use client'
import { useEffect, useRef, useState } from 'react'
import { Box, HStack, Stack, styled } from '../../../../styled-system/jsx'
import { Button, Text } from '../../../components/ui'
import { HostLink } from '../../blog/host-link'
import {
  abbreviate,
  firstParagraphText,
  formatCount,
  pageOf,
  replyCountOf,
  vocabulary,
} from '../content'
import { Crumbs } from '../crumbs'
import { FollowButton } from '../follow-button'
import { ForumLayout } from '../forum-layout'
import { Pager, usePager } from '../pager'
import { CategoryBadge, RelativeTime, StatusBadge, TagBadge } from '../parts'
import { ReplyComposer } from '../reply-composer'
import { ShareButton } from '../share-button'
import type { ForumPost, ForumTopicPageProps } from '../types'
import { BoardsPost } from './post'

const PAGE_SIZE = 10

interface Quoted {
  quoteOf: string
  quote: { author: ForumPost['author']; excerpt: string }
}

export function BoardsTopic(props: ForumTopicPageProps) {
  const { topic, category, linkComponent, now, viewer, onReply } = props
  const posts = topic.posts ?? []
  const { page, setPage, pageCount, range } = usePager(posts.length, PAGE_SIZE, topic.id)
  const visible = pageOf(posts, page, PAGE_SIZE)
  const replies = replyCountOf(topic)
  const composerRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [quoted, setQuoted] = useState<Quoted | null>(null)
  const categoryHref = props.categoryHref(category)
  // The post count when a reply went out (set before `onReply`, so it holds whichever comes first:
  // the promise or the longer topic); a longer topic then shows its last page.
  const replyFrom = useRef<number | null>(null)
  // The post to scroll to once its page shows: a new reply, or the `#post-{id}` of the address.
  const scrollTarget = useRef<string | null>(null)

  // A link to a post past the first page (Share copies `#post-{id}`) opens on that post's page.
  // Read once, after hydration: the server has no address fragment.
  useEffect(() => {
    const hash = window.location.hash
    if (!hash.startsWith('#post-')) return
    const id = decodeURIComponent(hash.slice('#post-'.length))
    const index = posts.findIndex((p) => p.id === id)
    if (index < 0) return
    scrollTarget.current = id
    setPage(Math.floor(index / PAGE_SIZE) + 1)
  }, [])

  // The reply came back in the topic: show the last page, where the new post is.
  useEffect(() => {
    const from = replyFrom.current
    const last = posts[posts.length - 1]
    if (from === null || posts.length <= from || !last) return
    replyFrom.current = null
    scrollTarget.current = last.id
    setPage(pageCount)
  }, [posts.length])

  useEffect(() => {
    const id = scrollTarget.current
    const target = id ? document.getElementById(`post-${id}`) : null
    if (!target) return
    scrollTarget.current = null
    if (typeof target.scrollIntoView === 'function') target.scrollIntoView({ block: 'start' })
  }, [page, posts.length])

  async function reply(body: string) {
    if (!onReply) return
    replyFrom.current = posts.length
    try {
      await onReply({ body, quoteOf: quoted?.quoteOf })
    } catch (cause) {
      replyFrom.current = null
      throw cause
    }
  }

  function focusComposer() {
    const field = composerRef.current
    if (!field) return
    if (typeof field.scrollIntoView === 'function') field.scrollIntoView({ block: 'center' })
    field.focus()
  }

  const postBar = (
    <HStack justify="space-between" gap="3" flexWrap="wrap">
      <Text textStyle="sm" color="fg.muted">
        Posts {range.from}–{range.to} of {posts.length}
      </Text>
      <Pager
        page={page}
        pageSize={PAGE_SIZE}
        total={posts.length}
        onPageChange={setPage}
        label="Posts"
      />
    </HStack>
  )

  return (
    <ForumLayout
      variant="boards"
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
      <Box maxW="62.5rem" mx="auto" px={{ base: '4', md: '7' }} py="7">
        <Stack gap="5">
          <Crumbs
            items={[
              { label: 'Boards', href: props.indexHref },
              { label: category.label, href: categoryHref },
              { label: topic.title },
            ]}
            linkComponent={linkComponent}
          />
          <Box
            display="flex"
            flexDirection={{ base: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ base: 'stretch', md: 'flex-start' }}
            gap="4"
          >
            <Box minW="0">
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
                {topic.tags.map((tag) => (
                  <TagBadge key={tag} tag={{ id: tag }} />
                ))}
                <span>
                  · {formatCount(replies)} {replies === 1 ? 'reply' : 'replies'} ·{' '}
                  {abbreviate(topic.viewCount)} views · started{' '}
                  <RelativeTime iso={topic.createdAt} now={now} /> by {topic.author.name}
                </span>
              </HStack>
            </Box>
            <HStack gap="2" flexShrink="0">
              <FollowButton
                following={topic.following}
                labels={{ off: vocabulary.boards.followOff, on: vocabulary.boards.followOn }}
                onFollow={props.onFollow ? (next) => props.onFollow!(topic.id, next) : undefined}
              />
              <ShareButton />
              {onReply ? (
                <Button size="sm" onClick={focusComposer}>
                  Reply
                </Button>
              ) : null}
            </HStack>
          </Box>
          {posts.length > 0 ? postBar : null}
          {posts.length === 0 ? (
            <Text color="fg.muted">No replies yet.</Text>
          ) : (
            <Box borderTopWidth="1px" borderColor="border">
              {visible.map((post, i) => (
                <BoardsPost
                  key={post.id}
                  post={post}
                  index={(page - 1) * PAGE_SIZE + i + 1}
                  topic={topic}
                  now={now}
                  onReact={props.onReact}
                  onQuote={
                    onReply
                      ? (p) => {
                          setQuoted({
                            quoteOf: p.id,
                            quote: { author: p.author, excerpt: firstParagraphText(p) },
                          })
                          focusComposer()
                        }
                      : undefined
                  }
                  onReply={onReply ? focusComposer : undefined}
                />
              ))}
            </Box>
          )}
          {posts.length > 0 ? postBar : null}
          {onReply ? (
            <ReplyComposer
              ref={composerRef}
              variant="boards"
              idPrefix="reply"
              heading="Reply to this topic"
              viewer={viewer}
              quote={quoted?.quote}
              onRemoveQuote={() => setQuoted(null)}
              onSubmit={reply}
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
    </ForumLayout>
  )
}
