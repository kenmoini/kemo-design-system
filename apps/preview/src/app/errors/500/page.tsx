import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: '500' }

export default function Status500Route() {
  return <StatusDemo page="500" />
}
