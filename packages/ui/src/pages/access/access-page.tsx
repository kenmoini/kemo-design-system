import type { ReactNode } from 'react'
import { Stack } from '../../../styled-system/jsx'
import { Tabs } from '../../components/ui'
import { PageHeader } from '../../layouts/app-shell'
import type { LinkComponent } from '../auth/types'
import { accessTabs } from './access-tabs'
import { TabStripScroller } from './tab-strip-scroller'
import type { AccessTabId } from './types'

export interface AccessPageProps {
  /** The tab the route points at; only its content is rendered. */
  activeTab: AccessTabId
  /** The URL of each tab, e.g. "/access" for the overview and "/access/{id}" for the rest. */
  tabHref: (tab: AccessTabId) => string
  /** The host's link (Next's `Link`, say); defaults to a plain anchor. */
  linkComponent?: LinkComponent
  title?: string
  description?: string
  /** The active tab's content. */
  children: ReactNode
}

/**
 * The Access console page: a header and a strip of tabs, one link per tab so every tab has its own
 * URL. The route decides the active tab; the strip scrolls sideways when it does not fit.
 */
export function AccessPage({
  activeTab,
  tabHref,
  linkComponent: HostLink,
  title = 'Access',
  description = 'Users, groups, roles and how people sign in',
  children,
}: AccessPageProps) {
  return (
    <Stack gap="6">
      <PageHeader title={title} context={description} />
      {/* Arrow keys move focus along the strip; Enter or a click follows the link. */}
      <Tabs.Root value={activeTab} activationMode="manual" gap="6">
        {/* The scroller wraps the list so the list's border and indicator are never clipped. */}
        <TabStripScroller activeTab={activeTab}>
          <Tabs.List w="max-content" minW="full">
            {accessTabs.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id} asChild whiteSpace="nowrap">
                {HostLink ? (
                  <HostLink href={tabHref(tab.id)}>{tab.label}</HostLink>
                ) : (
                  <a href={tabHref(tab.id)}>{tab.label}</a>
                )}
              </Tabs.Trigger>
            ))}
            <Tabs.Indicator />
          </Tabs.List>
        </TabStripScroller>
        <Tabs.Content value={activeTab}>{children}</Tabs.Content>
      </Tabs.Root>
    </Stack>
  )
}
