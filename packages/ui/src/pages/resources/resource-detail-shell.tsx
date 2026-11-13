import { Fragment } from 'react'
import { HStack, Stack } from '../../../styled-system/jsx'
import { Breadcrumb, Heading, Tabs, Text } from '../../components/ui'
import { TabStripScroller } from '../access/tab-strip-scroller'
import { StatusBadge } from './status-badge'
import type { ResourceDetailShellProps } from './types'

/**
 * The detail page of any Kubernetes resource: a breadcrumb, the name with its status, a context line,
 * the actions, and a strip of tabs, one link per tab so every tab has its own URL. The route decides
 * the active tab; only its content (`children`) renders. Kind-agnostic: a Deployment, a Gateway or
 * a CRD page passes its own tabs, actions and overview.
 */
export function ResourceDetailShell({
  breadcrumb,
  name,
  status,
  context,
  actions,
  tabs,
  activeTab,
  tabHref,
  linkComponent: HostLink,
  children,
}: ResourceDetailShellProps) {
  const link = (href: string, label: string) =>
    HostLink ? <HostLink href={href}>{label}</HostLink> : <a href={href}>{label}</a>

  return (
    <Stack gap="6">
      <Breadcrumb.Root>
        <Breadcrumb.List flexWrap="wrap">
          {breadcrumb.map((item, index) => {
            const last = index === breadcrumb.length - 1
            return (
              <Fragment key={`${index}-${item.label}`}>
                <Breadcrumb.Item>
                  {last ? (
                    <span aria-current="page">{item.label}</span>
                  ) : item.href ? (
                    <Breadcrumb.Link asChild>{link(item.href, item.label)}</Breadcrumb.Link>
                  ) : (
                    item.label
                  )}
                </Breadcrumb.Item>
                {last ? null : <Breadcrumb.Separator />}
              </Fragment>
            )
          })}
        </Breadcrumb.List>
      </Breadcrumb.Root>

      <HStack justify="space-between" alignItems="flex-start" flexWrap="wrap" gap="4">
        <Stack gap="1" minW="0">
          <Heading
            as="h1"
            textStyle="2xl"
            fontWeight="semibold"
            letterSpacing="tight"
            display="flex"
            alignItems="center"
            flexWrap="wrap"
            columnGap="3"
            rowGap="1"
            wordBreak="break-word"
          >
            {name}
            {/* The space keeps the badge a separate word in the heading's accessible name. */}
            {status ? ' ' : null}
            {status ? <StatusBadge {...status} /> : null}
          </Heading>
          <Text as="div" textStyle="sm" color="fg.muted">
            {context}
          </Text>
        </Stack>
        {actions ? (
          <HStack gap="2" flexWrap="wrap">
            {actions}
          </HStack>
        ) : null}
      </HStack>

      {/* Arrow keys move focus along the strip; Enter or a click follows the link. */}
      <Tabs.Root value={activeTab} activationMode="manual" gap="6">
        {/* The scroller wraps the list so the list's border and indicator are never clipped. */}
        <TabStripScroller activeTab={activeTab}>
          <Tabs.List w="max-content" minW="full">
            {tabs.map((tab) => (
              <Tabs.Trigger key={tab.id} value={tab.id} asChild whiteSpace="nowrap">
                {link(tabHref(tab.id), tab.label)}
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
