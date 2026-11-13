import { BoardsTopic } from './boards/topic-page'
import { DiscussionsTopic } from './discussions/topic-page'
import { QaTopic } from './qa/topic-page'
import type { ForumTopicPageProps } from './types'

/** The forum's topic page in the variation chosen by `variant`. */
export function ForumTopicPage(props: ForumTopicPageProps) {
  switch (props.variant) {
    case 'boards':
      return <BoardsTopic {...props} />
    case 'discussions':
      return <DiscussionsTopic {...props} />
    case 'qa':
      return <QaTopic {...props} />
  }
}
