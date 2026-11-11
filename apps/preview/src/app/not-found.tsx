import type { Metadata } from 'next'
import { StatusDemo } from '@/components/status/status-demo'

export const metadata: Metadata = { title: 'Not found' }

// Next renders this for every unmatched URL (with a 404 status) and for `notFound()` calls. The page
// goes through a client component because `linkComponent={NextLink}` is a function, and functions
// can't be passed from a server component to the client `StatusLayout`.
export default function NotFound() {
  return <StatusDemo page="404" />
}
