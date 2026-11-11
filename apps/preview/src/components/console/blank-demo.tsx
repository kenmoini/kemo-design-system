'use client'
import { BlankPage } from '@kemo/ui'
import { ConsoleFrame } from '@/components/console/console-frame'

/** The starter screen inside the console shell; no nav item is current (it is a new page). */
export function BlankDemo() {
  return (
    <ConsoleFrame>
      <BlankPage
        title="Page title"
        context="One line of context about this page"
        action={{ label: 'Primary action' }}
        emptyAction={{ label: 'Secondary action' }}
      />
    </ConsoleFrame>
  )
}
