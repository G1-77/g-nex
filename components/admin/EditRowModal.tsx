"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"
import { useQueryClient } from "@tanstack/react-query"
import { runAction } from "@/components/admin/useAdminQuery"
import { AdminButton, AdminSectionLabel } from "@/components/admin/ui"

export interface EditField {
  key: string
  label: string
  type?: "text" | "number" | "select" | "textarea"
  options?: { value: string; label: string }[]
  /** A string prefixed to the value shown in text/number inputs (e.g. "$" or "KES "). */
  prefix?: string
}

export function EditRowModal({
  url,
  id,
  fields,
  row,
  onClose,
  onSaved,
  buildBody,
}: {
  url: string
  id: string
  fields: EditField[]
  row: Record<string, unknown>
  onClose: () => void
  onSaved: () => void
  /** Override the default PATCH body `{ id, changes }` for routes with a different contract. */
  buildBody?: (id: string, changes: Record<string, unknown>) => Record<string, unknown>
}) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {}
    for (const f of fields) {
      const raw = row[f.key]
      initial[f.key] = raw === null || raw === undefined ? "" : String(raw)
    }
    return initial
  })
  const [busy, setBusy] = useState(false)

  async function save() {
    setBusy(true)
    const changes: Record<string, unknown> = {}
    for (const f of fields) {
      const v = values[f.key]
      if (v === "") continue
      changes[f.key] = f.type === "number" ? Number(v) : v
    }
    try {
      await runAction(url, "PATCH", buildBody ? buildBody(id, changes) : { id, changes })
      await queryClient.invalidateQueries({ queryKey: [url] })
      onSaved()
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  // Portal to <body>: the admin table panel uses backdrop-blur (a containing
  // block for fixed descendants) plus overflow clipping, which would otherwise
  // trap this overlay inside the table instead of covering the viewport.
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <button
        aria-label="Close editor"
        onClick={onClose}
        className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
      />
      <div className="relative w-full max-w-md rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel-elevated)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-bold tracking-tight text-slate-100">Edit record</p>
          <button
            aria-label="Close"
            onClick={onClose}
            className="rounded-lg p-1.5 text-[var(--admin-text-dim)] hover:bg-white/10"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3">
          {fields.map((f) => {
            const value = values[f.key]
            const input = (
              <>
                {f.type === "select" ? (
                  <select
                    className="admin-input w-full"
                    value={value}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  >
                    {f.options?.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : f.type === "textarea" ? (
                  <textarea
                    className="admin-input w-full"
                    rows={3}
                    value={value}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                ) : (
                  <input
                    type={f.type === "number" ? "number" : "text"}
                    step={f.type === "number" ? "any" : undefined}
                    className="admin-input w-full"
                    value={value}
                    onChange={(e) => setValues((prev) => ({ ...prev, [f.key]: e.target.value }))}
                  />
                )}
              </>
            )
            return (
              <div key={f.key}>
                <AdminSectionLabel className="mb-1">{f.label}</AdminSectionLabel>
                {f.prefix ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[var(--admin-text-dim)]">{f.prefix}</span>
                    {input}
                  </div>
                ) : (
                  input
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <AdminButton variant="subtle" onClick={onClose} disabled={busy}>
            Cancel
          </AdminButton>
          <AdminButton variant="primary" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </AdminButton>
        </div>
      </div>
    </div>,
    document.body
  )
}