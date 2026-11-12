'use client'
import { useState } from 'react'
import { Button } from '../../components/ui'

export interface FollowButtonProps {
  following?: boolean
  onFollow?: (next: boolean) => Promise<void>
  labels: { off: string; on: string }
}

/** A toggle for following a topic or category; absent without `onFollow`. */
export function FollowButton({ following, onFollow, labels }: FollowButtonProps) {
  const [pending, setPending] = useState(false)
  if (!onFollow) return null
  return (
    <Button
      variant="outline"
      size="sm"
      aria-pressed={following ?? false}
      loading={pending}
      onClick={async () => {
        setPending(true)
        try {
          await onFollow(!following)
        } catch {
          // The page does not surface follow errors; the button keeps its state.
        } finally {
          setPending(false)
        }
      }}
    >
      {following ? labels.on : labels.off}
    </Button>
  )
}
