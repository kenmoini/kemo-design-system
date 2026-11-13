import { HStack, styled } from '../../../styled-system/jsx'
import { css } from '../../../styled-system/css'
import { Code, Progress, Text } from '../../components/ui'
import { type DeploymentStatus, relativeAge } from '../../lib/kubernetes'
import type { Option, StatusTone } from '../../widgets'
import { type ResourceStatusBadge, StatusBadge } from '../resources'

const STATUS_LABEL: Record<DeploymentStatus, string> = {
  available: 'Available',
  progressing: 'Progressing',
  degraded: 'Degraded',
  paused: 'Paused',
  'scaled-to-zero': 'Scaled to zero',
}

const STATUS_TONE: Record<DeploymentStatus, StatusTone> = {
  available: 'good',
  progressing: 'warning',
  degraded: 'critical',
  paused: 'off',
  'scaled-to-zero': 'off',
}

/** The statuses and their labels, in the order the Status filter lists them. */
export const deploymentStatusOptions: Option[] = (
  ['available', 'progressing', 'degraded', 'paused', 'scaled-to-zero'] as const
).map((status) => ({ value: status, label: STATUS_LABEL[status] }))

/** A status as the detail header's badge: its tone and its word. */
export function resourceStatusFor(status: DeploymentStatus): ResourceStatusBadge {
  return { tone: STATUS_TONE[status], label: STATUS_LABEL[status] }
}

export interface DeploymentStatusBadgeProps {
  status: DeploymentStatus
}

/** A Deployment's status as the shared badge: a dot and its word, so colour is never the only signal. */
export function DeploymentStatusBadge({ status }: DeploymentStatusBadgeProps) {
  return <StatusBadge {...resourceStatusFor(status)} />
}

const barFill: Record<StatusTone, string> = {
  good: css({ bg: 'green.9' }),
  warning: css({ bg: 'amber.9' }),
  critical: css({ bg: 'red.9' }),
  off: css({ bg: 'gray.6' }),
}

/** The ready bar's tone: gray while paused or scaled to zero, red when degraded, green when
 * complete, else amber. */
export function readyTone(ready: number, desired: number, status: DeploymentStatus): StatusTone {
  if (status === 'paused' || status === 'scaled-to-zero') return 'off'
  if (status === 'degraded') return 'critical'
  return ready >= desired ? 'good' : 'warning'
}

/** `ready / desired` as a percentage; a Deployment scaled to zero is complete. */
export function readyPercent(ready: number, desired: number): number {
  if (desired <= 0) return 100
  return Math.min(100, Math.max(0, Math.round((ready / desired) * 100)))
}

export interface ToneBarProps {
  value: number
  max: number
  tone: StatusTone
  /** Defaults to `xs`. */
  size?: 'xs' | 'sm'
}

/** A thin bar filled to `value / max` in the tone's colour (a `max` of 0 reads full). Decorative:
 * the number beside it says the same in words. */
export function ToneBar({ value, max, tone, size = 'xs' }: ToneBarProps) {
  return (
    <Progress.Root
      value={readyPercent(value, max)}
      min={0}
      max={100}
      size={size}
      shape="full"
      aria-hidden="true"
      w="full"
    >
      <Progress.Track>
        <Progress.Range className={barFill[tone]} />
      </Progress.Track>
    </Progress.Root>
  )
}

export interface ReadyCellProps {
  ready: number
  desired: number
  status: DeploymentStatus
}

/** "{ready}/{desired}" and a 48px bar beside it. */
export function ReadyCell({ ready, desired, status }: ReadyCellProps) {
  return (
    <HStack gap="2" whiteSpace="nowrap">
      <Text as="span" fontVariantNumeric="tabular-nums" minW="8">
        {`${ready}/${desired}`}
      </Text>
      <styled.span display="block" w="12" flexShrink="0">
        <ToneBar value={ready} max={desired} tone={readyTone(ready, desired, status)} />
      </styled.span>
    </HStack>
  )
}

export interface LabelChipsProps {
  labels: Record<string, string>
  /** Chips shown before "+N"; defaults to 3. */
  max?: number
  /** Shown when there are no labels; defaults to "None". */
  empty?: string
  /** Let the chips flow onto more rows; defaults to `true`. `false` keeps one row. */
  wrap?: boolean
}

/** `key=value` chips in the mono face, the first `max` of them and "+N" for the rest. */
export function LabelChips({ labels, max = 3, empty = 'None', wrap = true }: LabelChipsProps) {
  const pairs = Object.entries(labels).map(([key, value]) => `${key}=${value}`)
  if (pairs.length === 0) {
    return (
      <Text as="span" color="fg.subtle">
        {empty}
      </Text>
    )
  }
  const shown = pairs.slice(0, max)
  const hidden = pairs.slice(max)
  return (
    <HStack gap="1" flexWrap={wrap ? 'wrap' : 'nowrap'} minW="0">
      {shown.map((pair) => (
        <Code key={pair} size="sm" whiteSpace="nowrap">
          {pair}
        </Code>
      ))}
      {hidden.length > 0 ? (
        <Text as="span" textStyle="xs" color="fg.muted" whiteSpace="nowrap">
          <span aria-hidden="true">{`+${hidden.length}`}</span>
          <styled.span srOnly>{`and ${hidden.length} more: ${hidden.join(', ')}`}</styled.span>
        </Text>
      ) : null}
    </HStack>
  )
}

export interface AgeCellProps {
  /** An ISO timestamp. */
  from: string
  /** "Now", host-supplied so server and client agree. */
  now: string
}

/** A kubectl-style age ("42d") in a `time` element; "—" without a timestamp. */
export function AgeCell({ from, now }: AgeCellProps) {
  if (!from) {
    return (
      <Text as="span" color="fg.subtle">
        —
      </Text>
    )
  }
  return (
    <styled.time dateTime={from} whiteSpace="nowrap" fontVariantNumeric="tabular-nums">
      {relativeAge(from, now)}
    </styled.time>
  )
}
