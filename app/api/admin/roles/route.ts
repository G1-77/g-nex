import { createServerClient } from "@/lib/supabase/server"
import { requireSuperAdmin, forbiddenResponse, canManageRole } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import {
  ROLE_DEFAULT_PERMISSIONS,
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

export async function GET() {
  const supabase = await createServerClient()
  await requireSuperAdmin(supabase)
  const service = createServiceClient()

  const { data, error } = await service
    .from("admin_roles")
    .select("id, user_id, role, permissions, granted_by, created_at, user:profiles(username, full_name)")
    .order("created_at", { ascending: true })

  if (error) return new Response(error.message, { status: 500 })

  const staff: AdminStaffRow[] = (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    username: r.user?.[0]?.username ?? null,
    full_name: r.user?.[0]?.full_name ?? null,
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
  const ctx = await requireSuperAdmin(supabase)
  const service = createServiceClient()

  const body = await req.json()
  const action = String(body.action ?? "") // assign | revoke | update_role | update_permissions
  const targetUserId = String(body.userId ?? "")
  const role = String(body.role ?? "") as AdminRoleType
  const permissions: unknown[] = Array.isArray(body.permissions) ? body.permissions : []

  if (!targetUserId) return new Response("Missing userId", { status: 400 })

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
    .select("id, role, permissions, granted_by")
    .eq("user_id", targetUserId)
    .maybeSingle()

  if (action === "assign") {
    if (!["super_admin", "admin", "support", "editor"].includes(role)) {
      return new Response("Invalid role", { status: 400 })
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
  if (!canManageRole(ctx.role, existing.role as AdminRoleType)) {
    return forbiddenResponse("You cannot manage a role at or above your own level")
  }

  if (action === "revoke") {
    if (targetUserId === ctx.userId) return new Response("Cannot revoke your own access", { status: 400 })
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
    if (!["super_admin", "admin", "support", "editor"].includes(role)) {
      return new Response("Invalid role", { status: 400 })
    }
    if (!canManageRole(ctx.role, role)) {
      return forbiddenResponse("You cannot grant a role at or above your own level")
    }
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