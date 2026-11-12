import { render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { YamlEditor } from './yaml-editor'

// The CodeMirror chunk fails to load (offline, a stale deploy): the text stays readable.
vi.mock('./extensions', () => {
  throw new Error('chunk failed')
})

it('logs a failed CodeMirror load and keeps the placeholder', async () => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => {})
  render(<YamlEditor value="kind: Deployment" ariaLabel="YAML" />)
  await waitFor(() => expect(error).toHaveBeenCalled())
  const [message, cause] = error.mock.calls[0]!
  expect(message).toBe('YamlEditor: CodeMirror failed to load')
  expect(cause).toBeInstanceOf(Error)
  expect(screen.getByText('kind: Deployment').tagName).toBe('PRE')
  expect(screen.queryByRole('textbox')).toBeNull()
  error.mockRestore()
})
