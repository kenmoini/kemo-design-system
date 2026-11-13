'use client'
import { useEffect, useRef } from 'react'
import { Box, HStack, Stack, styled } from '../../../styled-system/jsx'
import { Heading, Text } from '../../components/ui'
import { StatusActionButton } from './status-action'
import type { StatusLayoutProps } from './types'

// The page behind everything: Nightfall under a dark veil, slightly desaturated. The filter sits on
// this element only, so text and controls keep their true colours.
const Backdrop = styled('div', {
  base: { position: 'fixed', inset: '0', zIndex: '-1', bgGradient: 'status' },
})

// The large decorative status code (or word) in the top-right corner, faint like the mockup's 6%
// white. Below `md` it sits clear of the brand row. These sizes are for codes; a longer word gets
// `wordSize` inline instead. The page root clips what overflows.
const Watermark = styled('div', {
  base: {
    position: 'absolute',
    top: { base: '12', md: '-0.12em' },
    right: { base: '-0.08em', md: '-0.04em' },
    fontSize: { base: 'clamp(64px, 20vw, 140px)', md: 'clamp(160px, 28vw, 320px)' },
    fontWeight: 'bold',
    letterSpacing: '-0.06em',
    lineHeight: '1',
    color: 'white.a1',
    userSelect: 'none',
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
  },
})

/**
 * The size for a watermark longer than a three-character code, scaled so the whole word fits the
 * width at every breakpoint; `undefined` for a code, which keeps the styled responsive sizes.
 */
function wordSize(text: string): string | undefined {
  const chars = Math.max(text.length, 3)
  return chars > 3 ? `clamp(48px, calc(110vw / ${chars}), 240px)` : undefined
}

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
  // The latest callback, read when the interval fires: an inline `onRefresh` from a parent that
  // re-renders (a live clock, say) must not restart the timer.
  const onRefreshRef = useRef(onRefresh)
  useEffect(() => {
    onRefreshRef.current = onRefresh
  })
  useEffect(() => {
    if (typeof refreshIntervalMs !== 'number' || !(refreshIntervalMs > 0)) return
    const id = setInterval(
      () => (onRefreshRef.current ?? (() => window.location.reload()))(),
      refreshIntervalMs,
    )
    return () => clearInterval(id)
  }, [refreshIntervalMs])

  const watermarkText = watermark ?? String(code ?? '')
  const watermarkSize = wordSize(watermarkText)
  const labelText = code !== undefined && code !== '' ? `${code} · ${label}` : label
  const footerLeft = footerNote ?? (requestId ? `Request ID ${requestId}` : null)
  const hasFooter = Boolean(footerLeft || version)

  // A flex column, every row in flow. The message's auto margin anchors it bottom-left on `md`+ (top
  // margin) and keeps the footer at the bottom below `md` (bottom margin) when there is room; on a
  // short viewport the page grows and scrolls instead of clipping it.
  return (
    <Box
      className="dark"
      colorScheme="dark"
      position="relative"
      isolation="isolate"
      display="flex"
      flexDirection="column"
      minH="100dvh"
      overflow="hidden"
      bg="canvas"
      color="fg.default"
    >
      <Backdrop aria-hidden filter="auto" saturate="0.85" />
      {watermarkText ? (
        <Watermark
          aria-hidden="true"
          data-part="watermark"
          style={watermarkSize ? { fontSize: watermarkSize } : undefined}
        >
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
      {/* `relative` keeps the message (and the footer) painted above the absolute watermark. */}
      <Box
        as="main"
        position="relative"
        mt={{ md: 'auto' }}
        mb={{ base: 'auto', md: '0' }}
        px="8"
        pt={{ base: '24', md: '16' }}
        pb={hasFooter ? '4' : '16'}
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
            <HStack columnGap="6" rowGap="1" flexWrap="wrap" textStyle="sm">
              {meta.map((item) => (
                <Text as="span" key={item.label} color="fg.muted">
                  {item.label}{' '}
                  <Text as="span" color="fg.default" fontWeight="medium">
                    {item.value}
                  </Text>
                </Text>
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
      {hasFooter ? (
        <HStack
          position="relative"
          mt="4"
          px="8"
          pb={{ base: '20', sm: '4' }}
          justify="space-between"
          textStyle="xs"
          color="fg.muted"
        >
          <Box fontVariantNumeric="tabular-nums">{footerLeft}</Box>
          <Box>{version}</Box>
        </HStack>
      ) : null}
    </Box>
  )
}
