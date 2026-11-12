import { EditorView } from '@codemirror/view'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { type ReactNode, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import { MEDIA_LG } from '../../layouts/app-shell'
import { stubLayout } from '../../test/layout'
import { setMediaMatches } from '../../test/media'
import { downloadText } from './download'
import { ResourceYamlTab } from './resource-yaml-tab'
import type { ResourceYamlTabProps } from './types'

vi.mock('./download', () => ({ downloadText: vi.fn() }))

// A hand-written CRD: nothing in the tab or the browser may assume an apps/v1 Deployment.
const widgetSchema = {
  title: 'Widget',
  type: 'object',
  properties: {
    spec: {
      type: 'object',
      description: 'The desired state of the widget.',
      properties: {
        replicas: { type: 'integer', description: 'How many widgets to run.' },
        strategy: {
          type: 'object',
          description: 'How new widgets replace old ones.',
          properties: {
            type: {
              type: 'string',
              description: 'The rollout type.',
              enum: ['Recreate', 'RollingUpdate'],
            },
          },
        },
      },
    },
  },
}

const serverYaml = [
  'apiVersion: example.com/v1',
  'kind: Widget',
  'metadata:',
  '  name: demo',
  'spec:',
  '  replicas: 2',
  '  strategy:',
  '    type: RollingUpdate',
  '',
].join('\n')

const scaled = serverYaml.replace('replicas: 2', 'replicas: 3')
const broken = serverYaml.replace('type: RollingUpdate', 'type: RollingUpdat')

type HostProps = Partial<Omit<ResourceYamlTabProps, 'draft'>> & { initialDraft?: string }

async function renderTab({ initialDraft, ...props }: HostProps = {}) {
  const onDraftChange = vi.fn<(text: string | undefined) => void>()
  const onSave = vi.fn<(text: string) => void | Promise<void>>(() => Promise.resolve())
  const onReload = vi.fn()
  const cleanText = vi.fn(() => 'kind: Widget\n')
  function Host() {
    const [draft, setDraft] = useState(initialDraft)
    return (
      <ResourceYamlTab
        yamlText={serverYaml}
        draft={draft}
        onDraftChange={(next) => {
          onDraftChange(next)
          setDraft(next)
        }}
        schema={widgetSchema}
        onSave={onSave}
        onReload={onReload}
        fileName="demo.yaml"
        cleanText={cleanText}
        {...props}
      />
    )
  }
  render(<Host />)
  const textbox = await screen.findByRole('textbox', { name: 'demo.yaml' })
  const view = EditorView.findFromDOM(textbox)!
  return { textbox, view, onDraftChange, onSave, onReload, cleanText }
}

const status = () => screen.getByRole('status')
const saveButton = () => screen.getByRole('button', { name: 'Save' })

let layout: MockInstance
beforeEach(() => {
  layout = stubLayout()
})
afterEach(() => {
  layout.mockRestore()
  vi.mocked(downloadText).mockReset()
})

describe('ResourceYamlTab', () => {
  it('shows the server copy as saved, with Save disabled until there are edits', async () => {
    const { textbox } = await renderTab()
    expect(textbox).toHaveTextContent('kind: Widget')
    expect(status()).toHaveTextContent(/^Saved$/)
    expect(saveButton()).toBeDisabled()
  })

  it('reports edits as the draft, and no draft once the text matches the server copy', async () => {
    const user = userEvent.setup()
    const { textbox, view, onDraftChange } = await renderTab()
    view.dispatch({ selection: { anchor: serverYaml.length } })
    textbox.focus()
    await user.keyboard('x')
    expect(onDraftChange).toHaveBeenLastCalledWith(`${serverYaml}x`)
    expect(status()).toHaveTextContent('Unsaved changes')
    await user.keyboard('{Backspace}')
    expect(onDraftChange).toHaveBeenLastCalledWith(undefined)
    expect(status()).toHaveTextContent(/^Saved$/)
  })

  it('saves the draft and clears it once the save resolves', async () => {
    const user = userEvent.setup()
    const { textbox, onSave, onDraftChange } = await renderTab({ initialDraft: scaled })
    expect(textbox).toHaveTextContent('replicas: 3')
    expect(status()).toHaveTextContent('● Unsaved changes')
    expect(saveButton()).toBeEnabled()
    await user.click(saveButton())
    expect(onSave).toHaveBeenCalledWith(scaled)
    await waitFor(() => expect(onDraftChange).toHaveBeenLastCalledWith(undefined))
    expect(status()).toHaveTextContent(/^Saved$/)
  })

  it('saves with Mod-s inside the editor', async () => {
    const user = userEvent.setup()
    const { textbox, onSave } = await renderTab({ initialDraft: scaled })
    textbox.focus()
    await user.keyboard('{Control>}s{/Control}')
    expect(onSave).toHaveBeenCalledWith(scaled)
  })

  it('shows why a save was rejected and keeps the draft', async () => {
    const user = userEvent.setup()
    const onSave = vi.fn(() => Promise.reject(new Error('metadata.name cannot change')))
    const { onDraftChange } = await renderTab({ initialDraft: scaled, onSave })
    await user.click(saveButton())
    expect(await screen.findByRole('alert')).toHaveTextContent('metadata.name cannot change')
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(status()).toHaveTextContent('Unsaved changes')
  })

  it('blocks save while the document has problems', async () => {
    const user = userEvent.setup()
    const { textbox, onSave } = await renderTab({ initialDraft: broken })
    await waitFor(() => expect(status()).toHaveTextContent('● Unsaved changes · 1 problem'))
    const save = saveButton()
    expect(save).toHaveAttribute('aria-disabled', 'true')
    expect(save).toBeEnabled()
    await user.hover(save)
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Fix the problems first')

    await user.click(save)
    textbox.focus()
    await user.keyboard('{Control>}s{/Control}')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('lists the problems under the editor and jumps to one', async () => {
    const user = userEvent.setup()
    const { textbox, view } = await renderTab({ initialDraft: broken })
    const list = await screen.findByRole('list', { name: 'Problems' })
    const problem = within(list).getByRole('button', { name: /^Line 8 · .*RollingUpdate/ })
    await user.click(problem)
    expect(view.state.selection.main.head).toBe(broken.indexOf('RollingUpdat'))
    expect(textbox).toHaveFocus()
  })

  it('asks before Reload discards the draft, then clears it and reloads', async () => {
    const user = userEvent.setup()
    const { textbox, onDraftChange, onReload } = await renderTab({ initialDraft: scaled })
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    const confirm = await screen.findByRole('alertdialog', { name: 'Discard your changes?' })
    expect(confirm).toHaveTextContent('Reload replaces your edits with the server copy.')
    await user.click(within(confirm).getByRole('button', { name: 'Cancel' }))
    expect(onDraftChange).not.toHaveBeenCalled()
    expect(onReload).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Reload' }))
    const again = await screen.findByRole('alertdialog', { name: 'Discard your changes?' })
    await user.click(within(again).getByRole('button', { name: 'Discard' }))
    expect(onDraftChange).toHaveBeenLastCalledWith(undefined)
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(textbox).toHaveTextContent('replicas: 2')
  })

  it('reloads at once when there is nothing to discard', async () => {
    const user = userEvent.setup()
    const { onReload } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Reload' }))
    expect(onReload).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it('downloads the text and the clean copy from the Download menu', async () => {
    const user = userEvent.setup()
    const { cleanText } = await renderTab({ initialDraft: scaled })
    await user.click(screen.getByRole('button', { name: 'Download' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Download YAML' }))
    expect(downloadText).toHaveBeenLastCalledWith('demo.yaml', scaled)

    await user.click(screen.getByRole('button', { name: 'Download' }))
    await user.click(await screen.findByRole('menuitem', { name: 'Download clean YAML' }))
    expect(cleanText).toHaveBeenCalled()
    expect(downloadText).toHaveBeenLastCalledWith('demo.clean.yaml', 'kind: Widget\n')
  })

  it('says when the server copy changed under the draft', async () => {
    await renderTab({ initialDraft: scaled, serverChanged: true })
    expect(status()).toHaveTextContent('● Unsaved changes · Server copy changed · Reload to see it')
  })

  it('opens the schema browser beside the editor on lg, following the cursor until the reader drills in', async () => {
    setMediaMatches(MEDIA_LG, true)
    const user = userEvent.setup()
    const { textbox, view } = await renderTab()
    const toggle = screen.getByRole('button', { name: 'Schema' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-pressed', 'true')
    const drawer = await screen.findByRole('dialog', { name: 'Schema' })
    expect(drawer).toHaveAttribute('aria-modal', 'false')
    const crumbs = within(drawer).getByRole('navigation', { name: 'breadcrumb' })
    expect(within(crumbs).getByText('Widget')).toHaveAttribute('aria-current', 'page')

    // The browser follows the cursor: on `type`, it lists strategy's fields.
    act(() => view.dispatch({ selection: { anchor: serverYaml.indexOf('type:') + 1 } }))
    await waitFor(() =>
      expect(within(crumbs).getByText('strategy')).toHaveAttribute('aria-current', 'page'),
    )
    // Drilling up holds until the cursor moves again.
    await user.click(within(crumbs).getByRole('button', { name: 'Widget' }))
    expect(within(crumbs).getByText('Widget')).toHaveAttribute('aria-current', 'page')
    act(() => view.dispatch({ selection: { anchor: serverYaml.indexOf('replicas') + 1 } }))
    await waitFor(() =>
      expect(within(crumbs).getByText('spec')).toHaveAttribute('aria-current', 'page'),
    )

    // A field name moves the editor cursor to its key; the drawer stays open beside the editor.
    await user.click(within(drawer).getByRole('button', { name: 'strategy' }))
    await waitFor(() => expect(view.state.selection.main.head).toBe(serverYaml.indexOf('strategy')))
    expect(textbox).toHaveFocus()
    expect(drawer).toBeInTheDocument()

    await user.click(toggle)
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Schema' })).toBeNull())
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
  })

  it('opens the schema browser as a modal below lg, and a field pick closes it at that key', async () => {
    const user = userEvent.setup()
    const { textbox, view } = await renderTab()
    await user.click(screen.getByRole('button', { name: 'Schema' }))
    const drawer = await screen.findByRole('dialog', { name: 'Schema' })
    expect(drawer).toHaveAttribute('aria-modal', 'true')
    await user.click(within(drawer).getByRole('button', { name: 'Open spec' }))
    await user.click(within(drawer).getByRole('button', { name: 'replicas' }))
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Schema' })).toBeNull())
    await waitFor(() => expect(textbox).toHaveFocus())
    expect(view.state.selection.main.head).toBe(serverYaml.indexOf('replicas'))
    expect(screen.getByRole('button', { name: 'Schema' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('has no Schema button without a schema', async () => {
    await renderTab({ schema: undefined })
    expect(screen.queryByRole('button', { name: 'Schema' })).toBeNull()
  })

  it('lists the editor shortcuts', async () => {
    const user = userEvent.setup()
    await renderTab()
    await user.click(screen.getByRole('button', { name: 'Shortcuts' }))
    const dialog = await screen.findByRole('dialog', { name: 'Editor shortcuts' })
    const terms = within(dialog)
      .getAllByRole('term')
      .map((term) => term.textContent)
    expect(terms).toEqual([
      'Save',
      'Next problem',
      'Problems panel',
      'Fold',
      'Unfold',
      'Indent',
      'Leave editor',
    ])
    expect(within(dialog).getAllByRole('definition')[1]).toHaveTextContent('F8')
  })

  it('renders the create controls and a Create button in create mode', async () => {
    const user = userEvent.setup()
    const controls: ReactNode = <p>Cluster and namespace pickers</p>
    const { onSave, onDraftChange } = await renderTab({ mode: 'create', createControls: controls })
    expect(screen.getByText('Cluster and namespace pickers')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save' })).toBeNull()
    // The starter template is enough to create.
    await user.click(screen.getByRole('button', { name: 'Create' }))
    expect(onSave).toHaveBeenCalledWith(serverYaml)
    await waitFor(() => expect(onDraftChange).toHaveBeenLastCalledWith(undefined))
  })
})
