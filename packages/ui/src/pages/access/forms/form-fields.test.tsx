import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../../test/layout'
import { FormFooter, MultiSelectField, NumberField, SelectField, TagsField } from './form-fields'

function Tags({
  onChange,
  validate,
}: {
  onChange: (value: string[]) => void
  validate?: (tag: string) => boolean
}) {
  const [value, setValue] = useState<string[]>(['openid'])
  return (
    <>
      <TagsField
        label="Scopes"
        helper="Press Enter after each scope."
        value={value}
        onChange={(next) => {
          setValue(next)
          onChange(next)
        }}
        validate={validate}
      />
      <input aria-label="Next field" />
    </>
  )
}

describe('TagsField', () => {
  beforeEach(() => {
    stubLayout()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('adds tags on Enter and on leaving the field, and deletes them', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tags onChange={onChange} />)
    const input = screen.getByRole('textbox', { name: 'Scopes' })
    expect(input).toHaveAccessibleDescription('Press Enter after each scope.')

    await user.type(input, 'profile{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(['openid', 'profile'])
    // Zag empties the input after adding; user-event still tracks the typed text, so reset it.
    await user.clear(input)
    await user.type(input, 'email')
    await user.click(screen.getByRole('textbox', { name: 'Next field' }))
    await waitFor(() => expect(onChange).toHaveBeenLastCalledWith(['openid', 'profile', 'email']))

    await user.click(screen.getByRole('button', { name: 'Delete tag openid' }))
    expect(onChange).toHaveBeenLastCalledWith(['profile', 'email'])
  })

  it('refuses a tag that validate rejects', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Tags onChange={onChange} validate={(tag) => tag.startsWith('https://')} />)
    const input = screen.getByRole('textbox', { name: 'Scopes' })
    await user.type(input, 'ftp://x{Enter}')
    expect(onChange).not.toHaveBeenCalled()
    await user.clear(input)
    await user.type(input, 'https://x{Enter}')
    expect(onChange).toHaveBeenLastCalledWith(['openid', 'https://x'])
  })
})

describe('FormFooter', () => {
  const footer = (submitting: boolean) => (
    <form>
      <input aria-label="Name" />
      <FormFooter onCancel={() => {}} submitLabel="Save changes" submitting={submitting} />
    </form>
  )

  it('gives focus back to the submit button when the wait took it to the page', () => {
    const { rerender } = render(footer(false))
    const submit = screen.getByRole('button', { name: 'Save changes' })
    submit.focus()
    rerender(footer(true))
    expect(screen.getByRole('button', { name: /Save changes/ })).toBeDisabled()
    // A browser drops focus from a button that becomes disabled; jsdom does not, so do it here.
    act(() => submit.blur())
    expect(document.activeElement).toBe(document.body)
    rerender(footer(false))
    expect(submit).toHaveFocus()
  })

  it('leaves focus alone when it moved somewhere else meanwhile', () => {
    const { rerender } = render(footer(false))
    screen.getByRole('button', { name: 'Save changes' }).focus()
    rerender(footer(true))
    const name = screen.getByRole('textbox', { name: 'Name' })
    act(() => name.focus())
    rerender(footer(false))
    expect(name).toHaveFocus()
  })
})

const roleOptions = [
  { value: 'viewer', label: 'Viewer' },
  { value: 'deployer', label: 'Deployer' },
]

describe('SelectField and MultiSelectField', () => {
  beforeEach(() => {
    stubLayout()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // The select recipe stacks a list at `dropdown`, below dialogs and drawers (`modal`), and these
  // fields live in dialogs: their lists stack at `popover` (Zag lifts the positioner to match).
  it('opens its list on the popover layer, above a dialog', async () => {
    const user = userEvent.setup()
    render(<SelectField label="Role" options={roleOptions} value="" onChange={() => {}} />)
    await user.click(screen.getByRole('combobox', { name: 'Role' }))
    expect(await screen.findByRole('listbox')).toHaveClass('z_popover')
  })

  it('opens a multiple list on the popover layer too', async () => {
    const user = userEvent.setup()
    render(<MultiSelectField label="Roles" options={roleOptions} value={[]} onChange={() => {}} />)
    await user.click(screen.getByRole('combobox', { name: 'Roles' }))
    expect(await screen.findByRole('listbox')).toHaveClass('z_popover')
  })

  const clusterOptions = ['east', 'west', 'north', 'south'].map((value) => ({
    value,
    label: value,
  }))

  it('shows every chosen label as a chip by default', () => {
    render(
      <MultiSelectField
        label="Clusters"
        options={clusterOptions}
        value={['east', 'west', 'north']}
        onChange={() => {}}
      />,
    )
    const trigger = screen.getByRole('combobox', { name: 'Clusters' })
    for (const label of ['east', 'west', 'north']) {
      expect(within(trigger).getByText(label)).toBeInTheDocument()
    }
    expect(within(trigger).queryByText(/^\+/)).toBeNull()
  })

  it('caps the chips at maxChips and counts the rest as +N', () => {
    const { rerender } = render(
      <MultiSelectField
        label="Clusters"
        options={clusterOptions}
        value={['east', 'west', 'north', 'south']}
        onChange={() => {}}
        maxChips={2}
      />,
    )
    const trigger = screen.getByRole('combobox', { name: 'Clusters' })
    expect(within(trigger).getByText('east')).toBeInTheDocument()
    expect(within(trigger).getByText('west')).toBeInTheDocument()
    expect(within(trigger).queryByText('north')).toBeNull()
    expect(within(trigger).getByText('+2')).toBeInTheDocument()

    rerender(
      <MultiSelectField
        label="Clusters"
        options={clusterOptions}
        value={['east', 'west']}
        onChange={() => {}}
        maxChips={2}
      />,
    )
    expect(within(trigger).queryByText(/^\+/)).toBeNull()
  })

  it('shows the placeholder when nothing is chosen', () => {
    render(
      <MultiSelectField
        label="Clusters"
        options={clusterOptions}
        value={[]}
        onChange={() => {}}
        placeholder="All clusters"
        maxChips={2}
      />,
    )
    expect(screen.getByRole('combobox', { name: 'Clusters' })).toHaveTextContent('All clusters')
  })
})

describe('NumberField', () => {
  it('puts the input beside the stepper column, with both steppers', () => {
    render(<NumberField label="Port" value={587} onChange={() => {}} />)
    const input = screen.getByRole('spinbutton', { name: 'Port' })
    const increment = screen.getByRole('button', { name: 'increment value' })
    const decrement = screen.getByRole('button', { name: 'decrease value' })

    // Park's control is the absolutely placed stepper column: it holds the triggers, and the input
    // is its sibling inside the root, so the input keeps the field's full width.
    const control = increment.parentElement
    expect(control).toHaveAttribute('data-part', 'control')
    expect(control).toContainElement(decrement)
    expect(control).not.toContainElement(input)
    expect(input.parentElement).toHaveAttribute('data-part', 'root')
    expect(input.parentElement).toBe(control?.parentElement)
  })

  it('steps the value with its triggers', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<NumberField label="Port" value={587} onChange={onChange} />)
    await user.click(screen.getByRole('button', { name: 'increment value' }))
    expect(onChange).toHaveBeenLastCalledWith(588)
    await waitFor(() => expect(screen.getByRole('spinbutton', { name: 'Port' })).toHaveValue('588'))
  })
})
