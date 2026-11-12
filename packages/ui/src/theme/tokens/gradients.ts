import { defineTokens } from '@pandacss/dev'

// Nightfall: the auth pages' full-viewport background (wine red through purple into indigo, with one
// soft light streak). The only place this value lives; consumers use `bgGradient: 'auth'`.
export const gradients = defineTokens.gradients({
  auth: {
    value:
      'linear-gradient(115deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 28%), linear-gradient(135deg, #4a0f26 0%, #5d1f7e 48%, #140b2a 100%)',
  },
  // Nightfall muted for the status pages: a dark veil over the same two layers (Panda gradient
  // tokens cannot reference each other). Consumers use `bgGradient: 'status'`.
  status: {
    value:
      'linear-gradient(rgba(12, 8, 22, 0.58), rgba(12, 8, 22, 0.58)), linear-gradient(115deg, rgba(255,255,255,.06) 0%, rgba(255,255,255,0) 28%), linear-gradient(135deg, #4a0f26 0%, #5d1f7e 48%, #140b2a 100%)',
  },
  // Blog cover art: 135deg two-stop gradients from the Nightfall palette, picked by `BlogCover`
  // (cover1..cover6) with a faint diagonal stripe overlay (coverStripes) layered on top.
  cover1: { value: 'linear-gradient(135deg, #4a0f26, #5d1f7e)' },
  cover2: { value: 'linear-gradient(135deg, #5d1f7e, #140b2a)' },
  cover3: { value: 'linear-gradient(135deg, #140b2a, #2a3a8a)' },
  cover4: { value: 'linear-gradient(135deg, #7a1f3d, #c2542d)' },
  cover5: { value: 'linear-gradient(135deg, #1c1c1c, #4a0f26)' },
  cover6: { value: 'linear-gradient(135deg, #2a3a8a, #5d1f7e)' },
  coverStripes: {
    value: 'repeating-linear-gradient(115deg, rgba(255,255,255,.07) 0 1px, transparent 1px 14px)',
  },
})
