import { describe, expect, it } from 'vitest'
import { resolveNode } from './resolve'

const mini = {
  title: 'Thing',
  description: 'A thing.',
  type: 'object',
  required: ['spec'],
  properties: {
    kind: { type: 'string', description: 'The kind.' },
    spec: {
      type: 'object',
      description: 'The desired state.',
      required: ['replicas'],
      'x-kubernetes-preserve-unknown-fields': true,
      properties: {
        replicas: { type: 'integer', description: 'How many.', default: 1 },
        mode: { type: 'string', description: 'How.', enum: ['fast', 'safe'], default: 'safe' },
        tags: {
          type: 'array',
          description: 'Tags.',
          items: { type: 'string', description: 'A tag.' },
        },
        labels: {
          type: 'object',
          description: 'Labels.',
          additionalProperties: { type: 'string', description: 'A label value.' },
        },
        owner: { $ref: '#/definitions/Owner', description: 'Who owns it.' },
        nickname: { type: ['string', 'null'], description: 'Maybe a name.' },
      },
    },
  },
  definitions: {
    Owner: {
      type: 'object',
      description: 'An owner.',
      required: ['name'],
      properties: { name: { type: 'string', description: 'The name.' } },
    },
  },
}

describe('resolveNode', () => {
  it('lists the root fields of a mini schema', () => {
    const node = resolveNode(mini, [])
    expect(node).toMatchObject({
      path: [],
      title: 'Thing',
      description: 'A thing.',
      type: 'object',
      required: ['spec'],
    })
    expect(node?.fields).toEqual([
      { name: 'kind', type: 'string', required: false, description: 'The kind.', drillable: false },
      {
        name: 'spec',
        type: 'object',
        required: true,
        description: 'The desired state.',
        drillable: true,
      },
    ])
  })

  it('drills into spec and reports its fields with required, enum and default', () => {
    const node = resolveNode(mini, ['spec'])
    expect(node?.path).toEqual(['spec'])
    expect(node?.required).toEqual(['replicas'])
    expect(node?.fields.map((f) => f.name)).toEqual([
      'replicas',
      'mode',
      'tags',
      'labels',
      'owner',
      'nickname',
    ])
    const field = (name: string) => node?.fields.find((f) => f.name === name)
    expect(field('replicas')).toMatchObject({ type: 'integer', required: true, default: 1 })
    expect(field('mode')).toMatchObject({
      required: false,
      enum: ['fast', 'safe'],
      default: 'safe',
      drillable: false,
    })
    expect(field('tags')).toMatchObject({ type: 'array', drillable: true })
    expect(field('nickname')).toMatchObject({ type: 'string | null', drillable: false })
  })

  it('resolves items on an array', () => {
    const tags = resolveNode(mini, ['spec', 'tags'])
    expect(tags).toMatchObject({ type: 'array', itemsPath: ['spec', 'tags', 0], fields: [] })
    expect(resolveNode(mini, ['spec', 'tags', 0])).toMatchObject({
      type: 'string',
      description: 'A tag.',
    })
  })

  it('lists additionalProperties as a * field and resolves any key through it', () => {
    const labels = resolveNode(mini, ['spec', 'labels'])
    expect(labels?.fields).toEqual([
      {
        name: '*',
        type: 'string',
        required: false,
        description: 'A label value.',
        drillable: false,
      },
    ])
    expect(resolveNode(mini, ['spec', 'labels', 'app'])).toMatchObject({
      type: 'string',
      description: 'A label value.',
    })
  })

  it('resolves a $ref to definitions, the referencing description winning', () => {
    const spec = resolveNode(mini, ['spec'])
    expect(spec?.fields.find((f) => f.name === 'owner')).toMatchObject({
      type: 'object',
      description: 'Who owns it.',
      drillable: true,
    })
    const owner = resolveNode(mini, ['spec', 'owner'])
    expect(owner).toMatchObject({ type: 'object', description: 'Who owns it.', required: ['name'] })
    expect(owner?.fields).toEqual([
      { name: 'name', type: 'string', required: true, description: 'The name.', drillable: false },
    ])
  })

  it('resolves $defs and nested JSON pointers', () => {
    const schema = {
      type: 'object',
      properties: {
        a: { $ref: '#/$defs/A' },
        b: { $ref: '#/$defs/A/properties/inner' },
      },
      $defs: {
        A: {
          type: 'object',
          description: 'From $defs.',
          properties: { inner: { type: 'boolean', description: 'Inner flag.' } },
        },
      },
    }
    expect(resolveNode(schema, ['a'])?.description).toBe('From $defs.')
    expect(resolveNode(schema, ['b'])).toMatchObject({
      type: 'boolean',
      description: 'Inner flag.',
    })
  })

  it('does not loop on a $ref cycle', () => {
    const cyclic = {
      title: 'Loop',
      type: 'object',
      properties: {
        a: { $ref: '#/definitions/A' },
        tree: { $ref: '#/definitions/Tree' },
      },
      definitions: {
        A: { $ref: '#/definitions/B', description: 'A points at B.' },
        B: { $ref: '#/definitions/A' },
        Tree: {
          type: 'object',
          description: 'A tree node.',
          properties: { child: { $ref: '#/definitions/Tree' } },
        },
      },
    }
    expect(resolveNode(cyclic, [])?.fields.find((f) => f.name === 'a')).toMatchObject({
      type: 'any',
      drillable: true,
    })
    expect(resolveNode(cyclic, ['a'])).toEqual({
      path: ['a'],
      description: 'A points at B.',
      type: 'any',
      required: [],
      fields: [],
    })
    // Recursion through properties stays drillable: every step consumes a path segment.
    expect(resolveNode(cyclic, ['tree', 'child', 'child'])).toMatchObject({
      description: 'A tree node.',
      fields: [{ name: 'child', type: 'object', drillable: true }],
    })
    const rootCycle = { $ref: '#/definitions/Self', definitions: { Self: { $ref: '#' } } }
    expect(resolveNode(rootCycle, [])).toMatchObject({ type: 'any', fields: [] })
  })

  it('merges allOf: unions properties and required, first description wins', () => {
    const schema = {
      type: 'object',
      properties: {
        merged: {
          description: 'Own words.',
          allOf: [
            { $ref: '#/definitions/Base' },
            { properties: { extra: { type: 'string' } }, required: ['extra'] },
          ],
        },
        inherited: { allOf: [{ $ref: '#/definitions/Base' }] },
      },
      definitions: {
        Base: {
          type: 'object',
          description: 'The base.',
          required: ['id'],
          properties: { id: { type: 'string' } },
        },
      },
    }
    const merged = resolveNode(schema, ['merged'])
    expect(merged).toMatchObject({
      type: 'object',
      description: 'Own words.',
      required: ['id', 'extra'],
    })
    expect(merged?.fields.map((f) => [f.name, f.required])).toEqual([
      ['id', true],
      ['extra', true],
    ])
    expect(resolveNode(schema, ['inherited'])?.description).toBe('The base.')
  })

  it('reports anyOf at the root as alternatives, resolved one level', () => {
    const schema = {
      description: 'Either a reference or a name.',
      anyOf: [
        {
          title: 'Reference',
          type: 'object',
          properties: { name: { type: 'string', description: 'The name.' } },
        },
        { type: 'string' },
      ],
    }
    const node = resolveNode(schema, [])
    expect(node?.type).toBe('anyOf')
    expect(node?.fields).toEqual([])
    expect(node?.alternatives).toHaveLength(2)
    expect(node?.alternatives?.[0]).toMatchObject({ title: 'Reference', type: 'object' })
    expect(node?.alternatives?.[0]?.fields.map((f) => f.name)).toEqual(['name'])
    expect(node?.alternatives?.[1]).toMatchObject({ type: 'string', fields: [] })
    // Paths step through the alternatives.
    expect(resolveNode(schema, ['name'])?.description).toBe('The name.')
    expect(resolveNode({ oneOf: [{ type: 'string' }] }, [])?.type).toBe('oneOf')
  })

  it('types a oneOf/anyOf field by its alternatives', () => {
    const schema = {
      type: 'object',
      properties: {
        port: {
          description: 'Number or name.',
          'x-kubernetes-int-or-string': true,
          anyOf: [{ type: 'integer' }, { type: 'string' }],
        },
        target: { oneOf: [{ $ref: '#/definitions/Ref' }, { type: 'string' }] },
      },
      definitions: { Ref: { type: 'object', properties: { name: { type: 'string' } } } },
    }
    const node = resolveNode(schema, [])
    expect(node?.fields).toEqual([
      {
        name: 'port',
        type: 'integer | string',
        required: false,
        description: 'Number or name.',
        drillable: false,
      },
      { name: 'target', type: 'object | string', required: false, drillable: true },
    ])
  })

  it('opens a bare $ref only when it is unresolved or cyclic, not when it names a scalar', () => {
    const schema = {
      type: 'object',
      properties: {
        created: { $ref: '#/definitions/Time', description: 'When it was made.' },
        stamped: { allOf: [{ $ref: '#/definitions/Time' }] },
        missing: { $ref: '#/definitions/Nope' },
        owner: { $ref: '#/definitions/Owner' },
      },
      definitions: {
        Time: { type: 'string', description: 'A timestamp.' },
        Owner: { type: 'object', properties: { name: { type: 'string' } } },
      },
    }
    const field = (name: string) => resolveNode(schema, [])?.fields.find((f) => f.name === name)
    expect(field('created')).toMatchObject({ type: 'string', drillable: false })
    expect(field('stamped')).toMatchObject({ type: 'string', drillable: false })
    expect(field('missing')).toMatchObject({ type: 'any', drillable: true })
    expect(field('owner')).toMatchObject({ type: 'object', drillable: true })
  })

  it('does not browse tuple items, and only numbers step into items', () => {
    const schema = {
      type: 'object',
      properties: {
        pair: { type: 'array', items: [{ type: 'string' }, { type: 'integer' }] },
        tags: { type: 'array', items: { type: 'string' } },
      },
    }
    expect(resolveNode(schema, [])?.fields.find((f) => f.name === 'pair')?.drillable).toBe(false)
    expect(resolveNode(schema, ['pair'])).toMatchObject({ type: 'array', fields: [] })
    expect(resolveNode(schema, ['pair'])?.itemsPath).toBeUndefined()
    expect(resolveNode(schema, ['pair', 0])).toBeUndefined()
    expect(resolveNode(schema, ['tags', 0])?.type).toBe('string')
    expect(resolveNode(schema, ['tags', '0'])).toBeUndefined()
    expect(resolveNode(mini, ['spec', 'tags', 'first'])).toBeUndefined()
  })

  it('normalises missing types and ignores x-kubernetes-* keys', () => {
    expect(resolveNode({ properties: { a: {} } }, [])?.type).toBe('object')
    expect(resolveNode({ items: { type: 'string' } }, [])?.type).toBe('array')
    expect(resolveNode({ 'x-kubernetes-int-or-string': true }, [])).toEqual({
      path: [],
      type: 'any',
      required: [],
      fields: [],
    })
  })

  it('returns undefined for a path the schema does not describe', () => {
    expect(resolveNode(mini, ['spec', 'nope'])).toBeUndefined()
    expect(resolveNode(mini, ['kind', 'deeper'])).toBeUndefined()
    expect(resolveNode(mini, ['__proto__'])).toBeUndefined()
    expect(resolveNode({ $ref: '#/__proto__' }, [])).toEqual({
      path: [],
      type: 'any',
      required: [],
      fields: [],
    })
  })

  it('keeps properties named like Object.prototype members when merging allOf', () => {
    const schema: object = {
      allOf: [
        { properties: { name: { type: 'string' } } },
        { properties: { constructor: { type: 'string', description: 'Who built it.' } } },
      ],
    }
    expect(resolveNode(schema, [])?.fields.map((f) => f.name)).toEqual(['name', 'constructor'])
    expect(resolveNode(schema, ['constructor'])?.description).toBe('Who built it.')
  })
})
