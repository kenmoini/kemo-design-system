'use client'
import { useEffect } from 'react'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Heading, Text } from '../../components/ui'
import { StatusActionButton } from './status-action'
import type { StatusLayoutProps } from './types'

// The page behind everything: Nightfall under a dark veil, slightly desaturated. The filter sits on
// this element only, so text and controls keep their true colours.
const Backdrop = styled('div', {
  base: { position: 'fixed', inset: '0', zIndex: '-1', bgGradient: 'status' },
})

// The large decorative status code in the top-right corner.
const Watermark = styled('div', {
  base: {
    position: 'absolute',
    top: '-0.12em',
    right: '-0.04em',
    fontSize: 'clamp(160px, 28vw, 320px)',
    fontWeight: 'bold',
    letterSpacing: '-0.06em',
    lineHeight: '1',
    color: 'white.a3',
    userSelect: 'none',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
})

const Dot = styled('span', {
  base: { display: 'inline-block', w: '2', h: '2', borderRadius: 'full', flexShrink: '0' },
})

/**
 * The bare dark page every status page (404, 500, maintenance, ...) renders: a muted Nightfall
 * backdrop, a decorative watermark, the message block anchored bottom-left and a quiet footer.
 */
export function StatusLayout({
  code,
  label,
  title,
  description,
  tone = 'neutral',
  watermark,
  meta,
  actions,
  requestId,
  version,
  footerNote,
  logo,
  brand,
  linkComponent,
  refreshIntervalMs,
  onRefresh,
}: StatusLayoutProps) {
  useEffect(() => {
    if (typeof refreshIntervalMs !== 'number' || !(refreshIntervalMs > 0)) return
    const id = setInterval(
      () => (onRefresh ?? (() => window.location.reload()))(),
      refreshIntervalMs,
    )
    return () => clearInterval(id)
  }, [refreshIntervalMs, onRefresh])

  const watermarkText = watermark ?? String(code ?? '')
  const labelText = code !== undefined && code !== '' ? `${code} · ${label}` : label
  const footerLeft = footerNote ?? (requestId ? `Request ID ${requestId}` : null)

  return (
    <Box
      className="dark"
      colorScheme="dark"
      position="relative"
      isolation="isolate"
      minH="100dvh"
      overflow="hidden"
      bg="canvas"
      color="fg.default"
    >
      <Backdrop aria-hidden filter="auto" saturate="0.85" />
      {watermarkText ? (
        <Watermark aria-hidden="true" data-part="watermark">
          {watermarkText}
        </Watermark>
      ) : null}
      <HStack gap="3" position="relative" px="8" pt="7">
        {logo}
        {brand ? (
          <Text as="span" textStyle="sm" color="fg.muted">
            {brand}
          </Text>
        ) : null}
      </HStack>
      <Box
        as="main"
        position={{ base: 'static', md: 'absolute' }}
        bottom={{ md: '16' }}
        left={{ md: '8' }}
        px={{ base: '8', md: '0' }}
        pt={{ base: '24', md: '0' }}
        pb={{ base: '16', md: '0' }}
      >
        <Stack maxW="32rem" gap="4">
          <HStack gap="3">
            <Box w="8" h="1px" bg="white.a6" />
            <HStack gap="2">
              {tone === 'critical' ? (
                <Dot data-testid="status-dot" aria-hidden="true" bg="red.9" />
              ) : tone === 'warning' ? (
                <Dot data-testid="status-dot" aria-hidden="true" bg="amber.9" />
              ) : null}
              <Text as="span" textStyle="xs" color="fg.muted">
                {labelText}
              </Text>
            </HStack>
          </HStack>
          <Heading
            as="h1"
            textStyle={{ base: '2xl', md: '3xl' }}
            fontWeight="semibold"
            letterSpacing="tight"
          >
            {title}
          </Heading>
          {description ? <Text color="fg.muted">{description}</Text> : null}
          {meta && meta.length > 0 ? (
            <HStack gap="6" textStyle="sm">
              {meta.map((item) => (
                <Stack key={item.label} gap="0">
                  <Text as="span" color="fg.muted">
                    {item.label}
                  </Text>
                  <Text as="span" color="fg.default" fontWeight="medium">
                    {item.value}
                  </Text>
                </Stack>
              ))}
            </HStack>
          ) : null}
          {actions && actions.length > 0 ? (
            <HStack gap="2" flexWrap="wrap">
              {actions.map((action, index) => (
                <StatusActionButton
                  key={`${index}-${action.label}`}
                  action={action}
                  index={index}
                  linkComponent={linkComponent}
                />
              ))}
            </HStack>
          ) : null}
        </Stack>
      </Box>
      {footerLeft || version ? (
        <HStack
          position="absolute"
          insetX="8"
          bottom="4"
          justify="space-between"
          textStyle="xs"
          color="fg.subtle"
        >
          <Box fontVariantNumeric="tabular-nums">{footerLeft}</Box>
          <Box>{version}</Box>
        </HStack>
      ) : null}
    </Box>
  )
}
