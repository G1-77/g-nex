import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { resolveAction } from "@/lib/admin/actions"
import {
  deleteWithdrawal,
  editRecord,
  processWithdrawal,
} from "@/lib/admin/executors"

export interface AdminWithdrawalRow {
  id: string
  user_id: string
  username: string | null
  amount_kes: number
  amount: number
  fee_kes: number
  mobile_money_number: string | null
  mobile_money_provider: string | null
  asset_symbol: string | null
  status: string
  admin_notes: string | null
  approved_by: string | null
  approved_at: string | null
  processed_at: string | null
  created_at: string
}

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "withdrawals.read")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "all"
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("withdrawal_requests")
    .select("*, user:profiles(username), asset:assets(symbol)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status !== "all") query = query.eq("status", status)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminWithdrawalRow[] = (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    username: r.user?.username ?? null,
    amount_kes: Number(r.amount_kes ?? r.amount ?? 0),
    amount: Number(r.amount ?? 0),
    fee_kes: Number(r.fee_kes ?? 0),
    mobile_money_number: r.mobile_money_number,
    mobile_money_provider: r.mobile_money_provider,
    asset_symbol: r.asset?.symbol ?? null,
    status: r.status,
    admin_notes: r.admin_notes,
    approved_by: r.approved_by,
    approved_at: r.approved_at,
    processed_at: r.processed_at,
    created_at: r.created_at,
  }))

  return Response.json({ withdrawals: rows })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "withdrawals.process")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const withdrawalId = String(body.withdrawalId ?? "")
  const rawAction = String(body.action ?? "") // process | reject
  const note = String(body.note ?? "").trim() || null

  if (!withdrawalId) return new Response("Missing withdrawalId", { status: 400 })
  if (rawAction !== "process" && rawAction !== "reject") {
    return new Response("Invalid action", { status: 400 })
  }
  const action: "process" | "reject" = rawAction

  // Money leaving the platform always needs a higher-rank sign-off; rejecting
  // is conservative and stays direct.
  if (action === "process") {
    return resolveAction(ctx, service, {
      actionType: "withdrawal_process",
      targetTable: "withdrawal_requests",
      targetId: withdrawalId,
      label: `Process payout ${withdrawalId.slice(0, 8)}…`,
      payload: { action, note },
      execute: () => processWithdrawal(service, ctx.userId, withdrawalId, action, note),
    })
  }

  const result = await processWithdrawal(service, ctx.userId, withdrawalId, action, note)
  if (!result.ok) return new Response(result.error, { status: result.status })
  return Response.json({ success: true, result: result.result ?? null })
}

/** Permanently delete a withdrawal request and its ledger row (data.delete; approval-gated below super_admin). */
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
    targetTable: "withdrawal_requests",
    targetId: id,
    label: `Delete withdrawal ${id.slice(0, 8)}…`,
    execute: () => deleteWithdrawal(service, ctx.userId, id),
  })
}

/** Edit a withdrawal request's safe columns (data.edit; approval-gated below super_admin). */
export async function PATCH(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "data.edit")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const id = String(body.id ?? "")
  const changes = (body.changes ?? {}) as Record<string, unknown>

  if (!id) return new Response("Missing id", { status: 400 })
  const safe: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(changes)) {
    if (["status", "admin_notes", "amount_kes"].includes(key)) safe[key] = value
  }
  if (Object.keys(safe).length === 0) return new Response("No editable columns provided", { status: 400 })

  return resolveAction(ctx, service, {
    actionType: "edit",
    targetTable: "withdrawal_requests",
    targetId: id,
    label: `Edit withdrawal ${id.slice(0, 8)}… (${Object.keys(safe).join(", ")})`,
    payload: { changes: safe },
    execute: () => editRecord(service, ctx.userId, "withdrawal_requests", id, safe),
  })
}