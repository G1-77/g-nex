import { createServerClient } from "@/lib/supabase/server"
import { requireSuperAdmin } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"
import { recordAudit } from "@/lib/admin/audit"

/** Trigger a reputation recompute (super_admin only). */
export async function POST() {
  const supabase = await createServerClient()
  const ctx = await requireSuperAdmin(supabase)
  const service = createServiceClient()

  const { data, error } = await service.rpc("recompute_all_reputations")

  if (error) return new Response(error.message, { status: 500 })

  await recordAudit(service, {
    adminId: ctx.userId,
    action: "reputation.recompute_all",
    targetTable: "trader_reputation",
    newValue: { recomputed: data },
  })

  return Response.json({ success: true, recomputed: data })
}