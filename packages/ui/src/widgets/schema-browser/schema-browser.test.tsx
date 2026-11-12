import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { SchemaBrowser } from './schema-browser'

type Path = (string | number)[]

// A CRD's openAPIV3Schema, nothing Deployment-shaped: example.io/v1 Widget.
const widgetSchema = {
  title: 'Widget',
  description: 'A Widget is an example custom resource.',
  type: 'object',
  properties: {
    apiVersion: { type: 'string', description: 'The versioned schema of this object.' },
    kind: { type: 'string', description: 'The REST resource this object represents.' },
    spec: {
      type: 'object',
      description: 'The desired state of the Widget.',
      'x-kubernetes-preserve-unknown-fields': true,
      properties: {
        size: {
          type: 'string',
          description: 'How big the widget is.',
          enum: ['small', 'medium', 'large'],
          default: 'medium',
        },
        endpoints: {
          type: 'array',
          description: 'Where the widget listens.',
          items: {
            type: 'object',
            description: 'One endpoint.',
            required: ['url'],
            properties: {
              url: { type: 'string', description: 'The endpoint URL.' },
              insecure: { type: 'boolean', description: 'Skip TLS verification.', default: false },
            },
          },
        },
      },
    },
  },
}

function Harness({ schema, initial = [] }: { schema: object; initial?: Path }) {
  const [path, setPath] = useState<Path>(initial)
  return <SchemaBrowser schema={schema} path={path} onPathChange={setPath} />
}

const crumbs = () => screen.getByRole('navigation', { name: 'breadcrumb' })
const row = (name: string) => {
  const item = screen.getByText(name, { selector: 'code' }).closest('[role="listitem"]')
  if (!(item instanceof HTMLElement)) throw new Error(`no row for ${name}`)
  return item
}

afterEach(() => {
  vi.restoreAllMocks()
  // jsdom has no scrollIntoView; tests that need it install one.
  Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
})

describe('SchemaBrowser', () => {
  it('renders a CRD schema', async () => {
    const user = userEvent.setup()
    render(<Harness schema={widgetSchema} />)

    expect(within(crumbs()).getByText('Widget')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('A Widget is an example custom resource.')).toBeInTheDocument()
    expect(within(row('spec')).getByText('object')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open spec' }))
    expect(within(crumbs()).getByRole('button', { name: 'Widget' })).toBeInTheDocument()
    expect(within(crumbs()).getByText('spec')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('The desired state of the Widget.')).toBeInTheDocument()
    expect(within(row('size')).getByText('string')).toBeInTheDocument()
    expect(within(row('size')).getByText('How big the widget is.')).toBeInTheDocument()
    expect(within(row('size')).getByText('enum: small · medium · large')).toBeInTheDocument()
    expect(within(row('size')).getByText('default: medium')).toBeInTheDocument()
    expect(within(row('endpoints')).getByText('array')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Open endpoints' }))
    expect(within(row('items')).getByText('object')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open items' }))
    expect(within(crumbs()).getByText('[]')).toHaveAttribute('aria-current', 'page')
    expect(within(row('url')).getByText('required')).toBeInTheDocument()
    expect(within(row('url')).getByText('The endpoint URL.')).toBeInTheDocument()
    expect(within(row('insecure')).queryByText('required')).not.toBeInTheDocument()
    expect(within(row('insecure')).getByText('default: false')).toBeInTheDocument()
  })

  it('calls onSelectField with the field path when a name is clicked', async () => {
    const user = userEvent.setup()
    const onSelectField = vi.fn()
    render(
      <SchemaBrowser
        schema={widgetSchema}
        path={['spec']}
        onPathChange={vi.fn()}
        onSelectField={onSelectField}
      />,
    )
    await user.click(screen.getByRole('button', { name: 'size' }))
    expect(onSelectField).toHaveBeenCalledWith(['spec', 'size'])
  })

  it('renders names as plain code without onSelectField', () => {
    render(<SchemaBrowser schema={widgetSchema} path={['spec']} onPathChange={vi.fn()} />)
    expect(screen.getByText('size', { selector: 'code' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'size' })).not.toBeInTheDocument()
  })

  it('navigates up from the breadcrumb, by pointer and keyboard', async () => {
    const user = userEvent.setup()
    const onPathChange = vi.fn()
    render(
      <SchemaBrowser
        schema={widgetSchema}
        path={['spec', 'endpoints', 0]}
        onPathChange={onPathChange}
      />,
    )
    const nav = within(crumbs())
    expect(nav.getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'Widget',
      'spec',
      'endpoints',
      '[]',
    ])
    await user.click(nav.getByRole('button', { name: 'spec' }))
    expect(onPathChange).toHaveBeenLastCalledWith(['spec'])
    nav.getByRole('button', { name: 'endpoints' }).focus()
    await user.keyboard('{Enter}')
    expect(onPathChange).toHaveBeenLastCalledWith(['spec', 'endpoints'])
    await user.click(nav.getByRole('button', { name: 'Widget' }))
    expect(onPathChange).toHaveBeenLastCalledWith([])
  })

  it('shows a leaf path as its parent with the field marked current', () => {
    render(<SchemaBrowser schema={widgetSchema} path={['spec', 'size']} onPathChange={vi.fn()} />)
    expect(within(crumbs()).getByText('spec')).toHaveAttribute('aria-current', 'page')
    expect(row('size')).toHaveAttribute('aria-current', 'true')
    expect(row('endpoints')).not.toHaveAttribute('aria-current')
  })

  it('shows a $ref to a scalar as a row of its parent, without an Open button', () => {
    const schema = {
      title: 'Thing',
      type: 'object',
      properties: { created: { $ref: '#/definitions/Time', description: 'When it was made.' } },
      definitions: { Time: { type: 'string', description: 'A timestamp.' } },
    }
    render(<SchemaBrowser schema={schema} path={['created']} onPathChange={vi.fn()} />)
    expect(within(crumbs()).getByText('Thing')).toHaveAttribute('aria-current', 'page')
    expect(row('created')).toHaveAttribute('aria-current', 'true')
    expect(within(row('created')).getByText('string')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Open created' })).not.toBeInTheDocument()
  })

  it('scrolls the current row into view when the path changes', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    const { rerender } = render(
      <SchemaBrowser schema={widgetSchema} path={['spec', 'size']} onPathChange={vi.fn()} />,
    )
    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' })
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(row('size'))
    rerender(
      <SchemaBrowser
        schema={widgetSchema}
        path={['spec', 'endpoints', 0, 'url']}
        onPathChange={vi.fn()}
      />,
    )
    expect(scrollIntoView).toHaveBeenCalledTimes(2)
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(row('url'))
  })

  it('keeps rows apart when a property is named like the * and items rows', () => {
    const error = vi.spyOn(console, 'error')
    const schema = {
      type: 'object',
      properties: { '*': { type: 'string', description: 'A key literally named *.' } },
      additionalProperties: { type: 'integer', description: 'Any other key.' },
    }
    render(
      <SchemaBrowser schema={schema} path={[]} onPathChange={vi.fn()} onSelectField={vi.fn()} />,
    )
    expect(screen.getAllByRole('listitem').filter((li) => li.closest('nav') === null)).toHaveLength(
      2,
    )
    expect(screen.getByText('A key literally named *.')).toBeInTheDocument()
    expect(screen.getByText('Any other key.')).toBeInTheDocument()
    // Only the real property can be jumped to: `*` from additionalProperties stands for any key.
    expect(screen.getAllByRole('button', { name: '*' })).toHaveLength(1)
    expect(error).not.toHaveBeenCalled()
  })

  it('falls back to the deepest documented part of the path', () => {
    render(
      <SchemaBrowser
        schema={widgetSchema}
        path={['spec', 'colour', 'hue']}
        onPathChange={vi.fn()}
      />,
    )
    expect(within(crumbs()).getByText('spec')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('The desired state of the Widget.')).toBeInTheDocument()
  })

  it('does not loop on a $ref cycle', async () => {
    const user = userEvent.setup()
    const cyclic = {
      type: 'object',
      properties: { a: { $ref: '#/definitions/A', description: 'Goes round.' } },
      definitions: { A: { $ref: '#/definitions/B' }, B: { $ref: '#/definitions/A' } },
    }
    render(<Harness schema={cyclic} />)
    expect(within(crumbs()).getByText('Resource')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Open a' }))
    expect(screen.getByText('Goes round.')).toBeInTheDocument()
    expect(screen.getByText('No fields documented')).toBeInTheDocument()
  })

  it('lists anyOf alternatives with their fields', () => {
    const schema = {
      title: 'Target',
      anyOf: [
        {
          title: 'Reference',
          type: 'object',
          properties: { name: { type: 'string', description: 'The name.' } },
        },
        { type: 'string' },
      ],
    }
    const { rerender } = render(<SchemaBrowser schema={schema} path={[]} onPathChange={vi.fn()} />)
    expect(screen.getByRole('heading', { level: 3, name: 'Any of: Reference' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'Any of: string' })).toBeInTheDocument()
    expect(within(row('name')).getByText('The name.')).toBeInTheDocument()
    rerender(<SchemaBrowser schema={schema} path={[]} onPathChange={vi.fn()} headingLevel={4} />)
    expect(screen.getByRole('heading', { level: 4, name: 'Any of: Reference' })).toBeInTheDocument()
  })
})
