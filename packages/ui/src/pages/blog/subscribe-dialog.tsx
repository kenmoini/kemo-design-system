'use client'
import { Portal } from '@ark-ui/react/portal'
import type { ReactElement } from 'react'
import { CloseButton, Dialog } from '../../components/ui'
import { SubscribeForm } from './subscribe-form'

export interface SubscribeDialogProps {
  onSubscribe: (email: string) => Promise<void>
  /** The element that opens the dialog; focus returns to it on close. */
  trigger: ReactElement
}

/** The top bar's Subscribe dialog: unmounts on close, so reopening starts a fresh form. */
export function SubscribeDialog({ onSubscribe, trigger }: SubscribeDialogProps) {
  return (
    <Dialog.Root lazyMount unmountOnExit size="sm">
      <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
      <Portal>
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header pe="12">
              <Dialog.Title>Get new posts by email</Dialog.Title>
              <Dialog.Description>One email per post. Unsubscribe at any time.</Dialog.Description>
            </Dialog.Header>
            <Dialog.Body alignItems="stretch">
              <SubscribeForm onSubscribe={onSubscribe} idPrefix="subscribe-dialog" />
            </Dialog.Body>
            <Dialog.CloseTrigger asChild>
              <CloseButton size="sm" />
            </Dialog.CloseTrigger>
          </Dialog.Content>
        </Dialog.Positioner>
      </Portal>
    </Dialog.Root>
  )
}
