import { z } from 'zod'

export const signInSchema = z.object({
  identifier: z.string().min(1, 'Enter your email or username.'),
  password: z.string().min(1, 'Enter your password.'),
})

export type SignInValues = z.infer<typeof signInSchema>

export const nameSchema = (what: string) =>
  z.string().min(1, `Enter your ${what}.`).max(64, 'Use at most 64 characters.')

export const usernameSchema = z
  .string()
  .min(3, 'Use 3 to 32 characters.')
  .max(32, 'Use 3 to 32 characters.')
  .regex(/^[A-Za-z0-9-]+$/, 'Letters, numbers and dashes only.')

export const emailSchema = z.email('Enter a valid email address.')

export const newPasswordSchema = z.string().min(12, 'Use at least 12 characters.')

export const registerSchema = z
  .object({
    firstName: nameSchema('first name'),
    lastName: nameSchema('last name'),
    username: usernameSchema,
    email: emailSchema,
    password: newPasswordSchema,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v, 'You need to agree to continue.'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: "Passwords don't match.",
  })

export type RegisterValues = z.infer<typeof registerSchema>

export const forgotPasswordSchema = z.object({ email: emailSchema })

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>
