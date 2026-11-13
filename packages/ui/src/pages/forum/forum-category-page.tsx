import { BoardsCategory } from './boards/category-page'
import { DiscussionsCategory } from './discussions/category-page'
import { QaCategory } from './qa/category-page'
import type { ForumCategoryPageProps } from './types'

/** The forum's category page in the variation chosen by `variant`. */
export function ForumCategoryPage(props: ForumCategoryPageProps) {
  switch (props.variant) {
    case 'boards':
      return <BoardsCategory {...props} />
    case 'discussions':
      return <DiscussionsCategory {...props} />
    case 'qa':
      return <QaCategory {...props} />
  }
}
