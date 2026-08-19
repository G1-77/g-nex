"use client"

import { useState } from "react"
import { useAdminQuery } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { formatTimestamp } from "@/lib/admin/format"

interface AuditData {
  logs: Array<{
    id: string
    admin_name: string | null
    action: string
    target_table: string | null
    target_id: string | null
    old_value: unknown
    new_value: unknown
    created_at: string
  }>
}

export default function AdminAuditPage() {
  const [action, setAction] = useState("all")

  const url = `/api/admin/audit?action=${action}`
  const { data, isLoading, error } = useAdminQuery<AuditData>(url)

  const columns: AdminColumn<AuditData["logs"][number]>[] = [
    {
      key: "admin",
      label: "Actor",
      render: (l) => <span className="font-semibold text-slate-100">{l.admin_name ?? "system"}</span>,
    },
    {
      key: "action",
      label: "Action",
      render: (l) => (
        <span className="rounded-md bg-white/5 px-2 py-1 font-mono text-[11px] text-sky-300">{l.action}</span>
      ),
    },
    {
      key: "target",
      label: "Target",
      render: (l) => (
        <div className="text-[11px]">
          <p className="text-[var(--admin-text-dim)]">{l.target_table ?? "—"}</p>
          <p className="font-mono text-[var(--admin-text-dim)]">{l.target_id?.slice(0, 8) ?? "—"}</p>
        </div>
      ),
      preview: false,
    },
    {
      key: "change",
      label: "Change",
      render: (l) => (
        <div className="max-w-xs text-[10px]">
          {l.old_value !== null && l.old_value !== undefined && (
            <p className="truncate text-rose-300">before: {JSON.stringify(l.old_value)}</p>
          )}
          {l.new_value !== null && l.new_value !== undefined && (
            <p className="truncate text-emerald-300">after: {JSON.stringify(l.new_value)}</p>
          )}
        </div>
      ),
      preview: false,
    },
    {
      key: "when",
      label: "When",
      render: (l) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(l.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["all", "deposits.approve", "deposits.reject", "withdrawals.process", "withdrawals.reject", "users.suspend", "users.unsuspend", "users.verify", "admin_roles.assign", "admin_roles.revoke", "admin_roles.update_permissions", "settings.update", "editorial.pick"].map((a) => (
          <button
            key={a}
            onClick={() => setAction(a)}
            className={
              action === a
                ? "rounded-lg bg-[var(--admin-green)]/10 px-3 py-1.5 text-[11px] font-semibold text-[var(--admin-green)]"
                : "rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-[11px] font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
            }
          >
            {a === "all" ? "All actions" : a.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.logs}
        loading={isLoading}
        emptyMessage="No audit records match your filter"
      />
    </div>
  )
}