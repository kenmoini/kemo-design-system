import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().trim().min(1, 'Enter a name.').max(64, 'Use at most 64 characters.'),
  email: z.email('Enter a valid email.'),
  role: z.string().min(1, 'Choose a role.'),
  source: z.enum(['internal', 'oidc']),
  groups: z.array(z.string()),
  sendInvite: z.boolean(),
})

export type UserValues = z.infer<typeof userSchema>

/** The Add user form's starting values. */
export const userDefaults: UserValues = {
  name: '',
  email: '',
  role: '',
  source: 'internal',
  groups: [],
  sendInvite: true,
}
