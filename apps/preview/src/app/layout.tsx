import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import { SiteNav } from '@/components/site-nav'
import { ThemeProvider } from '@/components/theme-provider'
import { css } from '../../styled-system/css'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

export const metadata: Metadata = {
  title: 'Kemo design system preview',
  description: 'Live preview of @kemo/ui: component gallery and auth route stubs.',
}

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    // The font variable lives on <html> so the lib's fonts.body token resolves everywhere.
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <SiteNav />
          <main
            className={css({
              maxWidth: '6xl',
              marginInline: 'auto',
              paddingInline: '6',
              paddingBlock: '10',
            })}
          >
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
