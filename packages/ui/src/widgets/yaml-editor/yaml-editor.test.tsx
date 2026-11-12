import { act, render, renderHook, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { YamlEditorInstance } from './extensions'
import { useYamlDocument } from './use-yaml-document'
import { YamlEditor, type YamlEditorProps } from './yaml-editor'

const deployment = [
  'apiVersion: apps/v1',
  'kind: Deployment',
  'spec:',
  '  replicas: 2',
  '  strategy:',
  '    type: RollingUpdate',
  '',
].join('\n')

const schema = {
  type: 'object',
  properties: {
    spec: {
      type: 'object',
      properties: {
        replicas: { type: 'integer' },
        strategy: {
          type: 'object',
          properties: { type: { enum: ['Recreate', 'RollingUpdate'] } },
        },
      },
    },
  },
}

async function mount(props: Partial<YamlEditorProps> = {}) {
  let editor: YamlEditorInstance | undefined
  const element = (extra: Partial<YamlEditorProps> = {}) => (
    <YamlEditor
      value={deployment}
      ariaLabel="Deployment YAML"
      onReady={(e) => (editor = e)}
      {...props}
      {...extra}
    />
  )
  const utils = render(element())
  const textbox = await screen.findByRole('textbox', { name: 'Deployment YAML' })
  return {
    textbox,
    editor: editor!,
    rerender: (extra: Partial<YamlEditorProps>) => utils.rerender(element(extra)),
  }
}

describe('YamlEditor', () => {
  it('renders the value in a labelled multi-line textbox', async () => {
    const { textbox } = await mount()
    expect(textbox).toHaveTextContent('kind: Deployment')
    expect(textbox).toHaveTextContent('type: RollingUpdate')
    expect(textbox).toHaveAttribute('aria-multiline', 'true')
    expect(document.querySelector('pre')).toBeNull()
  })

  it('calls onChange with the new text when typing', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { textbox, editor } = await mount({ onChange })
    editor.view.dispatch({ selection: { anchor: deployment.length } })
    textbox.focus()
    await user.keyboard('paused: true')
    expect(onChange).toHaveBeenLastCalledWith(`${deployment}paused: true`)
  })

  it('replaces the text when the value changes, without calling onChange', async () => {
    const onChange = vi.fn()
    const { textbox, rerender } = await mount({ onChange })
    rerender({ value: 'kind: Service\n' })
    expect(textbox).toHaveTextContent('kind: Service')
    expect(textbox).not.toHaveTextContent('Deployment')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('keeps the cursor when the value changes elsewhere', async () => {
    const onCursorPath = vi.fn()
    const { editor, rerender } = await mount({ onCursorPath })
    act(() => {
      editor.view.dispatch({ selection: { anchor: deployment.indexOf('replicas') + 2 } })
    })
    await waitFor(() => expect(onCursorPath).toHaveBeenCalledWith(['spec', 'replicas']))
    onCursorPath.mockClear()
    // The server copy changed above the cursor (a new label), as after a save or a restart.
    const changed = deployment.replace(
      'kind: Deployment\n',
      'kind: Deployment\nmetadata:\n  labels: { app: web }\n',
    )
    rerender({ value: changed })
    expect(editor.view.state.doc.toString()).toBe(changed)
    expect(editor.view.state.selection.main.head).toBe(changed.indexOf('replicas') + 2)
    await new Promise((resolve) => setTimeout(resolve, 100))
    expect(onCursorPath).not.toHaveBeenCalled()
  })

  it('does not clobber typing in a controlled round trip', async () => {
    const user = userEvent.setup()
    let editor: YamlEditorInstance | undefined
    function Controlled() {
      const doc = useYamlDocument({ initial: deployment })
      return (
        <YamlEditor
          value={doc.text}
          onChange={doc.setText}
          ariaLabel="Deployment YAML"
          onReady={(e) => (editor = e)}
        />
      )
    }
    render(<Controlled />)
    const textbox = await screen.findByRole('textbox', { name: 'Deployment YAML' })
    editor!.view.dispatch({ selection: { anchor: deployment.length } })
    textbox.focus()
    await user.keyboard('paused: true')
    await new Promise((resolve) => setTimeout(resolve, 20))
    const { state } = editor!.view
    expect(state.doc.toString()).toBe(`${deployment}paused: true`)
    expect(state.selection.main.head).toBe(state.doc.length)
  })

  it('ignores a late echo of its own earlier text', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { textbox, editor, rerender } = await mount({ onChange })
    editor.view.dispatch({ selection: { anchor: deployment.length } })
    textbox.focus()
    await user.keyboard('ab')
    // A host a render behind passes back the text after "a" while the editor holds "ab".
    rerender({ value: `${deployment}a` })
    expect(editor.view.state.doc.toString()).toBe(`${deployment}ab`)
    rerender({ value: `${deployment}ab` })
    expect(editor.view.state.doc.toString()).toBe(`${deployment}ab`)
    // An outside text is still applied.
    rerender({ value: 'kind: Service\n' })
    expect(editor.view.state.doc.toString()).toBe('kind: Service\n')
  })

  it('reports the schema enum violation with its line', async () => {
    const onProblems = vi.fn()
    await mount({
      schema,
      onProblems,
      value: 'spec:\n  strategy:\n    type: RollingUpdat\n',
    })
    await waitFor(() =>
      expect(onProblems).toHaveBeenLastCalledWith([
        expect.objectContaining({
          line: 3,
          severity: 'error',
          message: expect.stringContaining('RollingUpdate'),
        }),
      ]),
    )
    const [problem] = onProblems.mock.lastCall![0]
    expect(problem.from).toBe('spec:\n  strategy:\n    type: '.length)
    expect(problem.to).toBe(problem.from + 'RollingUpdat'.length)
  })

  it('reports YAML syntax errors as problems and clears them once fixed', async () => {
    const onProblems = vi.fn()
    const { editor } = await mount({ schema, onProblems, value: 'spec:\n  replicas: 2\n bad: 1\n' })
    await waitFor(() =>
      expect(onProblems).toHaveBeenLastCalledWith([
        expect.objectContaining({ line: 3, severity: 'error' }),
      ]),
    )
    const fixed = 'spec:\n  replicas: 2\n'
    act(() => {
      editor.view.dispatch({
        changes: { from: 0, to: editor.view.state.doc.length, insert: fixed },
      })
    })
    await waitFor(() => expect(onProblems).toHaveBeenLastCalledWith([]), { timeout: 2000 })
  })

  it('re-lints when the schema prop changes', async () => {
    const onProblems = vi.fn()
    const value = 'spec:\n  strategy:\n    type: RollingUpdat\n'
    const { rerender } = await mount({ onProblems, value })
    await waitFor(() => expect(onProblems).toHaveBeenLastCalledWith([]))
    // Each swap waits out the 500 ms lint delay.
    rerender({ value, schema })
    await waitFor(
      () => expect(onProblems).toHaveBeenLastCalledWith([expect.objectContaining({ line: 3 })]),
      { timeout: 2000 },
    )
    rerender({ value, schema: undefined })
    await waitFor(() => expect(onProblems).toHaveBeenLastCalledWith([]), { timeout: 2000 })
  })

  it('reports the key path under the cursor, once per burst of moves', async () => {
    const onCursorPath = vi.fn()
    const { editor } = await mount({ onCursorPath })
    editor.view.dispatch({ selection: { anchor: deployment.indexOf('replicas') + 1 } })
    editor.view.dispatch({ selection: { anchor: deployment.indexOf('type:') + 1 } })
    await waitFor(() => expect(onCursorPath).toHaveBeenCalledWith(['spec', 'strategy', 'type']))
    expect(onCursorPath).toHaveBeenCalledTimes(1)
  })

  it('prevents edits while readOnly, and allows them again when it turns off', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { textbox, editor, rerender } = await mount({ onChange, readOnly: true })
    expect(textbox).toHaveAttribute('aria-readonly', 'true')
    editor.view.dispatch({ selection: { anchor: deployment.length } })
    textbox.focus()
    await user.keyboard('x')
    expect(onChange).not.toHaveBeenCalled()
    expect(editor.view.state.doc.toString()).toBe(deployment)

    rerender({ readOnly: false })
    expect(textbox).not.toHaveAttribute('aria-readonly')
    editor.view.dispatch({ selection: { anchor: deployment.length } })
    textbox.focus()
    await user.keyboard('x')
    expect(onChange).toHaveBeenLastCalledWith(`${deployment}x`)
  })

  it('moves the cursor to the key a cursorPathRequest names', async () => {
    const { textbox, editor, rerender } = await mount()
    rerender({ cursorPathRequest: ['spec', 'strategy', 'type'] })
    await waitFor(() =>
      expect(editor.view.state.selection.main.head).toBe(deployment.indexOf('type:')),
    )
    expect(textbox).toHaveFocus()
  })

  it('moves the cursor to an offset, clamped to the text, and focuses the editor', async () => {
    const { textbox, editor } = await mount()
    act(() => editor.moveToOffset(deployment.indexOf('RollingUpdate')))
    expect(editor.view.state.selection.main.head).toBe(deployment.indexOf('RollingUpdate'))
    expect(textbox).toHaveFocus()
    act(() => editor.moveToOffset(deployment.length + 100))
    expect(editor.view.state.selection.main.head).toBe(deployment.length)
    act(() => editor.moveToOffset(-5))
    expect(editor.view.state.selection.main.head).toBe(0)
  })

  it('indents with Tab, saves with Mod-s and lets focus out with Escape', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onSave = vi.fn()
    const { textbox, editor } = await mount({ onChange, onSave })
    editor.view.dispatch({ selection: { anchor: deployment.indexOf('kind') } })
    textbox.focus()
    await user.keyboard('{Tab}')
    expect(onChange).toHaveBeenLastCalledWith(deployment.replace('kind:', '  kind:'))
    await user.keyboard('{Control>}s{/Control}')
    expect(onSave).toHaveBeenCalledTimes(1)
    await user.keyboard('{Escape}')
    expect(textbox).not.toHaveFocus()
  })

  it('unmounts before the import resolves without creating a view', async () => {
    const onReady = vi.fn()
    const error = vi.spyOn(console, 'error')
    const { unmount } = render(<YamlEditor value={deployment} ariaLabel="YAML" onReady={onReady} />)
    unmount()
    await import('./extensions')
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(onReady).not.toHaveBeenCalled()
    expect(document.querySelector('.cm-editor')).toBeNull()
    expect(error).not.toHaveBeenCalled()
    error.mockRestore()
  })

  it('server-renders a pre placeholder with the text at the editor height', () => {
    const html = renderToString(<YamlEditor value={deployment} ariaLabel="Deployment YAML" />)
    expect(html).toContain('<pre')
    expect(html).toContain('kind: Deployment')
    expect(html).toContain('height:32rem')
    expect(html).not.toContain('cm-')
    expect(renderToString(<YamlEditor value="a: 1" ariaLabel="YAML" height="20rem" />)).toContain(
      'height:20rem',
    )
  })
})

describe('useYamlDocument', () => {
  it('tracks dirty against the baseline and resets to it or to a new one', () => {
    const { result } = renderHook(() => useYamlDocument({ initial: 'a: 1\n' }))
    expect(result.current).toMatchObject({ text: 'a: 1\n', dirty: false })
    act(() => result.current.setText('a: 2\n'))
    expect(result.current).toMatchObject({ text: 'a: 2\n', dirty: true })
    act(() => result.current.reset())
    expect(result.current).toMatchObject({ text: 'a: 1\n', dirty: false })
    act(() => result.current.setText('a: 3\n'))
    // Saving the current text makes it the new baseline.
    act(() => result.current.reset('a: 3\n'))
    expect(result.current).toMatchObject({ text: 'a: 3\n', dirty: false })
  })
})
