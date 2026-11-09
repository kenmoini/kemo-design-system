import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import * as Field from './field'
import { Input } from './input'

describe('Field', () => {
  it('propagates the invalid state to the input and shows the error text', () => {
    render(
      <Field.Root invalid>
        <Field.Label>Email</Field.Label>
        <Input />
        <Field.ErrorText>Required</Field.ErrorText>
      </Field.Root>,
    )
    expect(screen.getByRole('textbox')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('Required')).toBeVisible()
  })
})
