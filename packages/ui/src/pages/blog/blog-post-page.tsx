import { EditorialListPost } from './editorial-list/post-page'
import { JournalRailPost } from './journal-rail/post-page'
import { MagazineGridPost } from './magazine-grid/post-page'
import type { BlogPostPageProps } from './types'

/** A blog post page in the variation chosen by `variant`. */
export function BlogPostPage(props: BlogPostPageProps) {
  switch (props.variant) {
    case 'editorial-list':
      return <EditorialListPost {...props} />
    case 'magazine-grid':
      return <MagazineGridPost {...props} />
    case 'journal-rail':
      return <JournalRailPost {...props} />
  }
}
