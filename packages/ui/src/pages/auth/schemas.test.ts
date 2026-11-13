import { describe, expect, it } from 'vitest'
import { registerSchema, signInSchema } from './schemas'

const validRegister = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  username: 'ada',
  email: 'ada@example.com',
  password: 'correct horse battery',
  confirmPassword: 'correct horse battery',
  acceptTerms: true,
}

function messageFor(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  expect(result.success).toBe(false)
  return result.error?.issues[0]?.message
}

describe('registerSchema length limits', () => {
  it('accepts values at the limits', () => {
    const atLimits = {
      ...validRegister,
      firstName: 'a'.repeat(64),
      lastName: 'a'.repeat(64),
      username: 'a'.repeat(32),
    }
    expect(registerSchema.safeParse(atLimits).success).toBe(true)
  })

  it.each([
    ['firstName', 65, 'Use at most 64 characters.'],
    ['lastName', 65, 'Use at most 64 characters.'],
    ['username', 33, 'Use 3 to 32 characters.'],
  ])('rejects a %s of %i characters', (field, length, message) => {
    const result = registerSchema.safeParse({ ...validRegister, [field]: 'a'.repeat(length) })
    expect(messageFor(result)).toBe(message)
  })
})

describe('signInSchema', () => {
  it('rejects empty fields with the existing messages', () => {
    const result = signInSchema.safeParse({ identifier: '', password: '' })
    expect(result.error?.issues.map((i) => i.message)).toEqual([
      'Enter your email or username.',
      'Enter your password.',
    ])
  })
})
