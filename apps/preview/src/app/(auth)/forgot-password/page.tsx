import type { Metadata } from 'next'
import { ForgotPasswordDemo } from '@/components/auth/forgot-password-demo'

export const metadata: Metadata = { title: 'Reset your password' }

export default function ForgotPasswordPage() {
  return <ForgotPasswordDemo />
}
