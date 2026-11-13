'use client'
import type { ForumCategoryPageProps } from '../types'
import { DiscussionsFeed } from './feed-page'

export function DiscussionsCategory(props: ForumCategoryPageProps) {
  return <DiscussionsFeed {...props} mode="category" />
}
