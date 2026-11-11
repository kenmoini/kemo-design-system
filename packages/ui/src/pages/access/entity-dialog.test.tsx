import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../test/layout'
import { ConfirmDialog } from './confirm-dialog'
import { EntityDialog } from './entity-dialog'
import { TextField } from './forms/form-fields'

function renderDialog(onOpenChange = vi.fn()) {
  render(
    <EntityDialog
      open
      onOpenChange={onOpenChange}
      title="Add user"
      description="They'll get an email with a link to set a password."
    >
      <TextField label="Full name" />
      <TextField label="Email" />
    </EntityDialog>,
  )
  return onOpenChange
}

beforeEach(() => {
  stubLayout()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('EntityDialog', () => {
  it('opens with its title and description', async () => {
    renderDialog()
    const dialog = await screen.findByRole('dialog', { name: 'Add user' })
    expect(dialog).toHaveAccessibleDescription(
      "They'll get an email with a link to set a password.",
    )
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument()
  })

  it('traps focus on the first field', async () => {
    renderDialog()
    await screen.findByRole('dialog', { name: 'Add user' })
    await waitFor(() => expect(screen.getAllByRole('textbox')[0]).toHaveFocus())
    expect(screen.getAllByRole('textbox')[0]).toHaveAccessibleName('Full name')
  })

  it('asks to close on Escape', async () => {
    const user = userEvent.setup()
    const onOpenChange = renderDialog()
    await screen.findByRole('dialog', { name: 'Add user' })
    await waitFor(() => expect(screen.getAllByRole('textbox')[0]).toHaveFocus())
    await user.keyboard('{Escape}')
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('renders nothing while closed', () => {
    render(
      <EntityDialog open={false} onOpenChange={() => {}} title="Add user">
        <TextField label="Full name" />
      </EntityDialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('ConfirmDialog', () => {
  it('focuses Cancel, then confirms and closes', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete Priya Natarajan?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    )
    const dialog = await screen.findByRole('alertdialog', { name: 'Delete Priya Natarajan?' })
    expect(dialog).toHaveAccessibleDescription("This can't be undone.")
    expect(dialog).toHaveAttribute('aria-describedby', screen.getByText("This can't be undone.").id)
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus())

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('cancels without confirming', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onOpenChange = vi.fn()
    render(
      <ConfirmDialog
        open
        onOpenChange={onOpenChange}
        title="Delete 2 users?"
        description="This can't be undone."
        confirmLabel="Delete"
        onConfirm={onConfirm}
      />,
    )
    await screen.findByRole('alertdialog', { name: 'Delete 2 users?' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
