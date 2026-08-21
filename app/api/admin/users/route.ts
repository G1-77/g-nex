import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import { resolveAction } from "@/lib/admin/actions"
import {
  deleteUserAccount,
  editRecord,
  wipeUserFinancials,
} from "@/lib/admin/executors"

export interface AdminUserRow {
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
}

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "users.read")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  const status = searchParams.get("status") ?? "all" // all | active | suspended | verified
  const limit = Math.min(Number(searchParams.get("limit") ?? 50) || 50, 200)

  let query = service
    .from("profiles")
    .select("id, username, full_name, avatar_url, is_verified, is_active, monthly_roi, created_at, deposit_account_number")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (q) {
    query = query.or(`username.ilike.%${q}%,full_name.ilike.%${q}%`)
  }
  if (status === "active") query = query.eq("is_active", true)
  if (status === "suspended") query = query.eq("is_active", false)
  if (status === "verified") query = query.eq("is_verified", true)

  const { data, error } = await query

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  // Join reputation status (best-effort — a failed lookup is null, not a fake value).
  const reputationMap = new Map<string, string>()
  if (data && data.length > 0) {
    const { data: reps, error: repError } = await service
      .from("trader_reputation")
      .select("user_id, status")
      .in("user_id", data.map((u) => u.id))
    if (!repError && reps) {
      for (const r of reps) reputationMap.set(r.user_id, r.status)
    }
  }

  const rows: AdminUserRow[] = (data ?? []).map((u) => ({
    id: u.id,
    username: u.username,
    full_name: u.full_name,
    avatar_url: u.avatar_url,
    is_verified: u.is_verified,
    is_active: u.is_active,
    monthly_roi: Number(u.monthly_roi ?? 0),
    created_at: u.created_at,
    deposit_account_number: u.deposit_account_number,
    reputation_status: reputationMap.get(u.id) ?? null,
  }))

  return Response.json({ users: rows })
}

export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "users.manage")
  if (ctx instanceof Response) return ctx

  const body = await req.json()
  const targetUserId = String(body.userId ?? "")
  const action = String(body.action ?? "") // suspend | unsuspend | verify | unverify | edit | wipe
  const reason = String(body.reason ?? "").trim()

  // Profile edits and financial wipes are data mutations: they need the
  // dedicated permission and (below super_admin) a higher-rank approval.
  if (action === "edit") {
    const editCtx = await requirePermission(supabase, "data.edit")
    if (editCtx instanceof Response) return editCtx

    const changes = (body.changes ?? {}) as Record<string, unknown>
    const safe: Record<string, unknown> = {}
    for (const key of Object.keys(changes)) {
      if (["full_name", "bio", "avatar_url", "is_verified", "is_active"].includes(key)) safe[key] = changes[key]
    }
    if (Object.keys(safe).length === 0) return new Response("No editable columns provided", { status: 400 })
    if (!targetUserId) return new Response("Missing userId", { status: 400 })

    const service = createServiceClient()
    return resolveAction(editCtx, service, {
      actionType: "edit",
      targetTable: "profiles",
      targetId: targetUserId,
      label: `Edit profile @${String(body.username ?? targetUserId.slice(0, 8))} (${Object.keys(safe).join(", ")})`,
      payload: { changes: safe },
      execute: () => editRecord(service, editCtx.userId, "profiles", targetUserId, safe),
    })
  }

  if (action === "wipe") {
    const delCtx = await requirePermission(supabase, "data.delete")
    if (delCtx instanceof Response) return delCtx
    if (!targetUserId) return new Response("Missing userId", { status: 400 })

    const service = createServiceClient()
    return resolveAction(delCtx, service, {
      actionType: "wipe",
      targetTable: "profiles",
      targetId: targetUserId,
      label: `Wipe trading history for ${String(body.username ?? targetUserId.slice(0, 8))}`,
      execute: () => wipeUserFinancials(service, delCtx.userId, targetUserId),
    })
  }

  if (!targetUserId) return new Response("Missing userId", { status: 400 })
  const service = createServiceClient()
  if (targetUserId === ctx.userId && action === "suspend") {
    return new Response("Cannot suspend your own account", { status: 400 })
  }

  const { data: target, error: targetError } = await service
    .from("profiles")
    .select("id, username, is_active, is_verified")
    .eq("id", targetUserId)
    .maybeSingle()

  if (targetError || !target) {
    return new Response(targetError?.message ?? "User not found", { status: 404 })
  }

  const oldValue = { is_active: target.is_active, is_verified: target.is_verified }

  if (action === "suspend") {
    const { error } = await service.from("profiles").update({ is_active: false }).eq("id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })
    if (reason) {
      await service.from("user_suspensions").insert({
        user_id: targetUserId,
        reason,
        suspended_by: ctx.userId,
        active: true,
      })
    }
    await recordAudit(service, {
      adminId: ctx.userId,
      action: "users.suspend",
      targetTable: "profiles",
      targetId: targetUserId,
      oldValue,
      newValue: { is_active: false, is_verified: target.is_verified },
      metadata: { username: target.username, reason },
    })
  }

  if (action === "unsuspend") {
    const { error } = await service.from("profiles").update({ is_active: true }).eq("id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })
    await service
      .from("user_suspensions")
      .update({ active: false, lifted_at: new Date().toISOString(), lifted_by: ctx.userId })
      .eq("user_id", targetUserId)
      .eq("active", true)
    await recordAudit(service, {
      adminId: ctx.userId,
      action: "users.unsuspend",
      targetTable: "profiles",
      targetId: targetUserId,
      oldValue,
      newValue: { is_active: true, is_verified: target.is_verified },
      metadata: { username: target.username },
    })
  }

  if (action === "verify") {
    const { error } = await service.from("profiles").update({ is_verified: true }).eq("id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })
    await recordAudit(service, {
      adminId: ctx.userId,
      action: "users.verify",
      targetTable: "profiles",
      targetId: targetUserId,
      oldValue,
      newValue: { is_active: target.is_active, is_verified: true },
      metadata: { username: target.username },
    })
  }

  if (action === "unverify") {
    const { error } = await service.from("profiles").update({ is_verified: false }).eq("id", targetUserId)
    if (error) return new Response(error.message, { status: 500 })
    await recordAudit(service, {
      adminId: ctx.userId,
      action: "users.unverify",
      targetTable: "profiles",
      targetId: targetUserId,
      oldValue,
      newValue: { is_active: target.is_active, is_verified: false },
      metadata: { username: target.username },
    })
  }

  return Response.json({ success: true })
}

/** Permanently delete a user and all of their data (data.delete; approval-gated below super_admin). */
export async function DELETE(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "data.delete")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const id = searchParams.get("id") ?? ""

  if (!id) return new Response("Missing id", { status: 400 })

  return resolveAction(ctx, service, {
    actionType: "delete",
    targetTable: "profiles",
    targetId: id,
    label: `Delete account ${id.slice(0, 8)}… and all their data`,
    execute: () => deleteUserAccount(service, ctx.userId, id),
  })
}