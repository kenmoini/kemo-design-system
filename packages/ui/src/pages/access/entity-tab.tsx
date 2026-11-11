'use client'
import { Fragment, type ReactNode, useMemo, useRef, useState } from 'react'
import { Box } from '../../../styled-system/jsx'
import {
  type ActionItem,
  DataTable,
  type DataTableColumn,
  type DataTableFilter,
  type DataTableProps,
  type Option,
} from '../../widgets'
import { ConfirmDialog } from './confirm-dialog'
import { EntityDialog, type EntityDialogProps } from './entity-dialog'
import { PickOptionForm } from './forms/pick-option-form'
import type { EntityStatus, EntityTabProps } from './types'

// The shared machinery of the six object tabs (Users, Groups, Roles, Permissions, Service
// accounts, OAuth apps): a DataTable, the Add/Edit/Clone dialog around the tab's form, the delete
// confirmation and one slot for a custom dialog. Private to the package.

/** What a tab's form receives: the starting values, the submit label and the two outcomes. */
export interface EntityFormProps<V> {
  defaultValues?: Partial<V>
  submitLabel: string
  /** Resolves when saved (the dialog closes); a rejection keeps the input and shows its message. */
  onSubmit: (values: V) => void | Promise<void>
  onCancel: () => void
}

export type EntityRow = { id: string; name: string }

type DialogSize = NonNullable<EntityDialogProps['size']>

/** A dialog of the tab's own (a token reveal, say). */
export interface CustomDialog {
  title: string
  description?: ReactNode
  /** Defaults to `md`. */
  size?: DialogSize
  /** The body, footer included; call `close` when done. */
  render: (close: () => void) => ReactNode
}

/** A one-`Select` dialog that applies a choice to rows ("Assign role…"). */
export interface PickerDialog {
  title: string
  description?: ReactNode
  /** The select's label, e.g. "Role". */
  label: string
  options: Option[]
  placeholder?: string
  submitLabel: string
  /** Shown when nothing is chosen; defaults to "Choose a {label}." */
  requiredMessage?: string
  /** Resolve to close the dialog; reject to keep it open with the error's message. */
  onApply: (value: string) => void | Promise<void>
}

/** Overrides for the delete confirmation's copy. */
export interface DeleteCopy {
  /** Defaults to "Delete {name}?" for one id and "Delete {k} {plural}?" for more. */
  title?: string
  /** Defaults to "This can't be undone." */
  description?: ReactNode
}

/** What a tab's action builders get: its props and the dialogs it can open. */
export interface EntityCtx<T extends EntityRow, V, P> {
  /** Everything the tab was given: rows, the host's handlers and the tab's own props. */
  props: EntityTabProps<T, V> & P
  entity: { singular: string; plural: string }
  /** "1 user", "2 users". */
  count: (n: number) => string
  rowLabel: (row: T) => string
  openAdd: () => void
  /** "Edit {name}", the form pre-filled with `toValues(row)`; submits through `onUpdate`. */
  openEdit: (row: T) => void
  /** Calls the host's `onClone` when given; otherwise opens Add pre-filled from `toValues(row)` and
   * `cloneDefaults`, named "{name} (copy)". */
  openClone: (row: T) => void
  /** Asks first; on confirm calls `onDelete(ids)` and drops the ids from the selection. */
  confirmDelete: (ids: string[], copy?: DeleteCopy) => void
  /** Asks first, in the delete confirmation's dialog; `tone` defaults to `danger`. */
  confirm: (confirmation: {
    title: string
    description: ReactNode
    confirmLabel: string
    tone?: 'danger' | 'default'
    onConfirm: () => void
  }) => void
  openCustom: (dialog: CustomDialog) => void
  openPicker: (picker: PickerDialog) => void
  closeDialog: () => void
  clearSelection: () => void
}

export interface EntityTabConfig<T extends EntityRow, V extends { name: string }, P> {
  /** Lower-case nouns: `{ singular: 'user', plural: 'users' }`. */
  entity: { singular: string; plural: string }
  /** Static columns. A tab whose columns depend on its props passes memoised `columns` instead. */
  columns?: DataTableColumn<T>[]
  /** Static filters; the same rule as `columns`. */
  filters?: DataTableFilter<T>[]
  search?: DataTableProps<T>['search']
  /** How a row is named in labels and titles; defaults to `name`. */
  rowLabel?: (row: T) => string
  initialSort?: DataTableProps<T>['initialSort']
  /** The Add/Edit form, given the form props and the tab's props (for its option lists). */
  renderForm: (form: EntityFormProps<V>, props: EntityTabProps<T, V> & P) => ReactNode
  /** A row as form values: Edit's starting point, and Clone's before the rename. */
  toValues: (row: T) => V
  /** Clone's name; defaults to "{name} (copy)". */
  cloneName?: (row: T) => string
  /** Form values a clone starts from instead of the row's (form-only fields such as `sendInvite`). */
  cloneDefaults?: Partial<V>
  rowActions: (ctx: EntityCtx<T, V, P>, row: T) => ActionItem[]
  /** Omitted, the table has no checkboxes. */
  bulkActions?: (ctx: EntityCtx<T, V, P>, selected: T[]) => ActionItem[]
  /** The Add and Edit dialogs' descriptions. */
  copy?: { addDescription?: ReactNode; editDescription?: (row: T) => ReactNode }
  /** The Add/Edit dialog's size; defaults to `lg` (two columns of fields on `md`+). */
  dialogSize?: DialogSize
}

/** The created component's table props: memoised `columns`/`filters` replace the config's. */
export interface EntityTabTableProps<T> {
  columns?: DataTableColumn<T>[]
  filters?: DataTableFilter<T>[]
}

type View<T, V> =
  | { kind: 'add'; values?: Partial<V> }
  | { kind: 'edit'; row: T }
  | {
      kind: 'confirm'
      title: string
      description: ReactNode
      confirmLabel: string
      tone: 'danger' | 'default'
      onConfirm: () => void
    }
  | { kind: 'custom'; dialog: CustomDialog }

interface DialogState<T, V> {
  open: boolean
  /** Kept after closing, so the dialog keeps its content while it animates out. */
  view: View<T, V> | null
  /** Bumped on every open, so each open mounts a fresh form. */
  key: number
}

/**
 * Builds an object tab from its columns, form and actions. The tab owns the selection (ids, kept
 * across filters and pages, pruned when rows go) and one dialog at a time: Add, Edit, Clone (Add
 * pre-filled), the delete confirmation, a picker or a custom dialog. A submit closes the dialog
 * when the host's handler resolves and keeps it open, with the message, when it rejects.
 */
export function createEntityTab<
  T extends EntityRow,
  V extends { name: string },
  P extends object = object,
>(config: EntityTabConfig<T, V, P>) {
  const { entity } = config
  const rowLabel = config.rowLabel ?? ((row: T) => row.name)
  const count = (n: number) => `${n} ${n === 1 ? entity.singular : entity.plural}`

  function EntityTab(tabProps: EntityTabProps<T, V> & P & EntityTabTableProps<T>) {
    const props: EntityTabProps<T, V> & P = tabProps
    const columns = tabProps.columns ?? config.columns ?? []
    const filters = tabProps.filters ?? config.filters

    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [dialog, setDialog] = useState<DialogState<T, V>>({ open: false, view: null, key: 0 })

    const rowIds = useMemo(() => new Set(props.rows.map((row) => row.id)), [props.rows])
    // Ids whose rows are gone leave the selection.
    const selection = useMemo(
      () => selectedIds.filter((id) => rowIds.has(id)),
      [selectedIds, rowIds],
    )

    // A dialog hands focus back to what had it before; when that is gone (the row just deleted),
    // to the tab itself rather than to the page.
    const regionRef = useRef<HTMLDivElement>(null)
    const lastFocusRef = useRef<HTMLElement | null>(null)
    const returnFocus = () => {
      const last = lastFocusRef.current
      return last?.isConnected ? last : regionRef.current
    }

    const show = (view: View<T, V>) =>
      setDialog((current) => ({ open: true, view, key: current.key + 1 }))
    const close = () => setDialog((current) => ({ ...current, open: false }))

    const ctx: EntityCtx<T, V, P> = {
      props,
      entity,
      count,
      rowLabel,
      openAdd: () => show({ kind: 'add' }),
      openEdit: (row) => show({ kind: 'edit', row }),
      openClone: (row) => {
        if (props.onClone) {
          props.onClone(row.id)
          return
        }
        const name = config.cloneName?.(row) ?? `${row.name} (copy)`
        show({ kind: 'add', values: { ...config.toValues(row), ...config.cloneDefaults, name } })
      },
      confirmDelete: (ids, copy) => {
        const only = ids.length === 1 ? props.rows.find((row) => row.id === ids[0]) : undefined
        const title =
          copy?.title ??
          (ids.length === 1
            ? `Delete ${only ? rowLabel(only) : ids[0]}?`
            : `Delete ${count(ids.length)}?`)
        ctx.confirm({
          title,
          description: copy?.description ?? "This can't be undone.",
          confirmLabel: 'Delete',
          tone: 'danger',
          onConfirm: () => {
            const deleted = new Set(ids)
            props.onDelete(ids)
            setSelectedIds((current) => current.filter((id) => !deleted.has(id)))
          },
        })
      },
      confirm: (confirmation) =>
        show({ kind: 'confirm', ...confirmation, tone: confirmation.tone ?? 'danger' }),
      openCustom: (custom) => show({ kind: 'custom', dialog: custom }),
      openPicker: (picker) =>
        show({
          kind: 'custom',
          dialog: {
            title: picker.title,
            description: picker.description,
            size: 'sm',
            render: (done) => (
              <PickOptionForm
                label={picker.label}
                options={picker.options}
                placeholder={picker.placeholder}
                submitLabel={picker.submitLabel}
                requiredMessage={picker.requiredMessage}
                onSubmit={async (value) => {
                  await picker.onApply(value)
                  done()
                }}
                onCancel={done}
              />
            ),
          },
        }),
      closeDialog: close,
      clearSelection: () => setSelectedIds([]),
    }

    const view = dialog.view
    // Closes only the dialog it was handed to: a submit that resolves after its dialog was
    // dismissed and another opened leaves the new one alone.
    const openKey = dialog.key
    const closeThis = () =>
      setDialog((current) => (current.key === openKey ? { ...current, open: false } : current))
    let title: ReactNode = null
    let description: ReactNode = undefined
    let body: ReactNode = null
    let size: DialogSize = config.dialogSize ?? 'lg'
    if (view?.kind === 'add') {
      title = `Add ${entity.singular}`
      description = config.copy?.addDescription
      body = config.renderForm(
        {
          defaultValues: view.values,
          submitLabel: `Add ${entity.singular}`,
          onSubmit: async (values) => {
            await props.onCreate(values)
            closeThis()
          },
          onCancel: closeThis,
        },
        props,
      )
    } else if (view?.kind === 'edit') {
      const { row } = view
      title = `Edit ${rowLabel(row)}`
      description = config.copy?.editDescription?.(row)
      body = config.renderForm(
        {
          defaultValues: config.toValues(row),
          submitLabel: 'Save changes',
          onSubmit: async (values) => {
            await props.onUpdate(row.id, values)
            closeThis()
          },
          onCancel: closeThis,
        },
        props,
      )
    } else if (view?.kind === 'custom') {
      title = view.dialog.title
      description = view.dialog.description
      size = view.dialog.size ?? 'md'
      body = view.dialog.render(closeThis)
    }

    const bulkActions = config.bulkActions
    return (
      <>
        <Box
          ref={regionRef}
          role="region"
          aria-label={`${entity.plural} table`}
          tabIndex={-1}
          outline="none"
          onFocus={(event) => {
            lastFocusRef.current = event.target
          }}
        >
          <DataTable
            entity={entity}
            columns={columns}
            rows={props.rows}
            filters={filters}
            search={config.search}
            rowLabel={rowLabel}
            initialSort={config.initialSort}
            selectable={bulkActions !== undefined}
            selectedIds={selection}
            onSelectionChange={setSelectedIds}
            rowActions={(row) => config.rowActions(ctx, row)}
            bulkActions={bulkActions ? (selected) => bulkActions(ctx, selected) : undefined}
            addAction={{ onSelect: ctx.openAdd }}
          />
        </Box>
        <EntityDialog
          open={dialog.open && view !== null && view.kind !== 'confirm'}
          onOpenChange={(open) => {
            if (!open) close()
          }}
          title={title}
          description={description}
          size={size}
          finalFocusEl={returnFocus}
        >
          <Fragment key={dialog.key}>{body}</Fragment>
        </EntityDialog>
        <ConfirmDialog
          open={dialog.open && view?.kind === 'confirm'}
          onOpenChange={(open) => {
            if (!open) close()
          }}
          title={view?.kind === 'confirm' ? view.title : ''}
          description={view?.kind === 'confirm' ? view.description : ''}
          confirmLabel={view?.kind === 'confirm' ? view.confirmLabel : ''}
          tone={view?.kind === 'confirm' ? view.tone : 'danger'}
          finalFocusEl={returnFocus}
          onConfirm={() => {
            if (view?.kind === 'confirm') view.onConfirm()
          }}
        />
      </>
    )
  }

  return EntityTab
}

// Action items the object tabs share, so the six menus read the same.

export function editAction<T extends EntityRow, V, P>(ctx: EntityCtx<T, V, P>, row: T): ActionItem {
  return { id: 'edit', label: 'Edit', onSelect: () => ctx.openEdit(row) }
}

export function cloneAction<T extends EntityRow, V, P>(
  ctx: EntityCtx<T, V, P>,
  row: T,
): ActionItem {
  return { id: 'clone', label: 'Clone', onSelect: () => ctx.openClone(row) }
}

/** "Disable" for an active row, "Enable" for a disabled one; none when the host has no `onSetStatus`. */
export function statusActions<T extends EntityRow & { status: EntityStatus }, V, P>(
  ctx: EntityCtx<T, V, P>,
  row: T,
): ActionItem[] {
  const onSetStatus = ctx.props.onSetStatus
  if (!onSetStatus) return []
  const next: EntityStatus = row.status === 'active' ? 'disabled' : 'active'
  return [
    {
      id: 'status',
      label: next === 'active' ? 'Enable' : 'Disable',
      onSelect: () => onSetStatus([row.id], next),
    },
  ]
}

export function deleteAction<T extends EntityRow, V, P>(
  ctx: EntityCtx<T, V, P>,
  row: T,
): ActionItem {
  return {
    id: 'delete',
    label: 'Delete',
    tone: 'danger',
    onSelect: () => ctx.confirmDelete([row.id]),
  }
}

/** Bulk "Enable" and "Disable" for the selection; each is off when no row would change. */
export function bulkStatusActions<T extends EntityRow & { status: EntityStatus }, V, P>(
  ctx: EntityCtx<T, V, P>,
  selected: T[],
): ActionItem[] {
  const onSetStatus = ctx.props.onSetStatus
  if (!onSetStatus) return []
  const ids = selected.map((row) => row.id)
  return [
    {
      id: 'enable',
      label: 'Enable',
      disabled: selected.every((row) => row.status === 'active'),
      onSelect: () => onSetStatus(ids, 'active'),
    },
    {
      id: 'disable',
      label: 'Disable',
      disabled: selected.every((row) => row.status === 'disabled'),
      onSelect: () => onSetStatus(ids, 'disabled'),
    },
  ]
}

export function bulkDeleteAction<T extends EntityRow, V, P>(
  ctx: EntityCtx<T, V, P>,
  selected: T[],
): ActionItem {
  return {
    id: 'delete',
    label: 'Delete',
    tone: 'danger',
    onSelect: () => ctx.confirmDelete(selected.map((row) => row.id)),
  }
}
