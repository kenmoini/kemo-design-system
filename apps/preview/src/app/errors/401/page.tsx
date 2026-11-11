import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: '401' }

export default function Status401Route() {
  return <StatusDemo page="401" />
}
