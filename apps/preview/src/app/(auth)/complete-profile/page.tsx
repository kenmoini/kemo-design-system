import type { Metadata } from 'next'
import { CompleteProfileDemo } from '@/components/auth/complete-profile-demo'

export const metadata: Metadata = { title: 'Complete your profile' }

export default function CompleteProfilePage() {
  return <CompleteProfileDemo />
}
