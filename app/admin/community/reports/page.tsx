"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { formatTimestamp, statusTone } from "@/lib/admin/format"

interface ReportsData {
  reports: Array<{
    id: string
    reporter_name: string | null
    content_type: string
    content_id: string
    reason: string
    details: string | null
    status: string
    resolution: string | null
    resolved_at: string | null
    created_at: string
  }>
}

export default function AdminReportsPage() {
  const [status, setStatus] = useState("pending")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canModerate = can("community.moderate") || can("community.report_review")

  const url = `/api/admin/reports?status=${status}`
  const { data, isLoading, error } = useAdminQuery<ReportsData>(url)

  async function act(reportId: string, action: "resolve" | "dismiss") {
    const resolution =
      action === "resolve" ? window.prompt("Resolution / moderation outcome:") ?? "" : ""
    if (action === "resolve" && !resolution) return
    try {
      await adminAction("/api/admin/reports", "PATCH", { reportId, action, resolution })
      await queryClient.invalidateQueries({ queryKey: [url] })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const columns: AdminColumn<ReportsData["reports"][number]>[] = [
    {
      key: "reporter",
      label: "Reporter",
      render: (r) => <span className="font-semibold text-slate-100">{r.reporter_name ?? "anonymous"}</span>,
    },
    {
      key: "content",
      label: "Content",
      render: (r) => (
        <div className="text-[11px]">
          <p className="font-bold uppercase tracking-wide text-slate-100">{r.content_type}</p>
          <p className="font-mono text-[var(--admin-text-dim)]">{r.content_id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: "reason",
      label: "Reason",
      render: (r) => <span className="text-slate-200">{r.reason}</span>,
    },
    {
      key: "details",
      label: "Details",
      render: (r) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{r.details ?? "—"}</span>
      ),
      preview: false,
    },
    {
      key: "status",
      label: "Status",
      render: (r) => <StatusBadge status={r.status} tone={statusTone(r.status) as StatusTone} />,
    },
    {
      key: "resolution",
      label: "Resolution",
      render: (r) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{r.resolution ?? "—"}</span>
      ),
      preview: false,
    },
    {
      key: "submitted",
      label: "Submitted",
      render: (r) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(r.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["pending", "under_review", "actioned", "dismissed"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              status === s
                ? "rounded-lg bg-[var(--admin-green)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-green)]"
                : "rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
            }
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.reports}
        loading={isLoading}
        emptyMessage="No reports in this queue"
        actions={
          canModerate
            ? (r) =>
                r.status === "pending" || r.status === "under_review" ? (
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => act(r.id, "resolve")}
                      className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20"
                    >
                      Take action
                    </button>
                    <button
                      onClick={() => act(r.id, "dismiss")}
                      className="rounded-lg bg-white/5 px-2.5 py-1 text-[10px] font-semibold text-[var(--admin-text-dim)] hover:bg-white/10"
                    >
                      Dismiss
                    </button>
                  </div>
                ) : undefined
            : undefined
        }
      />
    </div>
  )
}