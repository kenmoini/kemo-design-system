import { EditorialListIndex } from './editorial-list/index-page'
import { JournalRailIndex } from './journal-rail/index-page'
import { MagazineGridIndex } from './magazine-grid/index-page'
import type { BlogIndexPageProps } from './types'

/** The blog's index page in the variation chosen by `variant`. */
export function BlogIndexPage(props: BlogIndexPageProps) {
  switch (props.variant) {
    case 'editorial-list':
      return <EditorialListIndex {...props} />
    case 'magazine-grid':
      return <MagazineGridIndex {...props} />
    case 'journal-rail':
      return <JournalRailIndex {...props} />
  }
}
