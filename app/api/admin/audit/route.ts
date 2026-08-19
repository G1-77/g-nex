import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"

export interface AdminAuditRow {
  id: string
  admin_id: string | null
  admin_name: string | null
  action: string
  target_table: string | null
  target_id: string | null
  old_value: unknown
  new_value: unknown
  created_at: string
}

export async function GET(req: Request) {
  const supabase = await createServerClient()
  await requirePermission(supabase, "audit.read")
  const service = createServiceClient()

  const { searchParams } = new URL(req.url)
  const action = searchParams.get("action") ?? "all"
  const limit = Math.min(Number(searchParams.get("limit") ?? 100) || 100, 200)

  let query = service
    .from("audit_logs")
    .select("id, admin_id, action, target_table, target_id, old_value, new_value, created_at, admin:profiles(username, full_name)")
    .order("created_at", { ascending: false })
    .limit(limit)

  if (action !== "all") query = query.eq("action", action)

  const { data, error } = await query
  if (error) return new Response(error.message, { status: 500 })

  const rows: AdminAuditRow[] = (data ?? []).map((r) => ({
    id: r.id,
    admin_id: r.admin_id,
    admin_name: r.admin?.[0]?.full_name ?? r.admin?.[0]?.username ?? null,
    action: r.action,
    target_table: r.target_table,
    target_id: r.target_id,
    old_value: r.old_value,
    new_value: r.new_value,
    created_at: r.created_at,
  }))

  return Response.json({ logs: rows })
}