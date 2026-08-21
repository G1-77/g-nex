// Centralized server-side authorization.
//
// Every admin route/page and every sensitive action goes through this module —
// nothing invents role checks inside individual pages. RPCs and RLS use the
// matching DB helpers (is_staff / has_permission), keeping one model end to end.

import type { SupabaseClient } from "@supabase/supabase-js"
import type { AdminRoleType } from "@/lib/supabase/types"
import { ROLE_HIERARCHY, isPermissionCode, type PermissionCode } from "@/lib/admin/permissions"

export interface AdminContext {
  userId: string
  role: AdminRoleType
  permissions: PermissionCode[]
  isStaff: boolean
}

export interface AdminContextRow {
  user_id: string
  role: AdminRoleType
  permissions: string[] | null
}

function toPermissionCodes(raw: string[] | null | undefined): PermissionCode[] {
  return (raw ?? []).filter((p): p is PermissionCode => isPermissionCode(p))
}

/**
 * Resolve the acting user's admin context from the session. Returns null for
 * non-staff / anonymous callers.
 */
export async function getAdminContext(
  supabase: SupabaseClient
): Promise<AdminContext | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from("admin_roles")
    .select("user_id, role, permissions")
    .eq("user_id", user.id)
    .maybeSingle()

  if (!data) return null

  const row = data as AdminContextRow
  return {
    userId: row.user_id,
    role: row.role,
    permissions: toPermissionCodes(row.permissions),
    isStaff: true,
  }
}

/** Return a 403 Response for a failed authorization check. */
export function forbiddenResponse(message = "Forbidden"): Response {
  return new Response(message, { status: 403 })
}

/** Return a 401 Response. */
export function unauthorizedResponse(message = "Unauthorized"): Response {
  return new Response(message, { status: 401 })
}

/** Require the acting user to hold a specific permission. Returns the admin
 * context on success, or a 401/403 Response to return directly from a route. */
export async function requirePermission(
  supabase: SupabaseClient,
  permission: PermissionCode
): Promise<AdminContext | Response> {
  const ctx = await getAdminContext(supabase)
  if (!ctx) return unauthorizedResponse()
  if (!ctx.permissions.includes(permission)) return forbiddenResponse()
  return ctx
}

/** Require the acting user to be a super_admin. Returns the admin context on
 * success, or a 401/403 Response to return directly from a route. */
export async function requireSuperAdmin(supabase: SupabaseClient): Promise<AdminContext | Response> {
  const ctx = await getAdminContext(supabase)
  if (!ctx) return unauthorizedResponse()
  if (ctx.role !== "super_admin") return forbiddenResponse("Super admin access required")
  return ctx
}

/** Whether the acting user may manage the given target's role. */
export function canManageRole(actorRole: AdminRoleType, targetRole: AdminRoleType): boolean {
  return ROLE_HIERARCHY[actorRole] >= ROLE_HIERARCHY[targetRole]
}