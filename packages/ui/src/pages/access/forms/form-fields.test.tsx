import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { stubLayout } from '../../../test/layout'
import { TagsField } from './form-fields'

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
