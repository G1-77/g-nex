"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge } from "@/components/admin/status"
import { AdminButton, AdminPageHeader, AdminSearch, AdminTab, AdminTabs } from "@/components/admin/ui"
import { ReputationBadge } from "@/components/reputation/ReputationBadge"
import { formatTimestamp } from "@/lib/admin/format"

interface UsersData {
  users: Array<{
    id: string
    username: string
    full_name: string | null
    avatar_url: string | null
    is_verified: boolean
    is_active: boolean
    monthly_roi: number
    created_at: string
    deposit_account_number: string | null
    reputation_status: string | null
  }>
}

const FILTERS = ["all", "active", "suspended", "verified"] as const

export default function AdminUsersPage() {
  const [q, setQ] = useState("")
  const [status, setStatus] = useState("all")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canManage = can("users.manage")

  const url = `/api/admin/users?q=${encodeURIComponent(q)}&status=${status}`
  const { data, isLoading, error } = useAdminQuery<UsersData>(url)

  async function act(userId: string, action: string) {
    const reason =
      action === "suspend" ? window.prompt("Reason for suspension:") : ""
    if (action === "suspend" && !reason) return
    try {
      await adminAction("/api/admin/users", "PATCH", { userId, action, reason })
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const columns: AdminColumn<UsersData["users"][number]>[] = [
    {
      key: "user",
      label: "User",
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-[10px] font-black text-slate-200">
            {u.username.slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-100">@{u.username}</p>
            {u.full_name && <p className="text-[10px] text-[var(--admin-text-dim)]">{u.full_name}</p>}
          </div>
        </div>
      ),
    },
    {
      key: "reputation",
      label: "Reputation",
      render: (u) => <ReputationBadge status={u.reputation_status} />,
      preview: false,
    },
    {
      key: "verified",
      label: "Verified",
      render: (u) => (
        <StatusBadge status={u.is_verified ? "verified" : "unverified"} tone={u.is_verified ? "green" : "gray"} />
      ),
      preview: false,
    },
    {
      key: "active",
      label: "Status",
      render: (u) => (
        <StatusBadge status={u.is_active ? "active" : "suspended"} tone={u.is_active ? "blue" : "red"} />
      ),
    },
    {
      key: "roi",
      label: "ROI",
      render: (u) => <span className="font-mono text-slate-100">{u.monthly_roi.toFixed(2)}%</span>,
      preview: false,
    },
    {
      key: "account",
      label: "Account #",
      render: (u) => (
        <span className="font-mono text-[11px] text-[var(--admin-text-dim)]">
          {u.deposit_account_number ?? "—"}
        </span>
      ),
      preview: false,
    },
    {
      key: "joined",
      label: "Joined",
      render: (u) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(u.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Users" subtitle="Search, verify and manage account standing" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <AdminSearch
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by username or name…"
          className="md:max-w-xs"
        />
        <AdminTabs>
          {FILTERS.map((s) => (
            <AdminTab key={s} active={status === s} onClick={() => setStatus(s)}>
              {s[0].toUpperCase() + s.slice(1)}
            </AdminTab>
          ))}
        </AdminTabs>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.users}
        loading={isLoading}
        emptyMessage="No users match your filters"
        actions={
          canManage
            ? (u) => (
                <div className="flex gap-1.5">
                  {u.is_active ? (
                    <AdminButton variant="danger" onClick={() => act(u.id, "suspend")}>
                      Suspend
                    </AdminButton>
                  ) : (
                    <AdminButton variant="subtle" onClick={() => act(u.id, "unsuspend")}>
                      Reinstate
                    </AdminButton>
                  )}
                  {u.is_verified ? (
                    <AdminButton variant="subtle" onClick={() => act(u.id, "unverify")}>
                      Unverify
                    </AdminButton>
                  ) : (
                    <AdminButton variant="subtle" onClick={() => act(u.id, "verify")}>
                      Verify
                    </AdminButton>
                  )}
                </div>
              )
            : undefined
        }
      />
    </div>
  )
}