import type { BlogAuthor, BlogBlock, BlogPost, BlogTopic } from './types'

const engineering: BlogTopic = { id: 'engineering', label: 'Engineering' }
const releases: BlogTopic = { id: 'releases', label: 'Releases' }
const incidents: BlogTopic = { id: 'incidents', label: 'Incidents' }
const design: BlogTopic = { id: 'design', label: 'Design' }

const priya: BlogAuthor = {
  id: 'priya',
  name: 'Priya Raman',
  role: 'Staff engineer, Console platform',
}
const jonas: BlogAuthor = { id: 'jonas', name: 'Jonas Lindqvist', role: 'Design lead' }
const thandi: BlogAuthor = { id: 'thandi', name: 'Thandi Nkosi', role: 'Site reliability' }

const para = (text: string): BlogBlock => ({ type: 'paragraph', content: text })

const shortBody: BlogBlock[] = [
  para('A short body, enough to render a post page.'),
  { type: 'heading', level: 2, text: 'The detail' },
  para('Another paragraph with the substance of the post.'),
]

const coldStartBody: BlogBlock[] = [
  para('Opening a cluster used to take a little over four seconds on a cold cache.'),
  { type: 'heading', level: 2, text: 'Where the time went' },
  para('We traced a thousand cold loads and found one request per resource kind, in sequence.'),
  { type: 'heading', level: 3, text: 'The discovery calls' },
  para('Thirty-eight of them, one after another.'),
  { type: 'heading', level: 2, text: 'What changed' },
  para('One aggregated discovery document, cached per cluster.'),
]

export const testPosts: BlogPost[] = [
  {
    slug: 'cold-start',
    title: 'How we cut cold-start time for cluster consoles by 62%',
    summary:
      'A year of profiling, one N+1 against the API server, and the caching layer we should have built first.',
    topic: engineering,
    author: priya,
    publishedAt: '2026-11-11T09:00:00Z',
    readingMinutes: 9,
    featured: true,
    cover: { preset: 1 },
    body: coldStartBody,
  },
  {
    slug: 'console-4-2',
    title: 'Console 4.2: schema-aware YAML editing',
    summary: 'The editor now reads your cluster’s CRDs and completes fields as you type.',
    topic: releases,
    author: jonas,
    publishedAt: '2026-11-04T09:00:00Z',
    readingMinutes: 5,
    cover: { preset: 2 },
    body: shortBody,
  },
  {
    slug: 'october-outage',
    title: 'What the October API outage taught us',
    summary: 'A certificate rotation, a missed alert and forty minutes of read-only consoles.',
    topic: incidents,
    author: thandi,
    publishedAt: '2026-10-22T09:00:00Z',
    readingMinutes: 7,
    cover: { preset: 3 },
    body: shortBody,
  },
  {
    slug: 'tokens-first',
    title: 'Design tokens before components',
    summary: 'Why our palette, radii and gradients exist before the first button does.',
    topic: design,
    author: jonas,
    publishedAt: '2026-10-08T09:00:00Z',
    readingMinutes: 6,
    cover: { preset: 4 },
    body: shortBody,
  },
  {
    slug: 'watch-bookmarks',
    title: 'Resuming watches with bookmarks',
    summary: 'Cheaper reconnects for long-lived resource streams.',
    topic: engineering,
    author: priya,
    publishedAt: '2026-10-01T09:00:00Z',
    readingMinutes: 8,
    cover: { preset: 5 },
    body: shortBody,
  },
  {
    slug: 'console-4-1',
    title: 'Console 4.1: saved views and faster tables',
    summary: 'Pin a filter, share it with the team, scroll ten thousand rows.',
    topic: releases,
    author: jonas,
    publishedAt: '2026-09-24T09:00:00Z',
    readingMinutes: 4,
    body: shortBody,
  },
  {
    slug: 'virtual-tables',
    title: 'Virtualising a table without losing find-in-page',
    summary: 'Windowing the rows while keeping the browser’s search useful.',
    topic: engineering,
    author: priya,
    publishedAt: '2026-09-16T09:00:00Z',
    readingMinutes: 10,
    body: shortBody,
  },
  {
    slug: 'rbac-explained',
    title: 'Reading RBAC without a diagram',
    summary: 'A plain-language walk through roles, bindings and what they allow.',
    topic: engineering,
    author: thandi,
    publishedAt: '2026-09-09T09:00:00Z',
    readingMinutes: 6,
    body: shortBody,
  },
]

export const chrome = {
  brand: 'Kemo',
  indexHref: '/blog',
  postHref: (p: BlogPost) => '/blog/' + p.slug,
}
