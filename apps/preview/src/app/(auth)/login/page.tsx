import type { Metadata } from 'next'
import { SignInDemo } from '@/components/auth/sign-in-demo'

export const metadata: Metadata = { title: 'Sign in' }

export default function LoginPage() {
  return <SignInDemo />
}
