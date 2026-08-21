"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { ShieldOff } from "lucide-react"

import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { AdminButton, AdminPageHeader, AdminPanel, AdminSectionLabel, AdminSelect } from "@/components/admin/ui"
import { UserSearchPicker, type PickedUser } from "@/components/admin/UserSearchPicker"
import { formatTimestamp } from "@/lib/admin/format"
import { ROLE_HIERARCHY, type PermissionCode } from "@/lib/admin/permissions"
import type { AdminRoleType } from "@/lib/supabase/types"

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

const ALL_ROLES: AdminRoleType[] = ["super_admin", "admin", "support", "editor"]

const rankOf = (role: string) => ROLE_HIERARCHY[role as AdminRoleType] ?? 0

export default function AdminRolesPage() {
  const [pickedUser, setPickedUser] = useState<PickedUser | null>(null)
  const [role, setRole] = useState<AdminRoleType>("support")
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingSelections, setEditingSelections] = useState<PermissionCode[]>([])
  const queryClient = useQueryClient()
  const { user, role: actorRole, isSuperAdmin, can } = useAuth()

  const url = "/api/admin/roles"
  const { data, isLoading, error } = useAdminQuery<RolesData>(url)

  if (!can("admins.manage")) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        You do not have permission to manage admin users.
      </div>
    )
  }

  // Roles this viewer may grant or change someone into. Admins are scoped to
  // the ranks below them; super_admins to everything.
  const assignable: AdminRoleType[] =
    actorRole === "super_admin" ? ALL_ROLES : actorRole === "admin" ? ["support", "editor"] : []
  const effectiveRole = assignable.includes(role) ? role : assignable[0]

  /** Whether this viewer may take any management action on the row. */
  function canManageRow(s: RolesData["staff"][number]): boolean {
    if (!actorRole || s.user_id === user?.id) return false
    if (actorRole === "super_admin") return true
    return rankOf(s.role) < ROLE_HIERARCHY[actorRole]
  }

  async function assign() {
    if (!pickedUser) {
      alert("Search for and select a user first.")
      return
    }
    try {
      await adminAction(url, "POST", { action: "assign", userId: pickedUser.id, role: effectiveRole })
      setPickedUser(null)
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function removeAccess(s: RolesData["staff"][number]) {
    if (
      !confirm(
        `Remove @${s.username ?? "this user"}'s admin access entirely?\n\nThey will become a regular user and lose all staff permissions. This cannot be undone.`
      )
    ) {
      return
    }
    try {
      await adminAction(url, "POST", { action: "revoke", userId: s.user_id })
      await queryClient.invalidateQueries({ queryKey: [url] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  async function changeRole(s: RolesData["staff"][number], newRole: string) {
    const oldRole = s.role
    if (newRole === oldRole) return
    const verb = rankOf(newRole) > rankOf(oldRole) ? "Promote" : "Demote"
    if (
      !confirm(
        `${verb} @${s.username ?? "this user"} from ${oldRole.replace("_", " ")} to ${newRole.replace("_", " ")}?\n\nTheir permissions will be reset to the ${newRole.replace("_", " ")} defaults.`
      )
    ) {
      return
    }
    try {
      await adminAction(url, "POST", { action: "update_role", userId: s.user_id, role: newRole })
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
      render: (s) => {
        // Rows outside the viewer's scope stay readable but locked; their
        // current role is always present as an option so the select renders.
        const options = canManageRow(s)
          ? assignable
          : Array.from(new Set([s.role as AdminRoleType]))
        return (
          <AdminSelect
            value={s.role}
            onChange={(e) => changeRole(s, e.target.value)}
            disabled={!canManageRow(s)}
            title={canManageRow(s) ? "Change role" : "Read-only — above your management scope"}
            className="py-1! text-xs font-semibold capitalize disabled:opacity-50"
          >
            {options.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </AdminSelect>
        )
      },
    },
    {
      key: "permissions",
      label: "Permissions",
      render: (s) => (
        <div className="flex items-center gap-2 whitespace-nowrap">
          <span className="text-[var(--admin-text-dim)]">{s.permissions.length} grants</span>
          {editingUserId === s.id ? (
            <span className="text-[var(--admin-green)]">editing…</span>
          ) : (
            isSuperAdmin && (
              <AdminButton variant="subtle" onClick={() => startEditing(s.id, s.permissions)}>
                Edit
              </AdminButton>
            )
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
      <AdminPageHeader title="Admin Users" subtitle="Grant roles, promote, demote, and remove staff access" />

      {!isSuperAdmin && (
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4 text-xs text-[var(--admin-text-dim)]">
          Scoped access — you can grant, promote, demote, and remove <strong className="text-slate-200">support</strong> and{" "}
          <strong className="text-slate-200">editor</strong> staff only. Roles at or above your level are read-only.
        </div>
      )}

      <AdminPanel className="p-4">
        <AdminSectionLabel className="mb-3">Grant admin access</AdminSectionLabel>
        <div className="flex flex-col gap-2 md:flex-row md:items-center">
          <UserSearchPicker value={pickedUser} onChange={setPickedUser} />
          <AdminSelect
            value={effectiveRole}
            onChange={(e) => setRole(e.target.value as AdminRoleType)}
            className="font-semibold capitalize"
          >
            {assignable.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </AdminSelect>
          <AdminButton variant="primary" onClick={assign}>
            Grant access
          </AdminButton>
        </div>
      </AdminPanel>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.staff}
        loading={isLoading}
        emptyMessage="No admin users yet"
        actions={(s) =>
          canManageRow(s) ? (
            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
              <AdminButton variant="danger" onClick={() => removeAccess(s)}>
                <ShieldOff className="h-3.5 w-3.5" />
                Remove access
              </AdminButton>
            </div>
          ) : s.user_id === user?.id ? (
            <span className="text-[10px] uppercase tracking-wide text-[var(--admin-text-faint)]">you</span>
          ) : undefined
        }
      />

      {editingUserId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center">
          <button
            aria-label="Close"
            onClick={() => setEditingUserId(null)}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />
          <div className="admin-panel relative max-h-[80vh] w-full max-w-lg overflow-y-auto p-5 pb-8 shadow-[var(--admin-shadow)] md:rounded-2xl">
            <AdminSectionLabel className="mb-4 text-slate-100">Edit permissions</AdminSectionLabel>
            <div className="grid grid-cols-1 gap-1.5">
              {data?.catalog.map((perm) => {
                const selected = editingSelections.includes(perm.code as PermissionCode)
                return (
                  <label
                    key={perm.code}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] p-2.5 transition-colors hover:bg-[var(--admin-panel-hover)]"
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
              <AdminButton variant="subtle" onClick={() => setEditingUserId(null)}>
                Cancel
              </AdminButton>
              <AdminButton variant="primary" onClick={() => savePermissions(editingUserId)}>
                Save permissions
              </AdminButton>
            </div>
          </div>
        </div>
      )}

      <AdminPanel className="p-4">
        <AdminSectionLabel className="mb-3">Role defaults (applied at grant time)</AdminSectionLabel>
        <div className="grid gap-3 md:grid-cols-2">
          {ALL_ROLES.map((r) => (
            <div key={r} className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)]/60 p-3">
              <p className="mb-2 text-xs font-bold capitalize text-slate-100">{r.replace("_", " ")}</p>
              <div className="flex flex-wrap gap-1">
                {(data?.roleDefaults[r] ?? []).map((p) => (
                  <span key={p} className="rounded-full border border-[var(--admin-border)] bg-[var(--admin-panel)] px-2 py-0.5 font-mono text-[9px] text-[var(--admin-text-dim)]">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </AdminPanel>
    </div>
  )
}
