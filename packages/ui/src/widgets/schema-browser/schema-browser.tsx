import { ChevronRightIcon } from 'lucide-react'
import { HStack, Stack } from '../../../styled-system/jsx'
import {
  Badge,
  Breadcrumb,
  Button,
  Code,
  Heading,
  IconButton,
  ScrollArea,
  Text,
} from '../../components/ui'
import { resolveNode, type SchemaField, type SchemaNode } from './resolve'

type Path = (string | number)[]

export interface SchemaBrowserProps {
  /** Any draft-07-style JSON Schema object: the bundled Deployment schema, a CRD's openAPIV3Schema, … */
  schema: object
  /** The node to show: object keys, and numbers for array items (the editor's cursor path fits). */
  path: Path
  /** Breadcrumb clicks and "Open …" buttons ask for a new path; the host owns it. */
  onPathChange: (path: Path) => void
  /** Clicking a field name; without it the names are plain text. */
  onSelectField?: (path: Path) => void
}

const isContainer = (node: SchemaNode) =>
  node.fields.length > 0 ||
  node.itemsPath !== undefined ||
  (node.alternatives?.length ?? 0) > 0 ||
  node.type.split(' | ').some((t) => t === 'object' || t === 'array')

/**
 * The row a path segment lands on in its parent: the field (in the parent or one of its
 * alternatives), `*` for any other key, `items` for an index.
 */
function rowFor(
  schema: object,
  parent: SchemaNode,
  segment: string | number | undefined,
): SchemaField | undefined {
  if (typeof segment === 'number') {
    const items = parent.itemsPath ? resolveNode(schema, parent.itemsPath) : undefined
    return items ? itemsField(items) : undefined
  }
  const fields = [...parent.fields, ...(parent.alternatives ?? []).flatMap((alt) => alt.fields)]
  return fields.find((f) => f.name === segment) ?? fields.find((f) => f.name === '*')
}

/**
 * The node to show for `path`: its deepest documented prefix; a field that does not open (the cursor
 * on `type: RollingUpdate`) shows as its parent's list with that row marked.
 */
function viewFor(schema: object, path: Path): { node: SchemaNode; current?: string } {
  for (let depth = path.length; depth >= 0; depth--) {
    const node = resolveNode(schema, path.slice(0, depth))
    if (!node) continue
    const parent = depth > 0 ? resolveNode(schema, path.slice(0, depth - 1)) : undefined
    const row = parent ? rowFor(schema, parent, path[depth - 1]) : undefined
    return parent && row && !row.drillable ? { node: parent, current: row.name } : { node }
  }
  // Only a schema that is not an object (an array, say) has no root node.
  return { node: { path: [], type: 'any', required: [], fields: [] } }
}

function show(value: unknown): string {
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value) ?? String(value)
  } catch {
    return String(value)
  }
}

function itemsField(items: SchemaNode): SchemaField {
  const { type, description, enum: values, default: fallback } = items
  return {
    name: 'items',
    type,
    required: false,
    drillable: isContainer(items),
    ...(description === undefined ? {} : { description }),
    ...(values === undefined ? {} : { enum: values }),
    ...(fallback === undefined ? {} : { default: fallback }),
  }
}

interface FieldRowProps {
  field: SchemaField
  current: boolean
  onSelect?: () => void
  onOpen?: () => void
}

function FieldRow({ field, current, onSelect, onOpen }: FieldRowProps) {
  return (
    <Stack
      role="listitem"
      gap="1"
      py="2"
      px="1"
      data-current={current ? '' : undefined}
      _current={{ bg: 'gray.a2' }}
    >
      <HStack gap="2" justifyContent="space-between" alignItems="start">
        <HStack gap="1.5" flexWrap="wrap" minW="0">
          {onSelect ? (
            <Button variant="plain" size="xs" px="1" onClick={onSelect}>
              <Code>{field.name}</Code>
            </Button>
          ) : (
            <Code>{field.name}</Code>
          )}
          <Badge size="sm" variant="subtle">
            {field.type}
          </Badge>
          {field.required ? (
            <Badge size="sm" variant="subtle" colorPalette="red">
              required
            </Badge>
          ) : null}
        </HStack>
        {onOpen ? (
          <IconButton variant="plain" size="xs" aria-label={`Open ${field.name}`} onClick={onOpen}>
            <ChevronRightIcon />
          </IconButton>
        ) : null}
      </HStack>
      {field.description ? (
        <Text textStyle="xs" color="fg.muted">
          {field.description}
        </Text>
      ) : null}
      {field.enum ? (
        <Text textStyle="xs" color="fg.subtle">
          {`enum: ${field.enum.map(show).join(' · ')}`}
        </Text>
      ) : null}
      {field.default !== undefined ? (
        <Text textStyle="xs" color="fg.subtle">
          {`default: ${show(field.default)}`}
        </Text>
      ) : null}
    </Stack>
  )
}

interface FieldListProps {
  schema: object
  node: SchemaNode
  current?: string
  onPathChange: (path: Path) => void
  onSelectField?: (path: Path) => void
}

function FieldList({ schema, node, current, onPathChange, onSelectField }: FieldListProps) {
  const items = node.itemsPath ? resolveNode(schema, node.itemsPath) : undefined
  const rows = node.fields.map((field) => ({
    field,
    // `*` stands for any key: there is no key of that name to jump to.
    target: field.name === '*' ? undefined : [...node.path, field.name],
    open: [...node.path, field.name],
  }))
  if (items && node.itemsPath) {
    rows.push({ field: itemsField(items), target: node.itemsPath, open: node.itemsPath })
  }
  if (rows.length === 0) {
    return (
      <Text textStyle="sm" color="fg.subtle">
        No fields documented
      </Text>
    )
  }
  return (
    <Stack role="list" gap="0" divideY="1px" divideColor="border">
      {rows.map(({ field, target, open }) => (
        <FieldRow
          key={field.name}
          field={field}
          current={field.name === current}
          onSelect={onSelectField && target ? () => onSelectField(target) : undefined}
          onOpen={field.drillable ? () => onPathChange(open) : undefined}
        />
      ))}
    </Stack>
  )
}

/**
 * Browses any JSON Schema: a breadcrumb of the path, the node's description, then its fields (name,
 * type, required, description, enum, default). Objects and arrays open; arrays list their `items`.
 * Controlled: the host keeps `path` (typically following the editor's cursor).
 */
export function SchemaBrowser({ schema, path, onPathChange, onSelectField }: SchemaBrowserProps) {
  const { node, current } = viewFor(schema, path)
  const rootLabel = resolveNode(schema, [])?.title ?? 'Resource'
  const crumbs = [
    rootLabel,
    ...node.path.map((segment) => (typeof segment === 'number' ? '[]' : segment)),
  ]
  const list = (of: SchemaNode) => (
    <FieldList
      schema={schema}
      node={of}
      current={current}
      onPathChange={onPathChange}
      onSelectField={onSelectField}
    />
  )

  return (
    <Stack gap="3" h="full" minH="0">
      <Breadcrumb.Root size="sm">
        <Breadcrumb.List flexWrap="wrap">
          {crumbs.map((label, index) => {
            const last = index === crumbs.length - 1
            return [
              <Breadcrumb.Item key={`item-${index}`}>
                {last ? (
                  <span aria-current="page">{label}</span>
                ) : (
                  <Breadcrumb.Link asChild>
                    <button type="button" onClick={() => onPathChange(node.path.slice(0, index))}>
                      {label}
                    </button>
                  </Breadcrumb.Link>
                )}
              </Breadcrumb.Item>,
              last ? null : <Breadcrumb.Separator key={`separator-${index}`} />,
            ]
          })}
        </Breadcrumb.List>
      </Breadcrumb.Root>
      {node.description ? (
        <Text textStyle="sm" color="fg.muted">
          {node.description}
        </Text>
      ) : null}
      <ScrollArea.Root size="xs" flex="1" minH="0" maxH="full">
        <ScrollArea.Viewport>
          <ScrollArea.Content>
            {/* A oneOf/anyOf node has no fields of its own: properties or items would make it an object or array. */}
            {node.alternatives && node.alternatives.length > 0 ? (
              <Stack gap="4">
                {node.alternatives.map((alternative, index) => (
                  <Stack key={index} gap="1">
                    <Heading as="h3" textStyle="xs" color="fg.muted">
                      {`${node.type === 'anyOf' ? 'Any of' : 'One of'}: ${alternative.title ?? alternative.type}`}
                    </Heading>
                    {alternative.description ? (
                      <Text textStyle="xs" color="fg.muted">
                        {alternative.description}
                      </Text>
                    ) : null}
                    {list(alternative)}
                  </Stack>
                ))}
              </Stack>
            ) : (
              list(node)
            )}
          </ScrollArea.Content>
        </ScrollArea.Viewport>
        <ScrollArea.Scrollbar orientation="vertical" />
      </ScrollArea.Root>
    </Stack>
  )
}
