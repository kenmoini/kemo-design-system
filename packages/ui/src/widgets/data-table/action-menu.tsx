'use client'
import { Portal } from '@ark-ui/react/portal'
import { ChevronDown, EllipsisVertical } from 'lucide-react'
import { Fragment } from 'react'
import { Button, IconButton, Menu } from '../../components/ui'
import type { ActionItem } from './types'

export interface ActionMenuProps {
  /** The trigger's accessible name: the icon button's `aria-label` (default "Actions"), or the
   * button's text when `buttonLabel` is absent. */
  label?: string
  items: ActionItem[]
  /** `icon`: a plain ⋮ icon button (row actions); `button`: an outline button with a chevron. */
  trigger?: 'icon' | 'button'
  /** The button trigger's text. */
  buttonLabel?: string
  disabled?: boolean
  /** Labels the group the items sit in, e.g. "2 users". */
  groupLabel?: string
  /** Items after a separator, in a group of their own (the bulk menu's "Clear selection"). */
  footerItems?: ActionItem[]
}

function ActionItems({ items }: { items: ActionItem[] }) {
  return items.map((item, index) => {
    const danger = item.tone === 'danger'
    // Destructive items start their own section, below a separator.
    const separate = danger && index > 0 && items[index - 1]?.tone !== 'danger'
    return (
      <Fragment key={item.id}>
        {separate ? <Menu.Separator /> : null}
        <Menu.Item
          value={item.id}
          disabled={item.disabled}
          onSelect={item.onSelect}
          color={danger ? 'red.11' : 'fg.default'}
        >
          {item.label}
        </Menu.Item>
      </Fragment>
    )
  })
}

/**
 * A Park `Menu` of actions behind an icon or an outline button: the per-row "⋮" menu, the toolbar's
 * "Bulk actions ▾" menu and any other list of commands. Danger items are red and sit below a separator.
 */
export function ActionMenu({
  label,
  items,
  trigger = 'icon',
  buttonLabel,
  disabled,
  groupLabel,
  footerItems,
}: ActionMenuProps) {
  return (
    <Menu.Root size="sm" positioning={{ placement: 'bottom-end' }}>
      <Menu.Trigger asChild>
        {trigger === 'button' ? (
          <Button variant="outline" size="sm" disabled={disabled}>
            {buttonLabel ?? label}
            <ChevronDown />
          </Button>
        ) : (
          <IconButton variant="plain" size="xs" aria-label={label ?? 'Actions'} disabled={disabled}>
            <EllipsisVertical />
          </IconButton>
        )}
      </Menu.Trigger>
      <Portal>
        <Menu.Positioner>
          <Menu.Content>
            {groupLabel ? (
              <Menu.ItemGroup>
                <Menu.ItemGroupLabel>{groupLabel}</Menu.ItemGroupLabel>
                <ActionItems items={items} />
              </Menu.ItemGroup>
            ) : (
              <ActionItems items={items} />
            )}
            {footerItems && footerItems.length > 0 ? (
              <>
                <Menu.Separator />
                <Menu.ItemGroup>
                  <ActionItems items={footerItems} />
                </Menu.ItemGroup>
              </>
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
