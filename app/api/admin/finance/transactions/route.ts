import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"

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

/** Transactions: one searchable surface over trades, deposits and withdrawals. */
export async function GET(req: Request) {
  const supabase = await createServerClient()
  await requirePermission(supabase, "transactions.read")
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