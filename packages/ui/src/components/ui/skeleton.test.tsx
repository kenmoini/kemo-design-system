import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { skeleton } from '../../theme/recipes/skeleton'
import { Skeleton, SkeletonCircle } from './skeleton'

describe('SkeletonCircle', () => {
  it('selects the circle variant, which Skeleton does not', () => {
    const { container } = render(
      <>
        <SkeletonCircle />
        <Skeleton />
      </>,
    )
    expect(container.children[0]).toHaveClass('skeleton--circle_true')
    expect(container.children[1]).not.toHaveClass('skeleton--circle_true')
  })

  it('keeps a full radius over the loading radius when both variants apply', () => {
    expect(skeleton.compoundVariants).toContainEqual({
      loading: true,
      circle: true,
      css: { borderRadius: 'full' },
    })
  })
})
