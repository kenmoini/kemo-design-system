'use client'
import { useEffect, useRef, useState } from 'react'
import { styled } from '../../../styled-system/jsx'
import { Button, type ButtonProps } from '../../components/ui'

type CopyState = 'idle' | 'copied' | 'failed'

export interface CopyLinkButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  label?: string
  /** Copy this address (resolved against the page) instead of the page address. */
  href?: string
}

/** Copies the current page address; the label confirms (or reports failure) for two seconds. */
export function CopyLinkButton({ label = 'Copy link', href, ...buttonProps }: CopyLinkButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    let next: CopyState = 'failed'
    try {
      await navigator.clipboard.writeText(
        href === undefined ? window.location.href : new URL(href, window.location.href).toString(),
      )
      next = 'copied'
    } catch {
      // Missing API or a rejected write: fall through to the failed state.
    }
    clearTimeout(timer.current)
    setState(next)
    timer.current = setTimeout(() => setState('idle'), 2000)
  }

  return (
    <>
      <Button variant="outline" size="sm" {...buttonProps} onClick={copy}>
        {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : label}
      </Button>
      <styled.span srOnly role="status">
        {state === 'copied' ? 'Link copied' : state === 'failed' ? 'Copy failed' : ''}
      </styled.span>
    </>
  )
}
