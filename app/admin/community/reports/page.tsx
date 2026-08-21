"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { Trash2 } from "lucide-react"
import { useAdminQuery, runAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { AdminButton, AdminIconButton, AdminPageHeader, AdminTab, AdminTabs } from "@/components/admin/ui"
import { DeleteButton } from "@/components/admin/rowActions"
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

const FILTERS = ["pending", "under_review", "actioned", "dismissed"] as const

export default function AdminReportsPage() {
  const [status, setStatus] = useState("pending")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canModerate = can("community.moderate") || can("community.report_review")
  const canDelete = can("data.delete")

  const url = `/api/admin/reports?status=${status}`
  const { data, isLoading, error } = useAdminQuery<ReportsData>(url)

  async function act(reportId: string, action: "resolve" | "dismiss" | "delete_content") {
    if (action === "delete_content" && !window.confirm("Permanently delete the reported content? This cannot be undone.")) return
    const resolution =
      action === "resolve" ? window.prompt("Resolution / moderation outcome:") ?? "" : ""
    if (action === "resolve" && !resolution) return
    try {
      await runAction("/api/admin/reports", "PATCH", { reportId, action, resolution })
      await queryClient.invalidateQueries({ queryKey: [url] })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] })
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
      <AdminPageHeader title="Reports" subtitle="Review and moderate flagged content" />

      <AdminTabs>
        {FILTERS.map((s) => (
          <AdminTab key={s} active={status === s} onClick={() => setStatus(s)}>
            {s.replace("_", " ")}
          </AdminTab>
        ))}
      </AdminTabs>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.reports}
        loading={isLoading}
        emptyMessage="No reports in this queue"
        actions={(r) => {
                const moderatable = r.status === "pending" || r.status === "under_review"
                return (
                  <div className="flex items-center justify-end gap-1.5">
                    {canModerate && moderatable && (
                      <>
                        <AdminButton variant="danger" onClick={() => act(r.id, "resolve")}>
                          Take action
                        </AdminButton>
                        <AdminButton variant="subtle" onClick={() => act(r.id, "dismiss")}>
                          Dismiss
                        </AdminButton>
                      </>
                    )}
                    {canDelete && (
                      <>
                        <AdminIconButton
                          variant="danger"
                          title="Delete content"
                          aria-label="Delete content"
                          onClick={() => act(r.id, "delete_content")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </AdminIconButton>
                        <DeleteButton iconOnly url="/api/admin/reports" id={r.id} label="Delete report" />
                      </>
                    )}
                  </div>
                )
              }}
      />
    </div>
  )
}