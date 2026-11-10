import type { ReactNode } from 'react'

// Each page's AuthLayout owns the viewport; this only gives the auth pages their main landmark.
export default function AuthGroupLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <main>{children}</main>
}
