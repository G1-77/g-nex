"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { Check, X } from "lucide-react"

import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, runAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { AdminButton, AdminIconButton, AdminPageHeader, AdminTab, AdminTabs } from "@/components/admin/ui"
import { formatTimestamp, statusTone } from "@/lib/admin/format"
import { ROLE_HIERARCHY } from "@/lib/admin/permissions"
import type { AdminRoleType } from "@/lib/supabase/types"

interface ApprovalsData {
  requests: Array<{
    id: string
    requested_by: string
    requester_username: string | null
    requester_role: string
    action_type: string
    target_table: string
    target_id: string
    label: string
    payload: Record<string, unknown> | null
    status: string
    review_note: string | null
    reviewed_at: string | null
    error: string | null
    created_at: string
  }>
  pendingCount: number
  viewerRole: AdminRoleType
  viewerId: string
}

const FILTERS = ["pending", "executed", "rejected", "failed", "all"] as const

const ACTION_TONE: Record<string, StatusTone> = {
  edit: "blue",
  delete: "red",
  wipe: "red",
  withdrawal_process: "amber",
}

export default function AdminApprovalsPage() {
  const [status, setStatus] = useState("pending")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canReview = can("approvals.review")

  const url = `/api/admin/approvals?status=${status}`
  const { data, isLoading, error } = useAdminQuery<ApprovalsData>(url)

  function canReviewRow(r: ApprovalsData["requests"][number]): boolean {
    if (!data || r.requested_by === data.viewerId) return false
    const requesterRank = ROLE_HIERARCHY[r.requester_role as AdminRoleType] ?? 0
    return ROLE_HIERARCHY[data.viewerRole] > requesterRank
  }

  async function review(requestId: string, decision: "approve" | "reject") {
    const note =
      decision === "approve"
        ? window.prompt("Approval note (optional):") ?? ""
        : window.prompt("Reason for rejection:") ?? ""
    if (decision === "reject" && !note) return
    try {
      await runAction("/api/admin/approvals", "POST", { requestId, decision, note })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] })
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const columns: AdminColumn<ApprovalsData["requests"][number]>[] = [
    {
      key: "requester",
      label: "Requested by",
      render: (r) => (
        <div>
          <p className="font-semibold text-slate-100">@{r.requester_username ?? "unknown"}</p>
          <p className="text-[10px] uppercase tracking-wide text-[var(--admin-text-dim)]">
            {r.requester_role.replace("_", " ")}
          </p>
        </div>
      ),
    },
    {
      key: "action",
      label: "Action",
      render: (r) => (
        <StatusBadge status={r.action_type} tone={ACTION_TONE[r.action_type] ?? "gray"} />
      ),
    },
    {
      key: "label",
      label: "Details",
      render: (r) => (
        <div className="max-w-xs">
          <p className="truncate text-slate-100">{r.label}</p>
          <p className="font-mono text-[10px] text-[var(--admin-text-dim)]">{r.target_table}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (r) => (
        <div>
          <StatusBadge status={r.status} tone={statusTone(r.status) as StatusTone} />
          {r.error && (
            <p className="mt-1 max-w-[16rem] truncate text-[10px] text-rose-300" title={r.error}>
              {r.error}
            </p>
          )}
          {r.review_note && !r.error && (
            <p className="mt-1 max-w-[16rem] truncate text-[10px] text-[var(--admin-text-dim)]" title={r.review_note}>
              “{r.review_note}”
            </p>
          )}
        </div>
      ),
    },
    {
      key: "created",
      label: "Filed",
      render: (r) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(r.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Approvals"
        subtitle="Edits and deletes filed by lower ranks await your sign-off"
      />

      {!canReview && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-300">
          You hold the approvals page open without the approvals.review permission — actions are read-only.
        </div>
      )}

      <AdminTabs>
        {FILTERS.map((s) => (
          <AdminTab key={s} active={status === s} onClick={() => setStatus(s)}>
            {s}
            {s === "pending" && (data?.pendingCount ?? 0) > 0 ? ` (${data?.pendingCount})` : ""}
          </AdminTab>
        ))}
      </AdminTabs>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.requests}
        loading={isLoading}
        emptyMessage="No approval requests in this view"
        actions={(r) =>
          r.status === "pending" && canReview && canReviewRow(r) ? (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <AdminButton variant="primary" onClick={() => review(r.id, "approve")}>
                <Check className="h-3.5 w-3.5" />
                Approve
              </AdminButton>
              <AdminIconButton variant="danger" title="Reject" aria-label="Reject" onClick={() => review(r.id, "reject")}>
                <X className="h-3.5 w-3.5" />
              </AdminIconButton>
            </div>
          ) : r.status === "pending" ? (
            <span className="text-[10px] uppercase tracking-wide text-[var(--admin-text-faint)]">
              higher rank required
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
