import type { Metadata } from 'next'
import { RegisterDemo } from '@/components/auth/register-demo'

export const metadata: Metadata = { title: 'Create your account' }

export default function RegisterPage() {
  return <RegisterDemo />
}
