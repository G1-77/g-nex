"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/status"
import { AdminButton, AdminPageHeader, AdminPanel, AdminSectionLabel } from "@/components/admin/ui"
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
      <AdminPageHeader title="Editorial" subtitle="Curate the picks that anchor the community feed" />

      {canManage && (
        <AdminPanel className="p-4">
          <AdminSectionLabel className="mb-3">Add an editorial pick</AdminSectionLabel>
          <div className="flex flex-col gap-2 md:flex-row">
            <input
              value={postId}
              onChange={(e) => setPostId(e.target.value)}
              placeholder="Post ID (uuid)"
              className="admin-input w-full font-mono md:max-w-xs"
            />
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this pick-worthy?"
              className="admin-input w-full flex-1"
            />
            <AdminButton variant="primary" onClick={addPick}>
              Add pick
            </AdminButton>
          </div>
        </AdminPanel>
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
                <AdminButton variant="danger" onClick={() => unpick(p.id)}>
                  Remove
                </AdminButton>
              )
            : undefined
        }
      />
    </div>
  )
}