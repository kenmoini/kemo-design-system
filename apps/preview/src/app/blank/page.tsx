import type { Metadata } from 'next'
import { BlankDemo } from '@/components/console/blank-demo'

export const metadata: Metadata = { title: 'Blank page' }

export default function BlankRoute() {
  return <BlankDemo />
}
