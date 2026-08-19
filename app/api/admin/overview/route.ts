import { createServerClient } from "@/lib/supabase/server"
import { requirePermission } from "@/lib/admin/authorization"
import { createServiceClient } from "@/lib/admin/service"

/**
 * Real-data admin overview. Every metric comes straight from the database;
 * a failed aggregate returns null so the UI renders "—" and never a fake zero.
 */
export async function GET() {
  const supabase = await createServerClient()
  await requirePermission(supabase, "users.read")
  const service = createServiceClient()

  async function safeAggregate<T>(fn: () => Promise<T>): Promise<T | null> {
    try {
      return await fn()
    } catch {
      return null
    }
  }

  const [totalUsers, confirmedKes, todayKes, openOrders, positionsOpen, depositsPending, withdrawalsPending, reportsPending, editorialActive, recentDeposits, recentWithdrawals] =
    await Promise.all([
      safeAggregate(async () => {
        const { count, error } = await service.from("profiles").select("id", { count: "exact", head: true })
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { data, error } = await service
          .from("deposit_requests")
          .select("amount_kes")
          .eq("status", "confirmed")
        if (error) throw new Error(error.message)
        return (data ?? []).reduce((s, r) => s + Number(r.amount_kes ?? 0), 0)
      }),
      safeAggregate(async () => {
        const { data, error } = await service
          .from("deposit_requests")
          .select("amount_kes")
          .eq("status", "confirmed")
          .gte("created_at", new Date(Date.now() - 86400_000).toISOString())
        if (error) throw new Error(error.message)
        return (data ?? []).reduce((s, r) => s + Number(r.amount_kes ?? 0), 0)
      }),
      safeAggregate(async () => {
        const { count, error } = await service
          .from("orders")
          .select("id", { count: "exact", head: true })
          .in("status", ["open", "partial"])
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { count, error } = await service
          .from("user_positions")
          .select("id", { count: "exact", head: true })
          .eq("status", "OPEN")
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { count, error } = await service
          .from("deposit_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "pending_verification"])
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { count, error } = await service
          .from("withdrawal_requests")
          .select("id", { count: "exact", head: true })
          .in("status", ["pending", "approved", "processing"])
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { count, error } = await service
          .from("reports")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending")
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { count, error } = await service
          .from("editorial_picks")
          .select("id", { count: "exact", head: true })
          .eq("active", true)
        if (error) throw new Error(error.message)
        return count ?? 0
      }),
      safeAggregate(async () => {
        const { data, error } = await service
          .from("deposit_requests")
          .select("id, amount_kes, status, mobile_money_provider, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(5)
        if (error) throw new Error(error.message)
        return data ?? []
      }),
      safeAggregate(async () => {
        const { data, error } = await service
          .from("withdrawal_requests")
          .select("id, amount_kes, status, mobile_money_provider, created_at, user_id")
          .order("created_at", { ascending: false })
          .limit(5)
        if (error) throw new Error(error.message)
        return data ?? []
      }),
    ])

  return Response.json({
    totals: {
      totalUsers,
      confirmedDepositsKes: confirmedKes,
      todayConfirmedDepositsKes: todayKes,
      openOrders,
      positionsOpen,
    },
    queues: {
      depositsPending,
      withdrawalsPending,
      reportsPending,
      editorialActive,
    },
    recent: {
      deposits: recentDeposits ?? [],
      withdrawals: recentWithdrawals ?? [],
    },
  })
}