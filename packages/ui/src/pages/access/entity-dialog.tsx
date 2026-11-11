'use client'
import { Portal } from '@ark-ui/react/portal'
import type { ReactNode } from 'react'
import { CloseButton, Dialog } from '../../components/ui'

export interface EntityDialogProps {
  open: boolean
  /** Called with `false` on Escape, a backdrop click or the close button. */
  onOpenChange: (open: boolean) => void
  title: ReactNode
  description?: ReactNode
  /** The body: a form renders its own footer here. */
  children: ReactNode
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** The element to focus on open; defaults to the first field. */
  initialFocusEl?: () => HTMLElement | null
  /** The element to focus on close; defaults to the element that had focus when it opened. */
  finalFocusEl?: () => HTMLElement | null
  /**
   * `alertdialog` for a question that interrupts (a confirmation): read as urgent, and a backdrop
   * click no longer closes it (Escape and the close button still do).
   */
  role?: 'dialog' | 'alertdialog'
}

/**
 * A modal Park `Dialog` for the Access forms: title, optional description, the body and a close
 * button. It mounts on open and unmounts on close, traps focus (starting on the first field) and
 * closes on Escape or a backdrop click.
 */
export function EntityDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  initialFocusEl,
  finalFocusEl,
  role = 'dialog',
}: EntityDialogProps) {
  return (
    <Dialog.Root
      open={open}
      onOpenChange={(details) => onOpenChange(details.open)}
      lazyMount
      unmountOnExit
      size={size}
      initialFocusEl={initialFocusEl}
      finalFocusEl={finalFocusEl}
      role={role}
    >
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header pe="12">
              <Dialog.Title>{title}</Dialog.Title>
              {description ? <Dialog.Description>{description}</Dialog.Description> : null}
            </Dialog.Header>
            <Dialog.Body alignItems="stretch">{children}</Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
