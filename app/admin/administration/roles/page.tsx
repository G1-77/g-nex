"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { formatTimestamp } from "@/lib/admin/format"
import type { PermissionCode } from "@/lib/admin/permissions"

interface RolesData {
  staff: Array<{
    id: string
    user_id: string
    username: string | null
    full_name: string | null
    role: string
    permissions: string[]
    granted_by: string | null
    created_at: string
  }>
  catalog: Array<{ code: string; name: string; description: string }>
  roleDefaults: Record<string, string[]>
  allPermissions: string[]
}

const ROLES = ["super_admin", "admin", "support", "editor"]

export default function AdminRolesPage() {
  const [userId, setUserId] = useState("")
  const [role, setRole] = useState("admin")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingSelections, setEditingSelections] = useState<PermissionCode[]>([])
  const queryClient = useQueryClient()
  const { user, isSuperAdmin } = useAuth()

  const url = "/api/admin/roles"
  const { data, isLoading, error } = useAdminQuery<RolesData>(url)

  if (!isSuperAdmin) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        Only super admins can manage admin roles and permissions.
      </div>
    )
  }

  async function assign() {
    if (!userId.trim()) return
    try {
      await adminAction(url, "POST", { action: "assign", userId: userId.trim(), role })
      setUserId("")
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function revoke(id: string, targetUserId: string) {
    if (!confirm("Revoke this user's admin access? This cannot be undone.")) return
    try {
      await adminAction(url, "POST", { action: "revoke", userId: targetUserId })
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function changeRole(targetUserId: string, newRole: string) {
    try {
      await adminAction(url, "POST", { action: "update_role", userId: targetUserId, role: newRole })
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  function startEditing(targetUserId: string, perms: string[]) {
    setEditingUserId(targetUserId)
    setEditingSelections(perms as PermissionCode[])
  }

  async function savePermissions(targetUserId: string) {
    try {
      await adminAction(url, "POST", {
        action: "update_permissions",
        userId: targetUserId,
        permissions: editingSelections,
      })
      setEditingUserId(null)
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  function togglePermission(perm: PermissionCode) {
    setEditingSelections((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const columns: AdminColumn<RolesData["staff"][number]>[] = [
    {
      key: "user",
      label: "User",
      render: (s) => (
        <div>
          <p className="font-semibold text-slate-100">@{s.username ?? "unknown"}</p>
          {s.full_name && <p className="text-[10px] text-[var(--admin-text-dim)]">{s.full_name}</p>}
        </div>
      ),
    },
    {
      key: "role",
      label: "Role",
      render: (s) => (
        <select
          value={s.role}
          onChange={(e) => changeRole(s.user_id, e.target.value)}
          disabled={s.user_id === user?.id}
          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2 py-1 text-xs font-semibold capitalize text-slate-100 outline-none disabled:opacity-50"
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r.replace("_", " ")}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "permissions",
      label: "Permissions",
      render: (s) => (
        <div className="flex items-center gap-2">
          <span className="text-[var(--admin-text-dim)]">{s.permissions.length} grants</span>
          {editingUserId === s.id ? (
            <span className="text-[var(--admin-green)]">editing…</span>
          ) : (
            <button
              onClick={() => startEditing(s.id, s.permissions)}
              className="rounded-lg bg-white/5 px-2 py-1 text-[10px] font-semibold text-slate-300 hover:bg-white/10"
            >
              Edit
            </button>
          )}
        </div>
      ),
      preview: false,
    },
    {
      key: "granted",
      label: "Granted",
      render: (s) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(s.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-dim)]">
          Grant admin access
        </p>
        <div className="flex flex-col gap-2 md:flex-row">
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="User ID (uuid)"
            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-xs text-slate-100 outline-none placeholder:text-[var(--admin-text-dim)] focus:border-[var(--admin-green)]/50 md:max-w-xs"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2 py-2 text-xs font-semibold capitalize text-slate-100 outline-none"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            onClick={assign}
            className="rounded-lg bg-[var(--admin-green)] px-4 py-2 text-xs font-bold text-black hover:brightness-110"
          >
            Grant access
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.staff}
        loading={isLoading}
        emptyMessage="No admin users yet"
        actions={(s) => (
          <div className="flex gap-1.5">
            {s.user_id !== user?.id && (
              <button
                onClick={() => revoke(s.id, s.user_id)}
                className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20"
              >
                Revoke
              </button>
            )}
          </div>
        )}
      />

      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <button
            aria-label="Close"
            onClick={() => setEditingUserId(null)}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />
          <div className="relative max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-[var(--admin-border)] bg-[var(--admin-panel-elevated)] p-5 pb-8 shadow-2xl md:rounded-2xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-100">
              Edit permissions
            </p>
            <div className="grid grid-cols-1 gap-1.5">
              {data?.catalog.map((perm) => {
                const selected = editingSelections.includes(perm.code as PermissionCode)
                return (
                  <label
                    key={perm.code}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--admin-border)] p-2.5 hover:bg-white/5"
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => togglePermission(perm.code as PermissionCode)}
                      className="mt-0.5 h-3.5 w-3.5 accent-[#8DFF45]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-100">{perm.name}</span>
                      <span className="block font-mono text-[10px] text-[var(--admin-text-dim)]">{perm.code}</span>
                    </span>
                  </label>
                )
              })}
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => setEditingUserId(null)}
                className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={() => savePermissions(editingUserId)}
                className="rounded-lg bg-[var(--admin-green)] px-4 py-2 text-xs font-bold text-black hover:brightness-110"
              >
                Save permissions
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-dim)]">
          Role defaults (applied at grant time)
        </p>
        <div className="grid gap-3 md:grid-cols-2">
          {ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] p-3">
              <p className="mb-2 text-xs font-bold capitalize text-slate-100">{r.replace("_", " ")}</p>
              <div className="flex flex-wrap gap-1">
                {(data?.roleDefaults[r] ?? []).map((p) => (
                  <span key={p} className="rounded-full border border-[var(--admin-border)] px-2 py-0.5 font-mono text-[9px] text-[var(--admin-text-dim)]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}