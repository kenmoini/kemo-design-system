import { describe, expect, it } from 'vitest'
import { resolveNode, type SchemaNode } from '../../../widgets/schema-browser'
import { defaultSchemaRegistry, schemaFor } from '../../resources'
import { deploymentSchema } from './deployment-schema'

const at = (path: (string | number)[]): SchemaNode => {
  const node = resolveNode(deploymentSchema, path)
  if (!node) throw new Error(`no schema node at ${path.join('.')}`)
  return node
}

describe('deploymentSchema', () => {
  it('is the bundled apps/v1 Deployment entry of the default registry', () => {
    expect(schemaFor(defaultSchemaRegistry, 'apps/v1', 'Deployment')).toBe(deploymentSchema)
    expect(schemaFor(defaultSchemaRegistry, 'apps/v1', 'StatefulSet')).toBeUndefined()
    expect(
      schemaFor({ 'example.io/v1/Widget': { title: 'Widget' } }, 'example.io/v1', 'Widget'),
    ).toEqual({ title: 'Widget' })
    expect(at([])).toMatchObject({ title: 'Deployment', type: 'object', required: ['spec'] })
  })

  it('documents spec.strategy.type with its enum and default', () => {
    const strategy = at(['spec', 'strategy'])
    expect(strategy.fields.find((f) => f.name === 'type')).toMatchObject({
      type: 'string',
      enum: ['Recreate', 'RollingUpdate'],
      default: 'RollingUpdate',
    })
    expect(strategy.fields.find((f) => f.name === 'rollingUpdate')?.drillable).toBe(true)
  })

  it('describes containers as an array whose items require name and image', () => {
    const containers = at(['spec', 'template', 'spec', 'containers'])
    expect(containers.type).toBe('array')
    expect(containers.itemsPath).toEqual(['spec', 'template', 'spec', 'containers', 0])
    const container = at(containers.itemsPath ?? [])
    expect(container.required).toEqual(expect.arrayContaining(['name', 'image']))
    const field = (name: string) => container.fields.find((f) => f.name === name)
    expect(field('name')?.required).toBe(true)
    expect(field('image')?.required).toBe(true)
    expect(field('imagePullPolicy')?.enum).toEqual(['Always', 'Never', 'IfNotPresent'])
  })

  it('carries the enums and defaults a Deployment author meets', () => {
    const pod = ['spec', 'template', 'spec']
    const container = [...pod, 'containers', 0]
    const field = (path: (string | number)[], name: string) =>
      at(path).fields.find((f) => f.name === name)
    expect(field(pod, 'restartPolicy')).toMatchObject({
      enum: ['Always', 'OnFailure', 'Never'],
      default: 'Always',
    })
    expect(field(pod, 'dnsPolicy')).toMatchObject({ default: 'ClusterFirst' })
    expect(field([...container, 'ports', 0], 'protocol')).toMatchObject({
      enum: ['TCP', 'UDP', 'SCTP'],
      default: 'TCP',
    })
    expect(field([...container, 'livenessProbe', 'httpGet'], 'scheme')).toMatchObject({
      enum: ['HTTP', 'HTTPS'],
    })
    expect(field(['spec', 'strategy', 'rollingUpdate'], 'maxSurge')).toMatchObject({
      type: 'integer | string',
      default: '25%',
    })
  })

  it('describes every field under spec, two levels deep', () => {
    const spec = at(['spec'])
    expect(spec.fields.length).toBeGreaterThan(5)
    for (const field of spec.fields) {
      expect(field.description, `spec.${field.name}`).toBeTruthy()
      if (!field.drillable) continue
      const child = at(['spec', field.name])
      const node = child.itemsPath ? at(child.itemsPath) : child
      for (const inner of node.fields) {
        expect(inner.description, `spec.${field.name}.${inner.name}`).toBeTruthy()
      }
    }
  })

  it('describes every property in the bundle', () => {
    const missing: string[] = []
    const visit = (value: unknown, where: string) => {
      if (Array.isArray(value)) return value.forEach((v, i) => visit(v, `${where}[${i}]`))
      if (typeof value !== 'object' || value === null) return
      const node = value as Record<string, unknown>
      if (typeof node.properties === 'object' && node.properties !== null) {
        for (const [name, prop] of Object.entries(node.properties)) {
          if (typeof (prop as { description?: unknown }).description !== 'string') {
            missing.push(`${where}.${name}`)
          }
        }
      }
      for (const [key, child] of Object.entries(node)) visit(child, `${where}/${key}`)
    }
    visit(deploymentSchema, '#')
    expect(missing).toEqual([])
  })
})
