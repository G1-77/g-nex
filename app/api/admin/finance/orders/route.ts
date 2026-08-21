import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { resolveAction } from "@/lib/admin/actions"
import { deleteOrder, editRecord } from "@/lib/admin/executors"

export interface AdminOrderRow {
  id: string
  username: string | null
  asset_symbol: string | null
  order_type: string
  side: string
  mode: string
  quantity: number
  price: number | null
  filled_quantity: number
  status: string
  fee: number
  margin_kes: number
  created_at: string
}

const EDITABLE_COLUMNS = new Set(["status", "fee", "margin_kes"])

interface OrderRowRaw {
  id: string
  order_type: string
  side: string
  mode: string
  quantity: number | null
  price: number | null
  filled_quantity: number | null
  status: string
  fee: number | null
  margin_kes: number | null
  created_at: string
  user: { username: string | null } | null
  asset: { symbol: string | null } | null
}

/** Orders: read-only market order view across the platform. */
export async function GET(req: Request) {
  const supabase = await createServerClient()
  const ctx = await requirePermission(supabase, "orders.read")
  if (ctx instanceof Response) return ctx
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get("status") ?? "all" // all | open | filled | partial | cancelled
  const side = searchParams.get("side") ?? "all" // all | buy | sell
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("orders")
    .select("id, order_type, side, mode, quantity, price, filled_quantity, status, fee, margin_kes, created_at, user:profiles(username), asset:assets(symbol)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (status !== "all") query = query.eq("status", status)
  if (side !== "all") query = query.eq("side", side)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminOrderRow[] = ((data ?? []) as unknown as OrderRowRaw[]).map((r) => ({
    id: r.id,
    username: r.user?.username ?? null,
    asset_symbol: r.asset?.symbol ?? null,
    order_type: r.order_type,
    side: r.side,
    mode: r.mode,
    quantity: Number(r.quantity ?? 0),
    price: r.price === null ? null : Number(r.price),
    filled_quantity: Number(r.filled_quantity ?? 0),
    status: r.status,
    fee: Number(r.fee ?? 0),
    margin_kes: Number(r.margin_kes ?? 0),
    created_at: r.created_at,
  }))

  return Response.json({ orders: rows })
}

/** Permanently delete an order and its ledger transactions (data.delete; approval-gated below super_admin). */
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
    targetTable: "orders",
    targetId: id,
    label: `Delete order ${id.slice(0, 8)}…`,
    execute: () => deleteOrder(service, ctx.userId, id),
  })
}

/** Edit an order's safe columns (data.edit; approval-gated below super_admin). */
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
    targetTable: "orders",
    targetId: id,
    label: `Edit order ${id.slice(0, 8)}… (${Object.keys(safe).join(", ")})`,
    payload: { changes: safe },
    execute: () => editRecord(service, ctx.userId, "orders", id, safe),
  })
}