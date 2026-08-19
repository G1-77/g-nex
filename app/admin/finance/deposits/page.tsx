"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { formatKes, formatTimestamp, statusTone } from "@/lib/admin/format"

interface DepositsData {
  deposits: Array<{
    id: string
    username: string | null
    amount_kes: number
    expected_amount: number | null
    mobile_money_provider: string | null
    payment_channel: string | null
    account_number: string | null
    user_reference: string | null
    mpesa_reference: string | null
    status: string
    admin_notes: string | null
    reviewed_at: string | null
    created_at: string
  }>
}

export default function AdminDepositsPage() {
  const [status, setStatus] = useState("pending_verification")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canApprove = can("deposits.approve")

  const url = `/api/admin/finance/deposits?status=${status}`
  const { data, isLoading, error } = useAdminQuery<DepositsData>(url)

  async function act(depositId: string, action: string) {
    const note = window.prompt(`Note for ${action} (optional):`) ?? ""
    try {
      await adminAction("/api/admin/finance/deposits", "POST", { depositId, action, note })
      await queryClient.invalidateQueries({ queryKey: [url] })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const columns: AdminColumn<DepositsData["deposits"][number]>[] = [
    {
      key: "user",
      label: "User",
      render: (d) => <span className="font-semibold text-slate-100">@{d.username ?? "unknown"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (d) => <span className="font-mono font-bold text-slate-100">{formatKes(d.amount_kes)}</span>,
    },
    {
      key: "expected",
      label: "Expected",
      render: (d) => (
        <span className="font-mono text-[var(--admin-text-dim)]">
          {d.expected_amount === null ? "—" : formatKes(d.expected_amount)}
        </span>
      ),
      preview: false,
    },
    {
      key: "channel",
      label: "Payment",
      render: (d) => (
        <div className="text-[11px]">
          <p className="font-semibold capitalize text-slate-100">{d.payment_channel ?? "—"}</p>
          <p className="font-mono text-[var(--admin-text-dim)]">{d.account_number ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "reference",
      label: "Reference",
      render: (d) => (
        <span className="font-mono text-[11px] text-[var(--admin-text-dim)]">
          {d.mpesa_reference ?? d.user_reference ?? "—"}
        </span>
      ),
      preview: false,
    },
    {
      key: "provider",
      label: "Provider",
      render: (d) => (
        <span className="capitalize text-[var(--admin-text-dim)]">{d.mobile_money_provider ?? "—"}</span>
      ),
      preview: false,
    },
    {
      key: "status",
      label: "Status",
      render: (d) => <StatusBadge status={d.status} tone={statusTone(d.status) as StatusTone} />,
    },
    {
      key: "submitted",
      label: "Submitted",
      render: (d) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(d.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {["pending_verification", "confirmed", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              status === s
                ? "rounded-lg bg-[var(--admin-green)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-green)]"
                : "rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
            }
          >
            {s.replace("_", " ")}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.deposits}
        loading={isLoading}
        emptyMessage="No deposits in this queue"
        actions={
          canApprove
            ? (d) => (
                <div className="flex gap-1.5">
                  {d.status === "pending_verification" && (
                    <>
                      <button
                        onClick={() => act(d.id, "approve")}
                        className="rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/20"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => act(d.id, "reject")}
                        className="rounded-lg bg-rose-500/10 px-2.5 py-1 text-[10px] font-semibold text-rose-300 hover:bg-rose-500/20"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              )
            : undefined
        }
      />
    </div>
  )
}