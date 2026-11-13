import { CircleAlertIcon, CircleCheckIcon, InfoIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Flex, styled } from '../../styled-system/jsx'
import { Alert, Button, Icon } from '../components/ui'

export type AlertBannerStatus = 'error' | 'warning' | 'info' | 'success'

const STATUS: Record<AlertBannerStatus, { label: string; icon: ReactNode }> = {
  error: { label: 'Error', icon: <CircleAlertIcon /> },
  warning: { label: 'Warning', icon: <CircleAlertIcon /> },
  info: { label: 'Info', icon: <InfoIcon /> },
  success: { label: 'Success', icon: <CircleCheckIcon /> },
}

export interface AlertBannerProps {
  /** Default `error`. */
  status?: AlertBannerStatus
  title: string
  description: string
  action?: { label: string; onSelect: () => void }
}

export function AlertBanner({ status = 'error', title, description, action }: AlertBannerProps) {
  const { label, icon } = STATUS[status]
  return (
    <Alert.Root status={status} variant="surface">
      {/* Park's Indicator draws the info glyph whatever the status, so the status draws its own. */}
      <Icon aria-hidden="true">{icon}</Icon>
      {/* The action sits under the text on narrow screens and beside it from `sm`. */}
      <Flex flex="1" minW="0" direction={{ base: 'column', sm: 'row' }} align="flex-start" gap="3">
        <Alert.Content>
          <Alert.Title>
            <styled.span srOnly>{`${label}: `}</styled.span>
            {title}
          </Alert.Title>
          <Alert.Description>{description}</Alert.Description>
        </Alert.Content>
        {action ? (
          <Button size="sm" variant="outline" flexShrink="0" onClick={action.onSelect}>
            {action.label}
          </Button>
        ) : null}
      </Flex>
    </Alert.Root>
  )
}
