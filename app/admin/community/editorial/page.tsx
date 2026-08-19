"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/status"
import { formatTimestamp } from "@/lib/admin/format"

interface EditorialData {
  picks: Array<{
    id: string
    post_id: string
    post_content: string | null
    author_name: string | null
    reason: string | null
    sort_order: number
    active: boolean
    created_at: string
  }>
}

export default function AdminEditorialPage() {
  const [postId, setPostId] = useState("")
  const [reason, setReason] = useState("")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canManage = can("content.manage") || can("content.publish")

  const url = "/api/admin/editorial"
  const { data, isLoading, error } = useAdminQuery<EditorialData>(url)

  async function addPick() {
    if (!postId.trim()) return
    try {
      await adminAction(url, "POST", { postId: postId.trim(), reason: reason.trim() })
      setPostId("")
      setReason("")
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function unpick(id: string) {
    try {
      await adminAction(`${url}?id=${encodeURIComponent(id)}`, "DELETE")
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const columns: AdminColumn<EditorialData["picks"][number]>[] = [
    {
      key: "order",
      label: "Order",
      render: (p) => <span className="font-mono text-slate-100">{p.sort_order}</span>,
      preview: false,
    },
    {
      key: "post",
      label: "Post",
      render: (p) => (
        <div className="min-w-0 max-w-xs">
          <p className="truncate text-slate-100">{p.post_content ?? "—"}</p>
          <p className="font-mono text-[10px] text-[var(--admin-text-dim)]">{p.post_id.slice(0, 8)}</p>
        </div>
      ),
    },
    {
      key: "author",
      label: "Author",
      render: (p) => <span className="font-semibold text-slate-100">{p.author_name ?? "unknown"}</span>,
    },
    {
      key: "reason",
      label: "Reason",
      render: (p) => <span className="text-[11px] text-[var(--admin-text-dim)]">{p.reason ?? "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (p) => <StatusBadge status={p.active ? "active" : "inactive"} tone={p.active ? "green" : "gray"} />,
    },
    {
      key: "created",
      label: "Picked",
      render: (p) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(p.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      {canManage && (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-dim)]">
            Add an editorial pick
          </p>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              placeholder="Post ID (uuid)"
              className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-[var(--admin-text-dim)] focus:border-[var(--admin-green)]/50 md:max-w-xs"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this pick-worthy?"
              className="w-full flex-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 text-xs text-slate-100 outline-none placeholder:text-[var(--admin-text-dim)] focus:border-[var(--admin-green)]/50"
            />
            <button
              onClick={addPick}
              className="rounded-lg bg-[var(--admin-green)] px-4 py-2 text-xs font-bold text-black hover:brightness-110"
            >
              Add pick
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.picks}
        loading={isLoading}
        emptyMessage="No editorial picks yet"
        actions={
          canManage
            ? (p) => (
                <button
                  onClick={() => unpick(p.id)}
                  className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20"
                >
                  Remove
                </button>
              )
            : undefined
        }
      />
    </div>
  )
}