import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"

export interface AdminOrderRow {
  id: string
  username: string | null
  asset_symbol: string | null
  order_type: string
  side: string
  quantity: number
  price: number | null
  filled_quantity: number
  status: string
  fee: number
  created_at: string
}

/** Orders: read-only market order view across the platform. */
export async function GET(req: Request) {
  const supabase = await createServerClient()
  await requirePermission(supabase, "orders.read")
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "all" // all | open | filled | partial | cancelled
  const side = searchParams.get("side") ?? "all" // all | buy | sell
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("orders")
    .select("id, order_type, side, quantity, price, filled_quantity, status, fee, created_at, user:profiles(username), asset:assets(symbol)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status !== "all") query = query.eq("status", status)
  if (side !== "all") query = query.eq("side", side)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminOrderRow[] = (data ?? []).map((r) => ({
    id: r.id,
    username: r.user?.[0]?.username ?? null,
    asset_symbol: r.asset?.[0]?.symbol ?? null,
    order_type: r.order_type,
    side: r.side,
    quantity: Number(r.quantity ?? 0),
    price: r.price === null ? null : Number(r.price),
    filled_quantity: Number(r.filled_quantity ?? 0),
    status: r.status,
    fee: Number(r.fee ?? 0),
    created_at: r.created_at,
  }))

  return Response.json({ orders: rows })
}