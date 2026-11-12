'use client'
import { Fragment } from 'react'
import { HStack, styled } from '../../../styled-system/jsx'
import { Kbd, Text } from '../../components/ui'
import { EntityDialog } from '../access/entity-dialog'
import type { ShortcutsDialogProps } from './types'

/** Each shortcut's key combinations: one list of keys per alternative (macOS first). */
const shortcuts: { action: string; keys: string[][] }[] = [
  { action: 'Save', keys: [['⌘/Ctrl', 'S']] },
  { action: 'Next problem', keys: [['F8']] },
  { action: 'Problems panel', keys: [['⌘/Ctrl', 'Shift', 'M']] },
  {
    action: 'Fold',
    keys: [
      ['⌘', '⌥', '['],
      ['Ctrl', 'Shift', '['],
    ],
  },
  {
    action: 'Unfold',
    keys: [
      ['⌘', '⌥', ']'],
      ['Ctrl', 'Shift', ']'],
    ],
  },
  { action: 'Indent', keys: [['Tab']] },
  { action: 'Leave editor', keys: [['Esc']] },
]

/** A small dialog listing the YAML editor's keyboard shortcuts. */
export function ShortcutsDialog({ open, onOpenChange }: ShortcutsDialogProps) {
  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Editor shortcuts"
      description="Tab indents inside the editor: press Esc first to move on."
      size="sm"
    >
      <styled.dl
        display="grid"
        gridTemplateColumns="auto 1fr"
        columnGap="6"
        rowGap="3"
        alignItems="center"
      >
        {shortcuts.map(({ action, keys }) => (
          <Fragment key={action}>
            <Text as="dt" textStyle="sm" color="fg.muted">
              {action}
            </Text>
            <styled.dd display="flex" flexWrap="wrap" alignItems="center" gap="2">
              {keys.map((combo, index) => (
                <Fragment key={combo.join('+')}>
                  {index > 0 ? (
                    <Text as="span" textStyle="xs" color="fg.subtle">
                      or
                    </Text>
                  ) : null}
                  <HStack gap="1">
                    {combo.map((key) => (
                      <Kbd key={key} size="sm">
                        {key}
                      </Kbd>
                    ))}
                  </HStack>
                </Fragment>
              ))}
            </styled.dd>
          </Fragment>
        ))}
      </styled.dl>
    </EntityDialog>
  )
}
