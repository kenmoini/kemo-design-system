import type { ReactNode } from 'react'
import { HStack, Stack, styled } from '../../../styled-system/jsx'
import { Badge, Text } from '../../components/ui'
import type { EntityStatus, Option } from './types'

/** Looks a value up in `options`; a value without an option is shown as it is (its id). */
export function optionLabel(options: Option[]): (value: string) => string {
  const labels = new Map(options.map((option) => [option.value, option.label]))
  return (value) => labels.get(value) ?? value
}

/** A name with a muted second line beneath it (an email, a description, a client id). */
export function NameCell({ name, detail }: { name: ReactNode; detail?: ReactNode }) {
  return (
    <Stack gap="0.5" minW="0">
      <Text as="span" color="fg.default" fontWeight="medium">
        {name}
      </Text>
      {detail ? (
        <Text as="span" textStyle="xs" color="fg.muted">
          {detail}
        </Text>
      ) : null}
    </Stack>
  )
}

export const statusOptions: Option[] = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
]

export function StatusBadge({ status }: { status: EntityStatus }) {
  return status === 'active' ? (
    <Badge colorPalette="green">Active</Badge>
  ) : (
    <Badge colorPalette="gray">Disabled</Badge>
  )
}

export const sourceOptions: Option[] = [
  { value: 'internal', label: 'Internal' },
  { value: 'oidc', label: 'OIDC' },
]

export function SourceBadge({ source }: { source: 'internal' | 'oidc' }) {
  return source === 'oidc' ? (
    <Badge colorPalette="blue">OIDC</Badge>
  ) : (
    <Badge variant="outline" colorPalette="gray">
      Internal
    </Badge>
  )
}

const dateTimeFormat = new Intl.DateTimeFormat('en', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: 'UTC',
})

/**
 * An ISO timestamp as "Nov 11, 2026, 09:56 UTC" in a `time` element: UTC, so the server and the
 * browser render the same text. A value that is not a date is shown as it is; none shows `fallback`.
 */
export function DateTimeText({ value, fallback = '—' }: { value?: string; fallback?: string }) {
  if (!value) {
    return (
      <Text as="span" color="fg.muted">
        {fallback}
      </Text>
    )
  }
  const time = Date.parse(value)
  if (Number.isNaN(time)) return <>{value}</>
  return (
    <styled.time dateTime={value} whiteSpace="nowrap">
      {`${dateTimeFormat.format(time)} UTC`}
    </styled.time>
  )
}

/** A value in the mono face (a permission name, a client id). */
export function MonoText({ children }: { children: ReactNode }) {
  return (
    <Text as="span" fontFamily="mono" textStyle="sm">
      {children}
    </Text>
  )
}

/** A name with the "Built-in" badge beside it. */
export function BuiltInName({ name, builtIn }: { name: string; builtIn: boolean }) {
  return (
    <HStack gap="2">
      <Text as="span" color="fg.default" fontWeight="medium">
        {name}
      </Text>
      {builtIn ? (
        <Badge variant="outline" colorPalette="gray">
          Built-in
        </Badge>
      ) : null}
    </HStack>
  )
}
