import type { Metadata } from 'next'
import { FaqDemo } from '@/components/console/faq-demo'

export const metadata: Metadata = { title: 'FAQ' }

export default function FaqRoute() {
  return <FaqDemo />
}
