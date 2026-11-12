'use client'
import { useCallback, useMemo, useState } from 'react'
import { filterByTopic, sortPosts, topicsOf } from './content'
import type { BlogPost, BlogTopic } from './types'

interface TopicFilterOptions {
  topic?: string
  defaultTopic?: string
  onTopicChange?: (id: string | undefined) => void
}

/**
 * Sorts posts, lists their topics and filters by one. Controlled exactly when `onTopicChange` is
 * passed and the `topic` key is present (even as `undefined`, meaning "all"); otherwise it keeps
 * its own state, starting at `defaultTopic`.
 */
export function useTopicFilter(posts: BlogPost[], opts: TopicFilterOptions) {
  const { onTopicChange, defaultTopic } = opts
  const controlled = onTopicChange !== undefined && 'topic' in opts
  const [inner, setInner] = useState<string | undefined>(defaultTopic)
  const topic = controlled ? opts.topic : inner

  const sorted = useMemo(() => sortPosts(posts), [posts])
  const topics = useMemo<BlogTopic[]>(() => topicsOf(sorted), [sorted])
  const visible = useMemo(() => filterByTopic(sorted, topic), [sorted, topic])
  const topicLabel = topic === undefined ? undefined : topics.find((t) => t.id === topic)?.label

  const setTopic = useCallback(
    (id: string | undefined) => {
      if (!controlled) setInner(id)
      onTopicChange?.(id)
    },
    [controlled, onTopicChange],
  )

  return { sorted, topics, topic, topicLabel, visible, setTopic }
}
