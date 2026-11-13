'use client'
import type { ForumIndexPageProps } from '../types'
import { DiscussionsFeed } from './feed-page'

export function DiscussionsIndex(props: ForumIndexPageProps) {
  return <DiscussionsFeed {...props} mode="index" />
}
