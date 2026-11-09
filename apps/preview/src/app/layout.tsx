import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import type { ReactNode } from 'react'
import { PreviewPanel } from '@/components/preview-panel'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'

const dmSans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans', display: 'swap' })

export const metadata: Metadata = {
  title: {
    template: '%s · kemo-design-system preview',
    default: 'kemo-design-system preview',
  },
  description: 'Live preview of @kemo/ui: component pages and auth route stubs.',
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
          {children}
          <PreviewPanel />
        </ThemeProvider>
      </body>
    </html>
  )
}
