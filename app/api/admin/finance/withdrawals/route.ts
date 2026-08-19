import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"

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
  await requirePermission(supabase, "withdrawals.read")
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
    username: r.user?.[0]?.username ?? null,
    amount_kes: Number(r.amount_kes ?? r.amount ?? 0),
    amount: Number(r.amount ?? 0),
    fee_kes: Number(r.fee_kes ?? 0),
    mobile_money_number: r.mobile_money_number,
    mobile_money_provider: r.mobile_money_provider,
    asset_symbol: r.asset?.[0]?.symbol ?? null,
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
  const service = createServiceClient()

  const body = await req.json()
  const withdrawalId = String(body.withdrawalId ?? "")
  const action = String(body.action ?? "") // process | reject
  const note = String(body.note ?? "").trim() || null

  if (!withdrawalId) return new Response("Missing withdrawalId", { status: 400 })
  if (!["process", "reject"].includes(action)) return new Response("Invalid action", { status: 400 })

  const { data: wd, error: findError } = await service
    .from("withdrawal_requests")
    .select("id, status, amount_kes, amount")
    .eq("id", withdrawalId)
    .maybeSingle()

  if (findError || !wd) {
    return new Response(findError?.message ?? "Withdrawal not found", { status: 404 })
  }

  const { data: rpcData, error: rpcError } = await service.rpc(
    action === "process" ? "admin_process_withdrawal" : "admin_reject_withdrawal",
    { p_withdrawal_id: withdrawalId, p_admin: ctx.userId, p_note: note }
  )

  if (rpcError) return new Response(rpcError.message, { status: 500 })
  if (rpcData && rpcData.ok === false) {
    return new Response(String(rpcData.error ?? "Operation failed"), { status: 400 })
  }

  await recordAudit(service, {
    adminId: ctx.userId,
    action: `withdrawals.${action === "process" ? "process" : "reject"}`,
    targetTable: "withdrawal_requests",
    targetId: withdrawalId,
    oldValue: { status: wd.status },
    newValue: { status: action === "process" ? "sent" : "rejected", ...rpcData },
    metadata: { amount_kes: Number(wd.amount_kes ?? wd.amount ?? 0), note },
  })

  return Response.json({ success: true, result: rpcData })
}