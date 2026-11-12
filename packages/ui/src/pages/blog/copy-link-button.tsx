'use client'
import { useEffect, useRef, useState } from 'react'
import { styled } from '../../../styled-system/jsx'
import { Button, type ButtonProps } from '../../components/ui'

type CopyState = 'idle' | 'copied' | 'failed'

export interface CopyLinkButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  label?: string
}

/** Copies the current page address; the label confirms (or reports failure) for two seconds. */
export function CopyLinkButton({ label = 'Copy link', ...buttonProps }: CopyLinkButtonProps) {
  const [state, setState] = useState<CopyState>('idle')
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  async function copy() {
    let next: CopyState = 'failed'
    try {
      await navigator.clipboard.writeText(window.location.href)
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
