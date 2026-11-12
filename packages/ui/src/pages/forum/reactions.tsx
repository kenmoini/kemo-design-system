'use client'
import { useState } from 'react'
import { PlusIcon } from 'lucide-react'
import { HStack, styled } from '../../../styled-system/jsx'
import { Button, IconButton, Menu } from '../../components/ui'
import { REACTION_EMOJI } from './content'
import type { ForumReaction, ReactionEmoji } from './types'

export interface ReactionPillsProps {
  reactions?: ForumReaction[]
  onReact?: (emoji: ReactionEmoji) => Promise<void>
  /** Show the trailing "+" pill that offers every emoji (default true). */
  addable?: boolean
}

/** Reaction counts as pills; buttons (with an add menu) when `onReact` is given, else plain spans. */
export function ReactionPills({ reactions, onReact, addable = true }: ReactionPillsProps) {
  const [pending, setPending] = useState<ReactionEmoji | null>(null)
  const shown = (reactions ?? []).filter((reaction) => reaction.count > 0)

  async function react(emoji: ReactionEmoji) {
    if (!onReact) return
    setPending(emoji)
    try {
      await onReact(emoji)
    } catch {
      // The page does not surface reaction errors.
    } finally {
      setPending(null)
    }
  }

  if (shown.length === 0 && !(onReact && addable)) return null

  return (
    <HStack gap="1.5" flexWrap="wrap">
      {shown.map(({ emoji, count, reacted }) =>
        onReact ? (
          <Button
            key={emoji}
            variant="outline"
            size="xs"
            borderRadius="full"
            aria-label={`${emoji} ${count}, react`}
            aria-pressed={reacted ?? false}
            loading={pending === emoji}
            onClick={() => react(emoji)}
          >
            {emoji} {count}
          </Button>
        ) : (
          <styled.span
            key={emoji}
            display="inline-flex"
            alignItems="center"
            borderWidth="1px"
            borderColor="border"
            borderRadius="full"
            px="2.5"
            h="8"
            textStyle="sm"
          >
            {emoji} {count}
          </styled.span>
        ),
      )}
      {onReact && addable ? (
        <Menu.Root onSelect={(details) => react(details.value as ReactionEmoji)}>
          <Menu.Trigger asChild>
            <IconButton variant="outline" size="xs" borderRadius="full" aria-label="Add reaction">
              <PlusIcon />
            </IconButton>
          </Menu.Trigger>
          <Menu.Positioner>
            <Menu.Content>
              {REACTION_EMOJI.map((emoji) => (
                <Menu.Item key={emoji} value={emoji}>
                  {emoji}
                </Menu.Item>
              ))}
            </Menu.Content>
          </Menu.Positioner>
        </Menu.Root>
      ) : null}
    </HStack>
  )
}
