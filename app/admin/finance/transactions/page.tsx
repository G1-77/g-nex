"use client"

import { useState } from "react"
import { useAdminQuery } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { AdminPageHeader, AdminSearch, AdminSelect } from "@/components/admin/ui"
import { RowActions } from "@/components/admin/rowActions"
import { useAuth } from "@/components/providers/AuthProvider"
import { formatKes, formatTimestamp, statusTone } from "@/lib/admin/format"

interface TransactionsData {
  transactions: Array<{
    tx_type: string
    id: string
    username: string | null
    asset_symbol: string | null
    amount_kes: number
    status: string
    reference: string | null
    provider: string | null
    created_at: string
  }>
}

export default function AdminTransactionsPage() {
  const [q, setQ] = useState("")
  const [type, setType] = useState("all")
  const [status, setStatus] = useState("all")
  const { can } = useAuth()
  const canEdit = can("data.edit")
  const canDelete = can("data.delete")

  const url = `/api/admin/finance/transactions?q=${encodeURIComponent(q)}&type=${type}&status=${status}`
  const { data, isLoading, error } = useAdminQuery<TransactionsData>(url)

  const columns: AdminColumn<TransactionsData["transactions"][number]>[] = [
    {
      key: "type",
      label: "Type",
      render: (t) => (
        <span className="capitalize text-slate-100">
          <span className="font-bold">{t.tx_type}</span>
        </span>
      ),
    },
    {
      key: "user",
      label: "User",
      render: (t) => <span className="font-semibold text-slate-100">@{t.username ?? "unknown"}</span>,
    },
    {
      key: "asset",
      label: "Asset",
      render: (t) => <span className="text-[var(--admin-text-dim)]">{t.asset_symbol ?? "KES"}</span>,
      preview: false,
    },
    {
      key: "amount",
      label: "Amount",
      render: (t) => <span className="font-mono font-bold text-slate-100">{formatKes(t.amount_kes)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (t) => <StatusBadge status={t.status} tone={statusTone(t.status) as StatusTone} />,
    },
    {
      key: "reference",
      label: "Reference",
      render: (t) => (
        <span className="font-mono text-[11px] text-[var(--admin-text-dim)]">{t.reference ?? "—"}</span>
      ),
      preview: false,
    },
    {
      key: "date",
      label: "Timestamp",
      render: (t) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(t.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Transactions" subtitle="Every deposit, withdrawal and trade" />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <AdminSearch
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by reference or user…"
          className="md:max-w-xs"
        />
        <div className="flex flex-wrap gap-2">
          <AdminSelect value={type} onChange={(e) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option value="deposit">Deposits</option>
            <option value="withdrawal">Withdrawals</option>
            <option value="trade">Trades</option>
          </AdminSelect>
          <AdminSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="pending_verification">Pending verification</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="processing">Processing</option>
            <option value="confirmed">Confirmed</option>
            <option value="sent">Sent</option>
            <option value="rejected">Rejected</option>
            <option value="failed">Failed</option>
          </AdminSelect>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.transactions}
        loading={isLoading}
        emptyMessage="No transactions match your filters"
        actions={
          canEdit || canDelete
            ? (t) => (
                <RowActions
                  url="/api/admin/finance/transactions"
                  id={t.id}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  row={{ id: t.id, status: t.status, notes: "", reference: t.reference ?? "", amount_kes: t.amount_kes }}
                  fields={[
                    {
                      key: "status",
                      label: "Status",
                      type: "select",
                      options: [
                        { value: "pending", label: "pending" },
                        { value: "confirmed", label: "confirmed" },
                        { value: "failed", label: "failed" },
                        { value: "cancelled", label: "cancelled" },
                      ],
                    },
                    { key: "notes", label: "Notes", type: "textarea" },
                    { key: "reference", label: "Reference" },
                    { key: "amount_kes", label: "Amount (KES)", type: "number" },
                  ]}
                />
              )
            : undefined
        }
      />
    </div>
  )
}