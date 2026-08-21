"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { AdminButton, AdminPageHeader, AdminTab, AdminTabs } from "@/components/admin/ui"
import { DeleteButton, EditButton } from "@/components/admin/rowActions"
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

const FILTERS = ["pending_verification", "confirmed", "rejected"] as const

export default function AdminDepositsPage() {
  const [status, setStatus] = useState("pending_verification")
  const queryClient = useQueryClient()
  const { can } = useAuth()
  const canApprove = can("deposits.approve")
  const canEdit = can("data.edit")
  const canDelete = can("data.delete")

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
      <AdminPageHeader title="Deposits" subtitle="Approve or reject incoming mobile money" />

      <AdminTabs>
        {FILTERS.map((s) => (
          <AdminTab key={s} active={status === s} onClick={() => setStatus(s)}>
            {s.replace("_", " ")}
          </AdminTab>
        ))}
      </AdminTabs>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.deposits}
        loading={isLoading}
        emptyMessage="No deposits in this queue"
        actions={(d) => (
                <div className="flex items-center justify-end gap-1.5">
                  {canApprove && d.status === "pending_verification" && (
                    <>
                      <AdminButton variant="subtle" onClick={() => act(d.id, "approve")}>
                        Approve
                      </AdminButton>
                      <AdminButton variant="danger" onClick={() => act(d.id, "reject")}>
                        Reject
                      </AdminButton>
                    </>
                  )}
                  {canEdit && (
                    <EditButton
                      iconOnly
                      url="/api/admin/finance/deposits"
                      id={d.id}
                      row={{ id: d.id, status: d.status, admin_notes: d.admin_notes ?? "", amount_kes: d.amount_kes }}
                      fields={[
                        {
                          key: "status",
                          label: "Status",
                          type: "select",
                          options: [
                            { value: "pending", label: "pending" },
                            { value: "pending_verification", label: "pending_verification" },
                            { value: "confirmed", label: "confirmed" },
                            { value: "rejected", label: "rejected" },
                            { value: "reversed", label: "reversed" },
                          ],
                        },
                        { key: "admin_notes", label: "Admin notes", type: "textarea" },
                        { key: "amount_kes", label: "Amount (KES)", type: "number" },
                      ]}
                    />
                  )}
                  {canDelete && <DeleteButton iconOnly url="/api/admin/finance/deposits" id={d.id} />}
                </div>
              )}
      />
    </div>
  )
}