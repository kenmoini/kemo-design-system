'use client'
import { ServerErrorPage } from '@kemo/ui'
import NextLink from 'next/link'
import { BrandMark } from '@/components/brand-mark'
import { statusDemoProps } from '@/lib/mock-status'

// Next renders this when a route below the root layout throws; `reset` re-renders the segment.
// React already logs the caught error; a host would also report it to its error service here.
export default function ErrorBoundary({
  error,
  reset,
}: Readonly<{ error: Error & { digest?: string }; reset: () => void }>) {
  return (
    <ServerErrorPage
      {...statusDemoProps}
      logo={<BrandMark letter="K" />}
      linkComponent={NextLink}
      // Only server errors carry a digest; a client render error shows no request id.
      requestId={error.digest}
      actions={[
        { label: 'Try again', onSelect: reset },
        { label: 'Go to dashboard', href: '/dashboard' },
        { label: 'View status page', href: '/maintenance' },
      ]}
    />
  )
}
