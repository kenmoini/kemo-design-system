'use client'
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Box, Stack, styled } from '../../../styled-system/jsx'
import { IconButton } from '../../components/ui'
import type { VoteDirection } from './types'

export interface VoteColumnProps {
  score: number
  viewer?: 'up' | 'down'
  onVote?: (direction: VoteDirection) => Promise<void>
  accepted?: boolean
  onAccept?: () => Promise<void>
  /** The accept button's name while not accepted (default "Accept this answer"). */
  acceptName?: string
}

/** The Q&A vote arrows, score and accepted mark; each control renders only with its callback. */
export function VoteColumn({
  score,
  viewer,
  onVote,
  accepted,
  onAccept,
  acceptName,
}: VoteColumnProps) {
  const [pending, setPending] = useState(false)
  // Read synchronously, so a second press in the same tick is ignored too.
  const busy = useRef(false)

  // The controls stay enabled while a vote is saved (a disabled button would drop keyboard focus to
  // the page): they say so with `aria-disabled`, and a press meanwhile is ignored.
  async function run(action: () => Promise<void>) {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try {
      await action()
    } catch {
      // The page does not surface vote errors.
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <Stack alignItems="center" gap="1">
      {onVote ? (
        <IconButton
          variant="plain"
          size="xs"
          aria-label={`Upvote, score ${score}`}
          aria-pressed={viewer === 'up'}
          aria-disabled={pending || undefined}
          onClick={() => run(() => onVote(viewer === 'up' ? null : 'up'))}
        >
          <ChevronUpIcon />
        </IconButton>
      ) : null}
      <styled.span textStyle="md" fontWeight="semibold" fontVariantNumeric="tabular-nums">
        {score}
      </styled.span>
      {onVote ? (
        <IconButton
          variant="plain"
          size="xs"
          aria-label="Downvote"
          aria-pressed={viewer === 'down'}
          aria-disabled={pending || undefined}
          onClick={() => run(() => onVote(viewer === 'down' ? null : 'down'))}
        >
          <ChevronDownIcon />
        </IconButton>
      ) : null}
      {onAccept ? (
        <IconButton
          size="xs"
          borderRadius="full"
          variant={accepted ? 'solid' : 'outline'}
          colorPalette="green"
          aria-label={accepted ? 'Accepted answer' : (acceptName ?? 'Accept this answer')}
          aria-pressed={accepted ?? false}
          aria-disabled={pending || undefined}
          onClick={() => run(onAccept)}
        >
          <CheckIcon />
        </IconButton>
      ) : accepted ? (
        <Box
          role="img"
          aria-label="Accepted answer"
          display="flex"
          alignItems="center"
          justifyContent="center"
          boxSize="1.75rem"
          bg="green.9"
          color="white"
          borderRadius="full"
        >
          <CheckIcon size={16} />
        </Box>
      ) : null}
    </Stack>
  )
}
