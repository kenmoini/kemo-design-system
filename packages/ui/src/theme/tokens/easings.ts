import { defineTokens } from '@pandacss/dev'

// The drawer backdrop recipe (Park UI, synced) references these names; the same curves are
// hard-coded for its content slot.
export const easings = defineTokens.easings({
  'emphasized-in': { value: 'cubic-bezier(0.05, 0.7, 0.1, 1.0)' },
  'emphasized-out': { value: 'cubic-bezier(0.3, 0.0, 0.8, 0.15)' },
})
