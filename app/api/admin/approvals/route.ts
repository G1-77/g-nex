import { createServerClient } from "@/lib/supabase/server"
import { requirePermission, forbiddenResponse } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import { dispatchRequest } from "@/lib/admin/executors"
import { ROLE_HIERARCHY } from "@/lib/admin/permissions"
import type { AdminRoleType } from "@/lib/supabase/types"

export interface AdminActionRequestRow {
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
}

/** Approval queue. Defaults to pending; `status=all` returns history too. */
export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "approvals.review")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "pending"
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("admin_action_requests")
    .select("*, requester:profiles!admin_action_requests_requested_by_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status !== "all") query = query.eq("status", status)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  // Pending count for the sidebar badge.
  const { count } = await service
    .from("admin_action_requests")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending")

  const rows: AdminActionRequestRow[] = ((data ?? []) as unknown as Array<Record<string, unknown>>).map((r) => {
    const requester = r.requester as { username: string | null } | null
    return {
      id: r.id as string,
      requested_by: r.requested_by as string,
      requester_username: requester?.username ?? null,
      requester_role: r.requester_role as string,
      action_type: r.action_type as string,
      target_table: r.target_table as string,
      target_id: r.target_id as string,
      label: r.label as string,
      payload: (r.payload ?? null) as Record<string, unknown> | null,
      status: r.status as string,
      review_note: (r.review_note ?? null) as string | null,
      reviewed_at: (r.reviewed_at ?? null) as string | null,
      error: (r.error ?? null) as string | null,
      created_at: r.created_at as string,
    }
  })

  return Response.json({
    requests: rows,
    pendingCount: count ?? 0,
    viewerRole: ctx.role,
    viewerId: ctx.userId,
  })
}

/** Approve or reject a pending request. Reviewer must outrank the requester. */
export async function POST(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "approvals.review")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const requestId = String(body.requestId ?? "")
  const decision = String(body.decision ?? "") // approve | reject
  const note = typeof body.note === "string" && body.note.trim() ? body.note.trim() : null

  if (!requestId) return new Response("Missing requestId", { status: 400 })
  if (!["approve", "reject"].includes(decision)) return new Response("Invalid decision", { status: 400 })

  const { data: request, error: findError } = await service
    .from("admin_action_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()
  if (findError || !request) {
    return new Response(findError?.message ?? "Request not found", { status: 404 })
  }

  if (request.status !== "pending") {
    return new Response(`Request is already ${request.status}`, { status: 400 })
  }

  if (request.requested_by === ctx.userId) {
    return forbiddenResponse("You cannot review your own request")
  }

  const requesterRank = ROLE_HIERARCHY[request.requester_role as AdminRoleType] ?? 0
  const reviewerRank = ROLE_HIERARCHY[ctx.role]
  if (reviewerRank <= requesterRank) {
    return forbiddenResponse("You can only review requests from a lower rank")
  }

  // Atomic claim — prevents double-approval races between reviewers.
  const { data: claimed, error: claimError } = await service
    .from("admin_action_requests")
    .update({
      status: decision === "approve" ? "approved" : "rejected",
      reviewed_by: ctx.userId,
      reviewed_at: new Date().toISOString(),
      review_note: note,
    })
    .eq("id", requestId)
    .eq("status", "pending")
    .select("id")
    .maybeSingle()

  if (claimError) return new Response(claimError.message, { status: 500 })
  if (!claimed) return new Response("Request was just reviewed by someone else", { status: 409 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: `approvals.${decision}`,
    targetTable: "admin_action_requests",
    targetId: requestId,
    oldValue: { status: "pending" },
    newValue: { status: decision === "approve" ? "approved" : "rejected", note },
    metadata: {
      requester_role: request.requester_role,
      action_type: request.action_type,
      target_table: request.target_table,
      target_id: request.target_id,
    },
  })

  await notifyRequester(service, ctx.userId, request.requested_by, decision === "approve", requestId, request.label)

  if (decision === "reject") {
    return Response.json({ success: true, rejected: true })
  }

  // Execute the stored mutation under the approver's identity.
  const result = await dispatchRequest(service, ctx.userId, {
    id: request.id,
    requested_by: request.requested_by,
    requester_role: String(request.requester_role),
    action_type: request.action_type,
    target_table: request.target_table,
    target_id: request.target_id,
    label: request.label,
    payload: (request.payload ?? null) as Record<string, unknown> | null,
  })

  const { error: settleError } = await service
    .from("admin_action_requests")
    .update(
      result.ok
        ? { status: "executed", executed_at: new Date().toISOString() }
        : { status: "failed", error: result.error }
    )
    .eq("id", requestId)
    .eq("status", "approved")

  if (settleError) console.error("Failed to settle approval:", settleError.message)

  if (!result.ok) {
    await recordAudit(service, {
      adminId: ctx.userId,
      action: "approvals.execute_failed",
      targetTable: request.target_table,
      targetId: request.target_id,
      metadata: { request_id: requestId, error: result.error },
    })
    return new Response(`Approved, but execution failed: ${result.error}`, { status: 500 })
  }

  return Response.json({ success: true, executed: true, result: result.result ?? null })
}

async function notifyRequester(
  service: ReturnType<typeof createServiceClient>,
  reviewerId: string,
  requesterId: string,
  approved: boolean,
  requestId: string,
  label: string | null
) {
  await service.from("notifications").insert({
    recipient_id: requesterId,
    notifier_id: reviewerId,
    notification_type: approved ? "approval_granted" : "approval_rejected",
    metadata_json: { request_id: requestId, label: label ?? null },
  })
}
