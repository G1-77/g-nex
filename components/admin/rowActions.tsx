"use client"

import { useState } from "react"
import { Trash2, Pencil, Eraser } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { runAction } from "@/components/admin/useAdminQuery"
import { AdminButton, AdminIconButton } from "@/components/admin/ui"
import { EditRowModal, type EditField } from "@/components/admin/EditRowModal"

/** Danger delete button with a typed confirmation. Invalidates the URL's query. */
export function DeleteButton({
  url,
  id,
  label = "Delete",
  confirmMessage = "Permanently delete this record? This cannot be undone.",
  iconOnly = false,
  onDone,
}: {
  url: string
  id: string
  label?: string
  confirmMessage?: string
  iconOnly?: boolean
  onDone?: () => void
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!window.confirm(confirmMessage)) return
    setBusy(true)
    try {
      await runAction(`${url}?id=${encodeURIComponent(id)}`, "DELETE")
      await queryClient.invalidateQueries({ queryKey: [url] })
      onDone?.()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (iconOnly) {
    return (
      <AdminIconButton
        variant="danger"
        title={label}
        onClick={handleDelete}
        disabled={busy}
        aria-label={label}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </AdminIconButton>
    )
  }

  return (
    <AdminButton variant="danger" onClick={handleDelete} disabled={busy}>
      <Trash2 className="h-3.5 w-3.5" />
      {label}
    </AdminButton>
  )
}

/** Opens an inline edit modal that PATCHes whitelisted columns for the row. */
export function EditButton({
  url,
  id,
  fields,
  row,
  iconOnly = false,
  buildBody,
  onDone,
}: {
  url: string
  id: string
  fields: EditField[]
  row: Record<string, unknown>
  iconOnly?: boolean
  buildBody?: (id: string, changes: Record<string, unknown>) => Record<string, unknown>
  onDone?: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <>
      {iconOnly ? (
        <AdminIconButton variant="subtle" title="Edit" aria-label="Edit" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
        </AdminIconButton>
      ) : (
        <AdminButton variant="subtle" onClick={() => setOpen(true)}>
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </AdminButton>
      )}
      {open && (
        <EditRowModal
          url={url}
          id={id}
          fields={fields}
          row={row}
          buildBody={buildBody}
          onClose={() => setOpen(false)}
          onSaved={() => {
            setOpen(false)
            onDone?.()
          }}
        />
      )}
    </>
  )
}

/** Wipe a user's trading history (orders, transactions, positions, holdings). */
export function WipeButton({
  username,
  userId,
  onDone,
}: {
  username: string
  userId: string
  onDone?: () => void
}) {
  const queryClient = useQueryClient()
  const [busy, setBusy] = useState(false)

  async function handleWipe() {
    if (
      !window.confirm(
        `Wipe ALL trading history for @${username} (orders, transactions, positions, holdings) and zero their wallet? This cannot be undone.`
      )
    ) {
      return
    }
    setBusy(true)
    try {
      await runAction("/api/admin/users", "PATCH", { userId, action: "wipe", username })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] })
      onDone?.()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AdminIconButton
      variant="danger"
      title="Wipe trading"
      aria-label="Wipe trading"
      onClick={handleWipe}
      disabled={busy}
    >
      <Eraser className="h-3.5 w-3.5" />
    </AdminIconButton>
  )
}

/** Compact edit + delete pair for finance/content rows (table cells). */
export function RowActions({
  url,
  id,
  fields,
  row,
  canEdit = true,
  canDelete = true,
  onChanged,
}: {
  url: string
  id: string
  fields: EditField[]
  row: Record<string, unknown>
  canEdit?: boolean
  canDelete?: boolean
  onChanged?: () => void
}) {
  return (
    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
      {canEdit && (
        <EditButton url={url} id={id} fields={fields} row={row} iconOnly onDone={onChanged} />
      )}
      {canDelete && <DeleteButton url={url} id={id} iconOnly onDone={onChanged} />}
    </div>
  )
}
