'use client'
import { Portal } from '@ark-ui/react/portal'
import { ChevronDown, EllipsisVertical } from 'lucide-react'
import { Fragment, useState } from 'react'
import { Button, IconButton, Menu } from '../../components/ui'
import type { LinkComponent } from '../../pages/auth/types'
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
  /** Dims the trigger and keeps the menu shut; the trigger stays focusable (`aria-disabled`), so
   * focus is not lost when the last action disables it (the bulk menu's "Clear selection"). */
  disabled?: boolean
  /** Labels the group the items sit in, e.g. "2 users". */
  groupLabel?: string
  /** Items after a separator, in a group of their own (the bulk menu's "Clear selection"). */
  footerItems?: ActionItem[]
  /** The host's link for items with an `href` (Next's `Link`, say); defaults to an anchor. */
  linkComponent?: LinkComponent
}

function ActionItems({
  items,
  linkComponent: HostLink,
}: {
  items: ActionItem[]
  linkComponent?: LinkComponent
}) {
  return items.map((item, index) => {
    const danger = item.tone === 'danger'
    // Destructive items start their own section, below a separator.
    const separate = danger && index > 0 && items[index - 1]?.tone !== 'danger'
    // A disabled link would still follow its href on a click: render it as a plain item.
    const href = item.disabled ? undefined : item.href
    return (
      <Fragment key={item.id}>
        {separate ? <Menu.Separator /> : null}
        <Menu.Item
          value={item.id}
          disabled={item.disabled}
          onSelect={item.onSelect}
          color={danger ? 'red.11' : 'fg.default'}
          // Zag follows a link item on Enter by clicking it, so the host link's routing applies.
          asChild={href !== undefined}
        >
          {href === undefined ? (
            item.label
          ) : HostLink ? (
            <HostLink href={href}>{item.label}</HostLink>
          ) : (
            <a href={href}>{item.label}</a>
          )}
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
  linkComponent,
}: ActionMenuProps) {
  const [open, setOpen] = useState(false)
  return (
    <Menu.Root
      size="sm"
      positioning={{ placement: 'bottom-end' }}
      open={open && !disabled}
      onOpenChange={(details) => setOpen(details.open && !disabled)}
    >
      <Menu.Trigger asChild>
        {trigger === 'button' ? (
          <Button variant="outline" size="sm" aria-disabled={disabled || undefined}>
            {buttonLabel ?? label}
            <ChevronDown />
          </Button>
        ) : (
          <IconButton
            variant="plain"
            size="xs"
            aria-label={label ?? 'Actions'}
            aria-disabled={disabled || undefined}
          >
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
                <ActionItems items={items} linkComponent={linkComponent} />
              </Menu.ItemGroup>
            ) : (
              <ActionItems items={items} linkComponent={linkComponent} />
            )}
            {footerItems && footerItems.length > 0 ? (
              <>
                <Menu.Separator />
                <Menu.ItemGroup>
                  <ActionItems items={footerItems} linkComponent={linkComponent} />
                </Menu.ItemGroup>
              </>
            ) : null}
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  )
}
