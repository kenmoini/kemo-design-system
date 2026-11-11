import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: '403' }

export default function Status403Route() {
  return <StatusDemo page="403" />
}
