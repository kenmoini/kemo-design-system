import { Box } from '../../../styled-system/jsx'
import { BlogProse } from '../blog/blog-prose'
import type { ForumBlock } from './types'

export function PostBody({ blocks }: { blocks: ForumBlock[] }) {
  return (
    <Box maxW="40rem">
      <BlogProse blocks={blocks} size="sm" />
    </Box>
  )
}
