import type { ComponentProps } from 'react'
import { Box } from '../../../styled-system/jsx'
import { coverPreset } from './content'
import type { BlogCoverSpec, BlogPost } from './types'

type Preset = 1 | 2 | 3 | 4 | 5 | 6

export interface BlogCoverProps extends Omit<ComponentProps<typeof Box>, 'children'> {
  post?: BlogPost
  cover?: BlogCoverSpec
}

// Literal entries so Panda can extract each class.
const gradients: Record<Preset, ComponentProps<typeof Box>> = {
  1: { bgGradient: 'cover1' },
  2: { bgGradient: 'cover2' },
  3: { bgGradient: 'cover3' },
  4: { bgGradient: 'cover4' },
  5: { bgGradient: 'cover5' },
  6: { bgGradient: 'cover6' },
}

export function BlogCover({ post, cover, ...styleProps }: BlogCoverProps) {
  const spec = cover ?? post?.cover
  const preset: Preset | undefined =
    spec && 'preset' in spec ? spec.preset : spec ? undefined : post ? coverPreset(post) : 1

  return (
    <Box borderRadius="l2" overflow="hidden" position="relative" {...styleProps}>
      {spec && 'src' in spec ? (
        <img
          src={spec.src}
          alt={spec.alt}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
          }}
        />
      ) : (
        <Box
          aria-hidden="true"
          data-preset={preset}
          position="absolute"
          inset="0"
          {...gradients[preset ?? 1]}
        >
          <Box position="absolute" inset="0" bgGradient="coverStripes" />
        </Box>
      )}
    </Box>
  )
}
