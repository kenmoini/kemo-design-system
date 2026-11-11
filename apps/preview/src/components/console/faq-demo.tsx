'use client'
import { FaqPage } from '@kemo/ui'
import NextLink from 'next/link'
import { ConsoleFrame } from '@/components/console/console-frame'
import { faqTopics } from '@/lib/mock-faq'

/** The FAQ page inside the console shell, with "Help" current in the side navigation. */
export function FaqDemo() {
  return (
    <ConsoleFrame active="help">
      <FaqPage
        topics={faqTopics}
        description="Answers about accounts, deployments and billing"
        action={{ label: 'Contact support' }}
        linkComponent={NextLink}
      />
    </ConsoleFrame>
  )
}
