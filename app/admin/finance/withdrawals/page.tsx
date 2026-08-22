"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, runAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { AdminButton, AdminPageHeader, AdminTab, AdminTabs } from "@/components/admin/ui"
import { DeleteButton, EditButton } from "@/components/admin/rowActions"
import { formatKes, formatTimestamp, statusTone } from "@/lib/admin/format"

interface WithdrawalsData {
  withdrawals: Array<{
    id: string
    username: string | null
    amount_kes: number
    fee_kes: number
    mobile_money_number: string | null
    mobile_money_provider: string | null
    asset_symbol: string | null
    status: string
    approved_by: string | null
    approved_at: string | null
    processed_at: string | null
    admin_notes: string | null
    created_at: string
    phone_matches_profile: boolean | null
  }>
}

const FILTERS = ["pending", "approved", "processing", "sent", "rejected", "failed", "cancelled"] as const

export default function AdminWithdrawalsPage() {
  const [status, setStatus] = useState("pending")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canProcess = can("withdrawals.process")
  const canEdit = can("data.edit")
  const canDelete = can("data.delete")

  const url = `/api/admin/finance/withdrawals?status=${status}`
  const { data, isLoading, error } = useAdminQuery<WithdrawalsData>(url)

  async function act(withdrawalId: string, action: string) {
    const note = window.prompt(`Note for ${action} (optional):`) ?? ""
    try {
      await runAction("/api/admin/finance/withdrawals", "POST", { withdrawalId, action, note })
      await queryClient.invalidateQueries({ queryKey: [url] })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/approvals"] })
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/overview"] })
    } catch (e) {
      alert((e as Error).message)
    }
  }

  const columns: AdminColumn<WithdrawalsData["withdrawals"][number]>[] = [
    {
      key: "user",
      label: "User",
      render: (w) => <span className="font-semibold text-slate-100">@{w.username ?? "unknown"}</span>,
    },
    {
      key: "amount",
      label: "Amount",
      render: (w) => <span className="font-mono font-bold text-slate-100">{formatKes(w.amount_kes)}</span>,
    },
    {
      key: "fee",
      label: "Fee",
      render: (w) => <span className="font-mono text-[var(--admin-text-dim)]">{formatKes(w.fee_kes)}</span>,
      preview: false,
    },
    {
      key: "net",
      label: "Net payout",
      render: (w) => (
        <span className="font-mono text-emerald-300">{formatKes(w.amount_kes - w.fee_kes)}</span>
      ),
    },
    {
      key: "destination",
      label: "Destination",
      render: (w) => (
        <div className="text-[11px]">
          <p className="font-mono text-slate-100">{w.mobile_money_number ?? "—"}</p>
          <p className="capitalize text-[var(--admin-text-dim)]">{w.mobile_money_provider ?? "—"}</p>
        </div>
      ),
    },
    {
      key: "asset",
      label: "Asset",
      render: (w) => <span className="text-[var(--admin-text-dim)]">{w.asset_symbol ?? "KES"}</span>,
      preview: false,
    },
    {
      key: "phone_match",
      label: "Phone match",
      render: (w) =>
        w.phone_matches_profile === null ? (
          <span className="text-[var(--admin-text-dim)]">—</span>
        ) : w.phone_matches_profile ? (
          <span className="text-emerald-300 text-xs">✓ matches profile</span>
        ) : (
          <span className="text-amber-300 text-xs">⚠ mismatch</span>
        ),
      preview: false,
    },
    {
      key: "status",
      label: "Status",
      render: (w) => <StatusBadge status={w.status} tone={statusTone(w.status) as StatusTone} />,
    },
    {
      key: "requested",
      label: "Requested",
      render: (w) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(w.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Withdrawals" subtitle="Process or reject payout requests" />

      <AdminTabs>
        {FILTERS.map((s) => (
          <AdminTab key={s} active={status === s} onClick={() => setStatus(s)}>
            {s}
          </AdminTab>
        ))}
      </AdminTabs>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.withdrawals}
        loading={isLoading}
        emptyMessage="No withdrawals in this queue"
        actions={(w) => {
          const actions: React.ReactNode[] = []

          // pending: Approve, Reject
          if (canProcess && w.status === "pending") {
            actions.push(
              <AdminButton key="approve" variant="subtle" onClick={() => act(w.id, "approve")}>
                Approve
              </AdminButton>
            )
            actions.push(
              <AdminButton key="reject" variant="danger" onClick={() => act(w.id, "reject")}>
                Reject
              </AdminButton>
            )
          }

          // approved: Send (process), Reject
          if (canProcess && w.status === "approved") {
            actions.push(
              <AdminButton key="process" variant="subtle" onClick={() => act(w.id, "process")}>
                Send
              </AdminButton>
            )
            actions.push(
              <AdminButton key="reject" variant="danger" onClick={() => act(w.id, "reject")}>
                Reject
              </AdminButton>
            )
          }

          // sent / processing: Fail (post-debit failure)
          if (canProcess && (w.status === "sent" || w.status === "processing")) {
            actions.push(
              <AdminButton key="fail" variant="danger" onClick={() => act(w.id, "fail")}>
                Mark Failed
              </AdminButton>
            )
          }

          // Edit button (safe columns)
          if (canEdit) {
            actions.push(
              <EditButton
                key="edit"
                iconOnly
                url="/api/admin/finance/withdrawals"
                id={w.id}
                row={{ id: w.id, status: w.status, admin_notes: w.admin_notes ?? "", amount_kes: w.amount_kes }}
                fields={[
                  {
                    key: "status",
                    label: "Status",
                    type: "select",
                    options: [
                      { value: "pending", label: "pending" },
                      { value: "approved", label: "approved" },
                      { value: "processing", label: "processing" },
                      { value: "sent", label: "sent" },
                      { value: "rejected", label: "rejected" },
                      { value: "failed", label: "failed" },
                      { value: "cancelled", label: "cancelled" },
                    ],
                  },
                  { key: "admin_notes", label: "Admin notes", type: "textarea" },
                  { key: "amount_kes", label: "Amount (KES)", type: "number" },
                ]}
              />
            )
          }

          if (canDelete) {
            actions.push(<DeleteButton key="delete" iconOnly url="/api/admin/finance/withdrawals" id={w.id} />)
          }

          return <div className="flex items-center justify-end gap-1.5">{actions}</div>
        }}
      />
    </div>
  )
}