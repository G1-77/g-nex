"use client"

import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminMetricCard } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { formatKesCompact, formatTimestamp } from "@/lib/admin/format"
import { statusTone } from "@/lib/admin/format"

interface OverviewData {
  totals: {
    totalUsers: number | null
    confirmedDepositsKes: number | null
    todayConfirmedDepositsKes: number | null
    openOrders: number | null
    positionsOpen: number | null
  }
  queues: {
    depositsPending: number | null
    withdrawalsPending: number | null
    reportsPending: number | null
    editorialActive: number | null
  }
  recent: {
    deposits: Array<{ id: string; amount_kes: number; status: string; mobile_money_provider: string | null; created_at: string; user_id: string }>
    withdrawals: Array<{ id: string; amount_kes: number; status: string; mobile_money_provider: string | null; created_at: string; user_id: string }>
  }
}

export default function AdminOverviewPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { isSuperAdmin } = useAuth()
  const { data, isLoading, error } = useAdminQuery<OverviewData>("/api/admin/overview")

  const value = (v: number | null | undefined, formatter: (n: number) => string) =>
    v === null || v === undefined ? "—" : formatter(v)

  async function recalcReputation() {
    try {
      await adminAction("/api/admin/reputation")
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] })
      router.refresh()
    } catch (e) {
      alert((e as Error).message)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">
          Could not load overview data: {error.message}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <AdminMetricCard label="Total Users" value={value(data?.totals.totalUsers, (n) => n.toLocaleString())} />
        <AdminMetricCard
          label="Confirmed Deposits"
          value={value(data?.totals.confirmedDepositsKes, formatKesCompact)}
          tone="green"
        />
        <AdminMetricCard
          label="Confirmed Today"
          value={value(data?.totals.todayConfirmedDepositsKes, formatKesCompact)}
          sub="last 24 hours"
        />
        <AdminMetricCard label="Open Orders" value={value(data?.totals.openOrders, (n) => n.toLocaleString())} tone="amber" />
        <AdminMetricCard label="Open Positions" value={value(data?.totals.positionsOpen, (n) => n.toLocaleString())} />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <AdminMetricCard
          label="Deposits Pending"
          value={value(data?.queues.depositsPending, (n) => n.toLocaleString())}
          tone={data?.queues.depositsPending ? "amber" : "default"}
        />
        <AdminMetricCard
          label="Withdrawals Pending"
          value={value(data?.queues.withdrawalsPending, (n) => n.toLocaleString())}
          tone={data?.queues.withdrawalsPending ? "amber" : "default"}
        />
        <AdminMetricCard
          label="Reports Pending"
          value={value(data?.queues.reportsPending, (n) => n.toLocaleString())}
          tone={data?.queues.reportsPending ? "red" : "default"}
        />
        <AdminMetricCard label="Active Editorial" value={value(data?.queues.editorialActive, (n) => n.toLocaleString())} />
      </div>

      {isSuperAdmin && (
        <button
          onClick={recalcReputation}
          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-4 py-2 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-[var(--admin-green)]"
        >
          Recompute all reputation scores
        </button>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-dim)]">
            Recent deposits
          </h2>
          <div className="space-y-2">
            {(data?.recent.deposits ?? []).map((d) => (
              <div key={d.id} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2.5 text-xs">
                <div>
                  <p className="font-mono font-bold text-slate-100">{formatKesCompact(d.amount_kes)}</p>
                  <p className="text-[10px] text-[var(--admin-text-dim)]">
                    {d.mobile_money_provider} · {formatTimestamp(d.created_at)}
                  </p>
                </div>
                <StatusBadge status={d.status} tone={statusTone(d.status) as StatusTone} />
              </div>
            ))}
            {(data?.recent.deposits ?? []).length === 0 && !isLoading && (
              <p className="text-xs text-[var(--admin-text-dim)]">No recent deposits</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-[var(--admin-text-dim)]">
            Recent withdrawals
          </h2>
          <div className="space-y-2">
            {(data?.recent.withdrawals ?? []).map((w) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg border border-[var(--admin-border)] bg-[var(--admin-panel)] px-3 py-2.5 text-xs">
                <div>
                  <p className="font-mono font-bold text-slate-100">{formatKesCompact(w.amount_kes)}</p>
                  <p className="text-[10px] text-[var(--admin-text-dim)]">
                    {w.mobile_money_provider} · {formatTimestamp(w.created_at)}
                  </p>
                </div>
                <StatusBadge status={w.status} tone={statusTone(w.status) as StatusTone} />
              </div>
            ))}
            {(data?.recent.withdrawals ?? []).length === 0 && !isLoading && (
              <p className="text-xs text-[var(--admin-text-dim)]">No recent withdrawals</p>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}