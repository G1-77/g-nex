import { createServerClient } from "@/lib/supabase/server"
import {
  requirePermission,
  requireSuperAdmin,
  forbiddenResponse,
} from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import {
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_HIERARCHY,
  PERMISSIONS,
  ALL_PERMISSIONS,
  isPermissionCode,
  type PermissionCode,
} from "@/lib/admin/permissions"
import type { AdminRoleType } from "@/lib/supabase/types"

export interface AdminStaffRow {
  id: string
  user_id: string
  username: string | null
  full_name: string | null
  role: string
  permissions: string[]
  granted_by: string | null
  created_at: string
}

/** Roles an actor may grant or change someone into, given their own rank. */
export function assignableRoles(actorRole: AdminRoleType): AdminRoleType[] {
  if (actorRole === "super_admin") return ["super_admin", "admin", "support", "editor"]
  if (actorRole === "admin") return ["support", "editor"]
  return []
}

/** Whether the actor may take any management action on a target holding targetRole. */
export function canManageTarget(actorRole: AdminRoleType, targetRole: AdminRoleType): boolean {
  if (actorRole === "super_admin") return true
  return ROLE_HIERARCHY[targetRole] < ROLE_HIERARCHY[actorRole]
}

export async function GET() {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "admins.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  // admin_roles.user_id references auth.users (not profiles), so profiles
  // must be resolved in a separate query keyed on the staff user ids.
  const { data, error } = await service
    .from("admin_roles")
    .select("id, user_id, role, permissions, granted_by, created_at")
    .order("created_at", { ascending: true })

  if (error) return new Response(error.message, { status: 500 })

  const ids = (data ?? []).map((r) => r.user_id)
  const { data: profiles } = await service
    .from("profiles")
    .select("id, username, full_name")
    .in("id", ids.length > 0 ? ids : [""])
  const profileMap = new Map(
    (profiles ?? []).map((p) => [p.id, { username: p.username ?? null, full_name: p.full_name ?? null }])
  )

  const staff: AdminStaffRow[] = (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    username: profileMap.get(r.user_id)?.username ?? null,
    full_name: profileMap.get(r.user_id)?.full_name ?? null,
    role: r.role,
    permissions: Array.isArray(r.permissions) ? r.permissions.map(String) : [],
    granted_by: r.granted_by,
    created_at: r.created_at,
  }))

  return Response.json({
    staff,
    catalog: PERMISSIONS,
    roleDefaults: ROLE_DEFAULT_PERMISSIONS,
    allPermissions: ALL_PERMISSIONS,
  })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "admins.manage")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const action = String(body.action ?? "") // assign | revoke | update_role | update_permissions
  const targetUserId = String(body.userId ?? "")
  const role = String(body.role ?? "") as AdminRoleType
  const permissions: unknown[] = Array.isArray(body.permissions) ? body.permissions : []

  if (!targetUserId) return new Response("Missing userId", { status: 400 })
  if (targetUserId === ctx.userId && action !== "update_permissions") {
    return new Response("You cannot manage your own role", { status: 400 })
  }

  const { data: targetProfile, error: profileError } = await service
    .from("profiles")
    .select("id, username")
    .eq("id", targetUserId)
    .maybeSingle()

  if (profileError || !targetProfile) {
    return new Response(profileError?.message ?? "User not found", { status: 404 })
  }

  const { data: existing } = await service
    .from("admin_roles")
    .select("id, user_id, role, permissions, granted_by")
    .eq("user_id", targetUserId)
    .maybeSingle()

  /** Block demotions/removals that would leave the platform without a super admin. */
  async function guardLastSuperAdmin(currentRole: AdminRoleType, nextRole?: AdminRoleType) {
    if (currentRole !== "super_admin" || nextRole === "super_admin") return null
    const { count } = await service
      .from("admin_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "super_admin")
    if ((count ?? 0) <= 1) {
      return new Response("Cannot remove the last super admin", { status: 400 })
    }
    return null
  }

  if (action === "assign") {
    if (!isKnownRole(role)) return new Response("Invalid role", { status: 400 })
    if (!assignableRoles(ctx.role).includes(role)) {
      return forbiddenResponse("You cannot grant roles at or above your own level")
    }
    if (existing) return new Response("User already has an admin role", { status: 400 })

    const defaults: PermissionCode[] =
      permissions.length > 0
        ? permissions.filter((p): p is PermissionCode => typeof p === "string" && isPermissionCode(p))
        : [...ROLE_DEFAULT_PERMISSIONS[role]]

    const { data: inserted, error } = await service
      .from("admin_roles")
      .insert({ user_id: targetUserId, role, permissions: defaults, granted_by: ctx.userId })
      .select("id")
      .single()

    if (error) return new Response(error.message, { status: 500 })

    await recordAudit(service, {
      adminId: ctx.userId,
      action: "admin_roles.assign",
      targetTable: "admin_roles",
      targetId: inserted.id,
      newValue: { user_id: targetUserId, role, permissions: defaults },
      metadata: { username: targetProfile.username },
    })

    return Response.json({ success: true, id: inserted.id })
  }

  if (!existing) return new Response("User has no admin role", { status: 404 })
  const existingRole = existing.role as AdminRoleType

  if (action !== "update_permissions" && !canManageTarget(ctx.role, existingRole)) {
    return forbiddenResponse("You cannot manage a role at or above your own level")
  }

  if (action === "revoke") {
    const blocked = await guardLastSuperAdmin(existingRole)
    if (blocked) return blocked

    const { error } = await service.from("admin_roles").delete().eq("user_id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })

    await recordAudit(service, {
      adminId: ctx.userId,
      action: "admin_roles.revoke",
      targetTable: "admin_roles",
      targetId: existing.id,
      oldValue: { user_id: targetUserId, role: existing.role },
      metadata: { username: targetProfile.username },
    })

    return Response.json({ success: true })
  }

  if (action === "update_role") {
    if (!isKnownRole(role)) return new Response("Invalid role", { status: 400 })
    if (!assignableRoles(ctx.role).includes(role)) {
      return forbiddenResponse("You cannot grant roles at or above your own level")
    }
    const blocked = await guardLastSuperAdmin(existingRole, role)
    if (blocked) return blocked

    const { error } = await service
      .from("admin_roles")
      .update({ role, permissions: [...ROLE_DEFAULT_PERMISSIONS[role]] })
      .eq("user_id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })

    await recordAudit(service, {
      adminId: ctx.userId,
      action: "admin_roles.update_role",
      targetTable: "admin_roles",
      targetId: existing.id,
      oldValue: { role: existing.role },
      newValue: { role },
      metadata: { username: targetProfile.username },
    })

    return Response.json({ success: true })
  }

  if (action === "update_permissions") {
    const superCtx = await requireSuperAdmin(supabase)
    if (superCtx instanceof Response) return superCtx

    const clean = permissions
      .filter((p): p is PermissionCode => typeof p === "string" && isPermissionCode(p))
    const { error } = await service
      .from("admin_roles")
      .update({ permissions: clean })
      .eq("user_id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })

    await recordAudit(service, {
      adminId: ctx.userId,
      action: "admin_roles.update_permissions",
      targetTable: "admin_roles",
      targetId: existing.id,
      oldValue: { permissions: existing.permissions },
      newValue: { permissions: clean },
      metadata: { username: targetProfile.username, role: existing.role },
    })

    return Response.json({ success: true })
  }

  return new Response("Invalid action", { status: 400 })
}

function isKnownRole(role: AdminRoleType): boolean {
  return ["super_admin", "admin", "support", "editor"].includes(role)
}
