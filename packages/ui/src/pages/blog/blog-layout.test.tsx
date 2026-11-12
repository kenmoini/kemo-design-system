import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../test/layout'
import type { LinkComponent } from '../auth/types'
import { BlogLayout } from './blog-layout'

const base = { brand: 'Kemo', indexHref: '/blog' }

beforeEach(() => {
  stubLayout()
})
afterEach(() => {
  vi.restoreAllMocks()
})

describe('BlogLayout', () => {
  it('renders header, main and footer landmarks with the brand link', () => {
    render(
      <BlogLayout {...base}>
        <p>Body</p>
      </BlogLayout>,
    )
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toHaveTextContent('Body')
    expect(screen.getByRole('contentinfo')).toHaveTextContent(`© ${new Date().getFullYear()} Kemo`)
    expect(screen.getByRole('link', { name: /Kemo.*Blog/ })).toHaveAttribute('href', '/blog')
  })

  it('prints the year it is given, so a static page can pin it', () => {
    render(
      <BlogLayout {...base} year={2031}>
        x
      </BlogLayout>,
    )
    expect(screen.getByRole('contentinfo')).toHaveTextContent('© 2031 Kemo')
  })

  it('marks the current nav link and omits the nav when there are no links', () => {
    const { rerender } = render(
      <BlogLayout
        {...base}
        nav={[
          { label: 'Posts', href: '/blog', current: true },
          { label: 'About', href: '/about' },
        ]}
      >
        x
      </BlogLayout>,
    )
    const nav = screen.getByRole('navigation', { name: 'Blog' })
    expect(nav).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Posts' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'About' })).not.toHaveAttribute('aria-current')
    rerender(
      <BlogLayout {...base} nav={[]}>
        x
      </BlogLayout>,
    )
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  })

  it('offers Subscribe only when the host handles it', () => {
    const { rerender } = render(<BlogLayout {...base}>x</BlogLayout>)
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument()
    rerender(
      <BlogLayout {...base} onSubscribe={async () => {}} hideSubscribe>
        x
      </BlogLayout>,
    )
    expect(screen.queryByRole('button', { name: 'Subscribe' })).not.toBeInTheDocument()
    rerender(
      <BlogLayout {...base} onSubscribe={async () => {}}>
        x
      </BlogLayout>,
    )
    expect(screen.getByRole('button', { name: 'Subscribe' })).toBeInTheDocument()
  })

  it('opens the subscribe dialog and returns focus on close', async () => {
    const user = userEvent.setup()
    render(
      <BlogLayout {...base} onSubscribe={async () => {}}>
        x
      </BlogLayout>,
    )
    const trigger = screen.getByRole('button', { name: 'Subscribe' })
    await user.click(trigger)
    const dialog = await screen.findByRole('dialog', { name: 'Get new posts by email' })
    expect(dialog).toHaveAccessibleDescription('One email per post. Unsubscribe at any time.')
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(trigger).toHaveFocus()
  })

  it('shows a fresh form when the dialog is reopened after success', async () => {
    const user = userEvent.setup()
    render(
      <BlogLayout {...base} onSubscribe={async () => {}}>
        x
      </BlogLayout>,
    )
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    await user.type(await screen.findByLabelText('Email'), 'ada@example.com')
    await user.click(screen.getAllByRole('button', { name: 'Subscribe' }).at(-1)!)
    expect(await screen.findByRole('status')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: 'Subscribe' }))
    expect(await screen.findByLabelText('Email')).toHaveValue('')
  })

  it('routes links through the host link component', () => {
    const Host: LinkComponent = ({ href, ...rest }) => <a data-host="yes" href={href} {...rest} />
    render(
      <BlogLayout {...base} linkComponent={Host} nav={[{ label: 'About', href: '/about' }]}>
        x
      </BlogLayout>,
    )
    expect(screen.getByRole('link', { name: /Kemo/ })).toHaveAttribute('data-host', 'yes')
    expect(screen.getByRole('link', { name: 'About' })).toHaveAttribute('data-host', 'yes')
  })
})
