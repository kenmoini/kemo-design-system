'use client'
import { CopyLinkButton } from '../blog/copy-link-button'

/** Copies the address of a post (`#post-{id}`) or, without `href`, of the page. */
export function ShareButton({ href, label = 'Share' }: { href?: string; label?: string }) {
  return <CopyLinkButton label={label} href={href} />
}
