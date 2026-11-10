import { z } from 'zod'

export const signInSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or username.'),
  password: z.string().min(1, 'Enter your password.'),
})

export type SignInValues = z.infer<typeof signInSchema>
