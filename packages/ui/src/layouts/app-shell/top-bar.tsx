'use client'
import { Portal } from '@ark-ui/react/portal'
import { createListCollection } from '@ark-ui/react/select'
import { BellIcon, CircleHelpIcon, MenuIcon } from 'lucide-react'
import { type FormEvent, useMemo } from 'react'
import { Box, HStack, styled } from '../../../styled-system/jsx'
import {
  Avatar,
  Badge,
  IconButton,
  Input,
  InputGroup,
  Kbd,
  Menu,
  Select,
  Text,
} from '../../components/ui'
import { useAppShell } from './app-shell-context'
import type { TopBarProps } from './types'

type EnvironmentProps = NonNullable<TopBarProps['environment']>

function EnvironmentSelect({ options, value, onChange }: EnvironmentProps) {
  const collection = useMemo(() => createListCollection({ items: options }), [options])
  return (
    <Select.Root
      collection={collection}
      value={[value]}
      onValueChange={(details) => {
        const next = details.value[0]
        if (next !== undefined) onChange?.(next)
      }}
      size="sm"
      w="44"
      flexShrink="0"
      hideBelow="sm"
      positioning={{ placement: 'bottom-end' }}
    >
      <Select.Label srOnly>Environment</Select.Label>
      <Select.Control>
        <Select.Trigger>
          <Select.ValueText />
          <Select.Indicator />
        </Select.Trigger>
      </Select.Control>
      <Portal>
        <Select.Positioner>
          <Select.Content>
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

/**
 * The bar across the top of the shell: brand, search, environment, the host's actions, help,
 * notifications and the account menu. Inside an `AppShell` below `md` it leads with the button
 * that opens the navigation drawer.
 */
export function TopBar({
  brand,
  search,
  environment,
  actions,
  notifications,
  account,
}: TopBarProps) {
  const shell = useAppShell()

  const onSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const query = new FormData(event.currentTarget).get('q')
    search?.onSubmit?.(typeof query === 'string' ? query : '')
  }

  return (
    <HStack h="full" gap={{ base: '2', md: '3' }} px={{ base: '3', md: '4' }}>
      {shell?.isMobile ? (
        <IconButton
          variant="plain"
          size="sm"
          hideFrom="md"
          aria-label="Open navigation"
          aria-haspopup="dialog"
          aria-expanded={shell.drawerOpen}
          onClick={() => shell.setDrawerOpen(true)}
        >
          <MenuIcon />
        </IconButton>
      ) : null}
      <HStack gap="2" minW="0">
        {brand.logo}
        <Text as="span" textStyle="sm" fontWeight="semibold" truncate>
          {brand.name}
        </Text>
      </HStack>
      {search ? (
        <styled.form role="search" flex="1" maxW="sm" hideBelow="md" onSubmit={onSearch}>
          <InputGroup
            size="sm"
            endElement={
              <Kbd size="sm" aria-hidden="true">
                ⌘K
              </Kbd>
            }
          >
            <Input
              type="search"
              name="q"
              size="sm"
              aria-label="Search"
              placeholder={search.placeholder}
              bg="canvas"
            />
          </InputGroup>
        </styled.form>
      ) : null}
      <Box flex="1" />
      {environment ? <EnvironmentSelect {...environment} /> : null}
      {actions}
      <HStack gap="1" flexShrink="0">
        <IconButton variant="plain" size="sm" aria-label="Help">
          <CircleHelpIcon />
        </IconButton>
        <IconButton
          variant="plain"
          size="sm"
          aria-label={notifications ? `Notifications (${notifications})` : 'Notifications'}
        >
          <BellIcon />
          {notifications ? (
            <Badge
              size="sm"
              variant="solid"
              position="absolute"
              top="0"
              insetInlineEnd="0"
              minW="4.5"
              px="1"
              justifyContent="center"
              pointerEvents="none"
              aria-hidden="true"
            >
              {notifications}
            </Badge>
          ) : null}
        </IconButton>
        <Menu.Root positioning={{ placement: 'bottom-end' }}>
          <Menu.Trigger
            aria-label={`Account: ${account.name}`}
            ms="1"
            borderRadius="full"
            cursor="pointer"
          >
            <Avatar.Root size="xs">
              <Avatar.Fallback>{account.initials}</Avatar.Fallback>
            </Avatar.Root>
          </Menu.Trigger>
          <Portal>
            <Menu.Positioner>
              <Menu.Content>
                <Menu.ItemGroup>
                  <Menu.ItemGroupLabel>{account.name}</Menu.ItemGroupLabel>
                  {account.menu.map((item) => (
                    <Menu.Item key={item.label} value={item.label} onSelect={item.onSelect}>
                      {item.label}
                    </Menu.Item>
                  ))}
                </Menu.ItemGroup>
              </Menu.Content>
            </Menu.Positioner>
          </Portal>
        </Menu.Root>
      </HStack>
    </HStack>
  )
}
