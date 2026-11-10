'use client'
import type { ReactNode } from 'react'
import { Stack, styled } from '../../styled-system/jsx'
import { Avatar, Text } from '../components/ui'

export interface ActivityItem {
  id: string
  actor: string
  initials: string
  /** What the actor did; rendered after the name, so it reads as a sentence. */
  action: ReactNode
  when: string
}

export interface ActivityFeedProps {
  items: ActivityItem[]
}

/** Who did what, when: an avatar, the actor in bold, the action and a relative time per row. */
export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    // `listStyle: none` drops the implicit list role in Safari/VoiceOver; set it back.
    <styled.ul role="list" listStyle="none">
      {items.map((item) => (
        <styled.li
          key={item.id}
          display="flex"
          alignItems="flex-start"
          gap="3"
          py="2.5"
          borderBottomWidth="1px"
          borderColor="border"
          _first={{ pt: '0' }}
          _last={{ pb: '0', borderBottomWidth: '0' }}
        >
          {/* The name follows in text, so the initials are decorative. */}
          <Avatar.Root size="sm" aria-hidden="true">
            <Avatar.Fallback>{item.initials}</Avatar.Fallback>
          </Avatar.Root>
          <Stack gap="0.5" minW="0">
            <Text textStyle="sm">
              <styled.strong fontWeight="semibold">{item.actor}</styled.strong> {item.action}
            </Text>
            <Text textStyle="xs" color="fg.subtle">
              {item.when}
            </Text>
          </Stack>
        </styled.li>
      ))}
    </styled.ul>
  )
}
