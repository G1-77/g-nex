import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { resolveAction } from "@/lib/admin/actions"
import { deleteTransaction, editRecord } from "@/lib/admin/executors"

export interface AdminTransactionRow {
  tx_type: string
  id: string
  username: string | null
  asset_symbol: string | null
  amount_kes: number
  status: string
  reference: string | null
  provider: string | null
  created_at: string
}

const EDITABLE_COLUMNS = new Set(["status", "notes", "reference", "amount_kes"])

/** Transactions: one searchable surface over trades, deposits and withdrawals. */
export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "transactions.read")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const q = (searchParams.get("q") ?? "").trim()
  const type = searchParams.get("type") ?? "all" // all | deposit | withdrawal | trade
  const status = searchParams.get("status") ?? "all"
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("admin_transactions_view")
    .select("tx_type, id, user_id, asset_id, amount_kes, status, reference, provider, username, asset_symbol, created_at")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (type !== "all") query = query.eq("tx_type", type)
  if (status !== "all") query = query.eq("status", status)
  if (q) {
    query = query.or(`reference.ilike.%${q}%,username.ilike.%${q}%`)
  }

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminTransactionRow[] = (data ?? []).map((r) => ({
    tx_type: r.tx_type,
    id: r.id,
    username: r.username,
    asset_symbol: r.asset_symbol,
    amount_kes: Number(r.amount_kes ?? 0),
    status: r.status,
    reference: r.reference,
    provider: r.provider,
    created_at: r.created_at,
  }))

  return Response.json({ transactions: rows })
}

/** Permanently delete a ledger transaction (data.delete; approval-gated below super_admin). */
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
    targetTable: "transactions",
    targetId: id,
    label: `Delete transaction ${id.slice(0, 8)}…`,
    execute: () => deleteTransaction(service, ctx.userId, id),
  })
}

/** Edit a ledger transaction's safe columns (data.edit; approval-gated below super_admin). */
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
    if (EDITABLE_COLUMNS.has(key)) safe[key] = value
  }
  if (Object.keys(safe).length === 0) return new Response("No editable columns provided", { status: 400 })

  return resolveAction(ctx, service, {
    actionType: "edit",
    targetTable: "transactions",
    targetId: id,
    label: `Edit transaction ${id.slice(0, 8)}… (${Object.keys(safe).join(", ")})`,
    payload: { changes: safe },
    execute: () => editRecord(service, ctx.userId, "transactions", id, safe),
  })
}