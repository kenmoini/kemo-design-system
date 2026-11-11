import type { ReactNode } from 'react'
import type { LinkComponent } from '../auth/types'

/** One FAQ entry; `id` becomes the question heading's anchor, `q-{id}`. */
export interface FaqQuestion {
  id: string
  question: string
  answer: ReactNode
}

/** A group of questions; `id` becomes the section anchor, `topic-{id}`. */
export interface FaqTopic {
  id: string
  label: string
  questions: FaqQuestion[]
}

export interface FaqPageProps {
  /** Default "Frequently asked questions". */
  title?: string
  description?: ReactNode
  topics: FaqTopic[]
  /** One outline action in the header: a link with `href`, else a button (inert without `onSelect`). */
  action?: { label: string; href?: string; onSelect?: () => void }
  linkComponent?: LinkComponent
}

export interface BlankPageProps {
  title: string
  context?: ReactNode
  /** One solid action in the header: a link with `href`, else a button (inert without `onSelect`). */
  action?: { label: string; href?: string; onSelect?: () => void }
  /** Default "Nothing here yet. Replace this area with your content." */
  emptyMessage?: string
  emptyAction?: { label: string; onSelect?: () => void }
  children?: ReactNode
}
