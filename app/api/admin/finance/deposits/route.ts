import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"
import { resolveAction } from "@/lib/admin/actions"
import { deleteDeposit, editRecord } from "@/lib/admin/executors"

export interface AdminDepositRow {
  id: string
  user_id: string
  username: string | null
  amount_kes: number
  expected_amount: number | null
  mobile_money_number: string | null
  mobile_money_provider: string | null
  payment_channel: string | null
  account_number: string | null
  user_reference: string | null
  mpesa_reference: string | null
  status: string
  admin_notes: string | null
  reviewed_at: string | null
  created_at: string
}

export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "deposits.read")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "all"
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("deposit_requests")
    .select("*, user:profiles!deposit_requests_user_id_fkey(username)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status !== "all") query = query.eq("status", status)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminDepositRow[] = (data ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    username: r.user?.username ?? null,
    amount_kes: Number(r.amount_kes ?? 0),
    expected_amount: r.expected_amount === null ? null : Number(r.expected_amount),
    mobile_money_number: r.mobile_money_number,
    mobile_money_provider: r.mobile_money_provider,
    payment_channel: r.payment_channel,
    account_number: r.account_number,
    user_reference: r.user_reference,
    mpesa_reference: r.mpesa_reference,
    status: r.status,
    admin_notes: r.admin_notes,
    reviewed_at: r.reviewed_at,
    created_at: r.created_at,
  }))

  return Response.json({ deposits: rows })
}

export async function POST(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "deposits.approve")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const body = await req.json()
  const depositId = String(body.depositId ?? "")
  const action = String(body.action ?? "") // approve | reject
  const note = String(body.note ?? "").trim() || null

  if (!depositId) return new Response("Missing depositId", { status: 400 })
  if (!["approve", "reject"].includes(action)) return new Response("Invalid action", { status: 400 })

  const { data: deposit, error: findError } = await service
    .from("deposit_requests")
    .select("id, status, amount_kes")
    .eq("id", depositId)
    .maybeSingle()

  if (findError || !deposit) {
    return new Response(findError?.message ?? "Deposit not found", { status: 404 })
  }

  const { data: rpcData, error: rpcError } = await service.rpc(
    action === "approve" ? "admin_confirm_deposit" : "admin_reject_deposit",
    action === "approve"
      ? { p_deposit_id: depositId, p_admin: ctx.userId, p_note: note }
      : { p_deposit_id: depositId, p_admin: ctx.userId, p_note: note }
  )

  if (rpcError) return new Response(rpcError.message, { status: 500 })
  if (rpcData && rpcData.ok === false) {
    return new Response(String(rpcData.error ?? "Operation failed"), { status: 400 })
  }

  await recordAudit(service, {
    adminId: ctx.userId,
    action: `deposits.${action === "approve" ? "approve" : "reject"}`,
    targetTable: "deposit_requests",
    targetId: depositId,
    oldValue: { status: deposit.status },
    newValue: { status: action === "approve" ? "confirmed" : "rejected", ...rpcData },
    metadata: { amount_kes: Number(deposit.amount_kes), note },
  })

  return Response.json({ success: true, result: rpcData })
}

/** Permanently delete a deposit request (data.delete; approval-gated below super_admin). */
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
    targetTable: "deposit_requests",
    targetId: id,
    label: `Delete deposit ${id.slice(0, 8)}…`,
    execute: () => deleteDeposit(service, ctx.userId, id),
  })
}

/** Edit a deposit request's safe columns (data.edit; approval-gated below super_admin). */
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
    targetTable: "deposit_requests",
    targetId: id,
    label: `Edit deposit ${id.slice(0, 8)}… (${Object.keys(safe).join(", ")})`,
    payload: { changes: safe },
    execute: () => editRecord(service, ctx.userId, "deposit_requests", id, safe),
  })
}