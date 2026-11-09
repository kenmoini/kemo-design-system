import { defineTokens } from '@pandacss/dev'

export const fonts = defineTokens.fonts({
  body: { value: "var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif" },
  heading: { value: "var(--font-dm-sans, 'DM Sans'), ui-sans-serif, system-ui, sans-serif" },
  mono: { value: 'ui-monospace, SFMono-Regular, Menlo, monospace' },
})
