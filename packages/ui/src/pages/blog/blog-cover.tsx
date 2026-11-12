import type { ComponentProps } from 'react'
import { cva } from '../../../styled-system/css'
import { Box, styled } from '../../../styled-system/jsx'
import { coverPreset } from './content'
import type { BlogCoverSpec, BlogPost } from './types'

type Preset = 1 | 2 | 3 | 4 | 5 | 6

export interface BlogCoverProps extends Omit<ComponentProps<typeof Box>, 'children'> {
  post?: BlogPost
  cover?: BlogCoverSpec
}

// Literal variant entries so Panda can extract each gradient class.
const presetStyle = cva({
  variants: {
    preset: {
      1: { bgGradient: 'cover1' },
      2: { bgGradient: 'cover2' },
      3: { bgGradient: 'cover3' },
      4: { bgGradient: 'cover4' },
      5: { bgGradient: 'cover5' },
      6: { bgGradient: 'cover6' },
    },
  },
})

export function BlogCover({ post, cover, ...styleProps }: BlogCoverProps) {
  const spec = cover ?? post?.cover
  const preset: Preset | undefined =
    spec && 'preset' in spec ? spec.preset : spec ? undefined : post ? coverPreset(post) : 1

  return (
    <Box borderRadius="l2" overflow="hidden" position="relative" {...styleProps}>
      {spec && 'src' in spec ? (
        <styled.img
          src={spec.src}
          alt={spec.alt}
          position="absolute"
          inset="0"
          w="full"
          h="full"
          objectFit="cover"
        />
      ) : (
        <Box
          aria-hidden="true"
          data-preset={preset}
          position="absolute"
          inset="0"
          className={presetStyle({ preset: preset ?? 1 })}
        >
          <Box position="absolute" inset="0" bgGradient="coverStripes" />
        </Box>
      )}
    </Box>
  )
}
