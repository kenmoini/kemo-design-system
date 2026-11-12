'use client'
import { useRef, useState } from 'react'
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
  const { page, setPage, range } = usePager(posts.length, PAGE_SIZE, topic.id)
  const visible = pageOf(posts, page, PAGE_SIZE)
  const replies = replyCountOf(topic)
  const composerRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)
  const [quoted, setQuoted] = useState<Quoted | null>(null)
  const [following, setFollowing] = useState(topic.following ?? false)
  const categoryHref = props.categoryHref(category)

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
                following={following}
                labels={{ off: vocabulary.boards.followOff, on: vocabulary.boards.followOn }}
                onFollow={
                  props.onFollow
                    ? async (next) => {
                        await props.onFollow!(topic.id, next)
                        setFollowing(next)
                      }
                    : undefined
                }
              />
              <ShareButton />
              {onReply ? (
                <Button size="sm" onClick={focusComposer}>
                  Reply
                </Button>
              ) : null}
            </HStack>
          </Box>
          {postBar}
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
              onSubmit={(body) => onReply({ body, quoteOf: quoted?.quoteOf })}
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
