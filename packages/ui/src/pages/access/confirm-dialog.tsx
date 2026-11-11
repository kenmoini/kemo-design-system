'use client'
import { type ReactNode, useRef } from 'react'
import { HStack } from '../../../styled-system/jsx'
import { Button } from '../../components/ui'
import { EntityDialog } from './entity-dialog'

export interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description: ReactNode
  confirmLabel: string
  /** `danger` paints the confirm button red. */
  tone?: 'danger' | 'default'
  onConfirm: () => void
  /** The element to focus on close; defaults to the element that had focus when it opened. */
  finalFocusEl?: () => HTMLElement | null
}

/**
 * A small dialog that asks before an action happens: the question, what it means, Cancel (focused
 * first, so Enter never confirms by accident) and the confirm button, which acts and then closes.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  finalFocusEl,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)
  return (
    <EntityDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      size="sm"
      initialFocusEl={() => cancelRef.current}
      finalFocusEl={finalFocusEl}
    >
      <HStack justify="flex-end" gap="3">
        <Button ref={cancelRef} variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="solid"
          colorPalette={tone === 'danger' ? 'red' : undefined}
          onClick={() => {
            onConfirm()
            onOpenChange(false)
          }}
        >
          {confirmLabel}
        </Button>
      </HStack>
    </EntityDialog>
  )
}
