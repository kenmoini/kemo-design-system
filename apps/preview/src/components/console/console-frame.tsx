'use client'
import {
  Alert,
  AppShell,
  Button,
  createListCollection,
  type NavGroup,
  PageFooter,
  Portal,
  Select,
  SideNav,
  TopBar,
} from '@kemo/ui'
import NextLink from 'next/link'
import { useRouter } from 'next/navigation'
import { type ReactNode, useMemo, useState } from 'react'
import { BrandMark } from '@/components/brand-mark'
import {
  environments,
  footer,
  footerLinks,
  navGroups as mockNavGroups,
  topBar,
  workspaces,
} from '@/lib/mock-dashboard'

interface DemoSelectProps {
  /** Visually hidden; names the combobox. */
  label: string
  options: { value: string; label: string }[]
  value: string
  onChange: (value: string) => void
  placement?: 'bottom-start' | 'bottom-end' | 'top-start'
  /**
   * Lift the list above modal layers. The select recipe stacks its content at `dropdown`, below the
   * navigation drawer, so the side navigation's copy (also rendered in the drawer) needs this.
   */
  raised?: boolean
}

/** A small Park `Select` holding a local value, built the way `TopBar`'s environment select is. */
export function DemoSelect({
  label,
  options,
  value,
  onChange,
  placement = 'bottom-end',
  raised = false,
}: DemoSelectProps) {
  const collection = useMemo(() => createListCollection({ items: options }), [options])
  return (
    <Select.Root
      collection={collection}
      value={[value]}
      onValueChange={(details) => {
        const next = details.value[0]
        if (next !== undefined) onChange(next)
      }}
      size="sm"
      positioning={{ placement }}
    >
      <Select.Label srOnly>{label}</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
          <Select.Indicator />
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content zIndex={raised ? 'popover' : undefined}>
            {collection.items.map((item) => (
              <Select.Item key={item.value} item={item}>
                <Select.ItemText>{item.label}</Select.ItemText>
                <Select.ItemIndicator />
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Positioner>
      </Portal>
    </Select.Root>
  )
}

/** The notifications button's inline message: visible under the top bar until dismissed. */
function Notices({ onDismiss }: { onDismiss: () => void }) {
  return (
    <Alert.Root status="info" variant="surface" mb="4">
      <Alert.Content>
        <Alert.Title>Notifications</Alert.Title>
        <Alert.Description>
          3 unread: INC-418 escalated, checkout-api v2.14.0 promoted, 2 deploy approvals waiting.
        </Alert.Description>
      </Alert.Content>
      <Button size="sm" variant="outline" onClick={onDismiss}>
        Dismiss
      </Button>
    </Alert.Root>
  )
}

export interface ConsoleFrameProps {
  /** The `id` of the nav item to mark current (`overview`, `help`, ...); none when omitted. */
  active?: string
  children: ReactNode
}

/**
 * The preview's signed-in console: the dashboard's `AppShell` with its top bar, side navigation and
 * footer, around any page content. The environment and workspace selects hold local state; every
 * other control is inert.
 */
export function ConsoleFrame({ active, children }: ConsoleFrameProps) {
  const [environment, setEnvironment] = useState('prod-us-east')
  const [workspace, setWorkspace] = useState('core')
  const [showNotices, setShowNotices] = useState(false)
  const router = useRouter()

  const navGroups = useMemo<NavGroup[]>(
    () =>
      mockNavGroups.map((group) => ({
        ...group,
        items: group.items.map(({ icon: Icon, ...item }) => ({
          ...item,
          icon: <Icon />,
          active: item.id === active,
        })),
      })),
    [active],
  )

  return (
    <AppShell
      topBar={
        <TopBar
          {...topBar}
          brand={{ ...topBar.brand, logo: <BrandMark letter="K" /> }}
          environment={{ options: environments, value: environment, onChange: setEnvironment }}
          onHelp={() => router.push('/faq')}
          onNotifications={() => setShowNotices((open) => !open)}
        />
      }
      sideNav={
        <SideNav
          groups={navGroups}
          linkComponent={NextLink}
          footer={
            <DemoSelect
              label="Workspace"
              options={workspaces}
              value={workspace}
              onChange={setWorkspace}
              placement="top-start"
              raised
            />
          }
        />
      }
      footer={<PageFooter {...footer} links={footerLinks} />}
    >
      {showNotices ? <Notices onDismiss={() => setShowNotices(false)} /> : null}
      {children}
    </AppShell>
  )
}
