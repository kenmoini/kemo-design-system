import { AccessSettingsForm } from '../forms/settings-form'
import type { AccessSettingsValues } from '../types'

export interface AccessSettingsProps {
  /** The saved settings. */
  values: AccessSettingsValues
  /** "Save settings": resolve when saved (the form is clean again); a rejection keeps the changes
   * and shows the error's message. */
  onSave: (values: AccessSettingsValues) => void | Promise<void>
  /** "Send test email": a rejection shows the error's message. */
  onSendTestEmail: () => void | Promise<void>
}

/**
 * The Access Settings tab: one card of sections (internal authentication, tokens and sessions,
 * email verification) with "Discard changes" and "Save settings", both off until a field changes.
 */
export function AccessSettings({ values, onSave, onSendTestEmail }: AccessSettingsProps) {
  return <AccessSettingsForm values={values} onSubmit={onSave} onSendTestEmail={onSendTestEmail} />
}
