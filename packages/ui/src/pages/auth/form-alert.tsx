'use client'
import { Alert } from '../../components/ui'

/** An error banner for a form-level failure; renders nothing without a message. */
export function FormAlert({ message }: { message?: string | null }) {
  if (!message) return null
  return (
    <Alert.Root status="error" role="alert">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Description>{message}</Alert.Description>
      </Alert.Content>
    </Alert.Root>
  )
}
