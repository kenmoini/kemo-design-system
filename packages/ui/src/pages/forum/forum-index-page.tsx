import { BoardsIndex } from './boards/index-page'
import { DiscussionsIndex } from './discussions/index-page'
import { QaIndex } from './qa/index-page'
import type { ForumIndexPageProps } from './types'

/** The forum's index page in the variation chosen by `variant`. */
export function ForumIndexPage(props: ForumIndexPageProps) {
  switch (props.variant) {
    case 'boards':
      return <BoardsIndex {...props} />
    case 'discussions':
      return <DiscussionsIndex {...props} />
    case 'qa':
      return <QaIndex {...props} />
  }
}
