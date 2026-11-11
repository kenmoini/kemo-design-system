import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: '404' }

export default function Status404Route() {
  return <StatusDemo page="404" />
}
