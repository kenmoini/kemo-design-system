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
})
