import type { ReactNode } from 'react'

// Render `/errors/throw` per request: a static prerender would run the page's throw at build time.
// The page is a client component, which can't export route segment config itself.
export const dynamic = 'force-dynamic'

export default function ThrowLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children
}
