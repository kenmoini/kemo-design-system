import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: '503' }

export default function Status503Route() {
  return <StatusDemo page="503" />
}
