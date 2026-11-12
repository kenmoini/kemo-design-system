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
    await waitFor(() => expect(onProblems).toHaveBeenLastCalledWith([]))
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
