"use client"

import { useState } from "react"
import { useAdminQuery } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { AdminPageHeader, AdminTab, AdminTabs } from "@/components/admin/ui"
import { RowActions } from "@/components/admin/rowActions"
import { useAuth } from "@/components/providers/AuthProvider"
import { formatNumber, formatTimestamp, statusTone } from "@/lib/admin/format"

interface OrdersData {
  orders: Array<{
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
  }>
}

const STATUS_FILTERS = ["all", "open", "filled", "partial", "cancelled"] as const
const SIDE_FILTERS = ["all", "buy", "sell"] as const

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("all")
  const [side, setSide] = useState("all")
  const { can } = useAuth()
  const canEdit = can("data.edit")
  const canDelete = can("data.delete")

  const url = `/api/admin/finance/orders?status=${status}&side=${side}`
  const { data, isLoading, error } = useAdminQuery<OrdersData>(url)

  const sideTone: Record<string, StatusTone> = {
    buy: "green",
    sell: "amber",
  }

  const columns: AdminColumn<OrdersData["orders"][number]>[] = [
    {
      key: "user",
      label: "User",
      render: (o) => <span className="font-semibold text-slate-100">@{o.username ?? "unknown"}</span>,
    },
    {
      key: "asset",
      label: "Asset",
      render: (o) => <span className="font-bold text-slate-100">{o.asset_symbol ?? "—"}</span>,
    },
    {
      key: "type",
      label: "Type",
      render: (o) => <span className="capitalize text-[var(--admin-text-dim)]">{o.order_type}</span>,
      preview: false,
    },
    {
      key: "side",
      label: "Side",
      render: (o) => <StatusBadge status={o.side} tone={sideTone[o.side] ?? "gray"} />,
    },
    {
      key: "mode",
      label: "Mode",
      render: (o) => (
        <span className={`font-mono text-[11px] font-bold uppercase ${o.mode === "margin" ? "text-amber-400" : "text-[var(--admin-text-dim)]"}`}>
          {o.mode ?? "spot"}
        </span>
      ),
      preview: false,
    },
    {
      key: "margin",
      label: "Margin",
      render: (o) => (
        <span className="font-mono text-[11px] text-amber-400/80">{o.margin_kes > 0 ? `KES ${formatNumber(o.margin_kes)}` : "—"}</span>
      ),
      preview: false,
    },
    {
      key: "quantity",
      label: "Quantity",
      render: (o) => <span className="font-mono text-slate-100">{formatNumber(o.quantity)}</span>,
    },
    {
      key: "price",
      label: "Price",
      render: (o) => (
        <span className="font-mono text-slate-100">{o.price === null ? "—" : `$${formatNumber(o.price)}`}</span>
      ),
      preview: false,
    },
    {
      key: "filled",
      label: "Filled",
      render: (o) => <span className="font-mono text-[var(--admin-text-dim)]">{formatNumber(o.filled_quantity)}</span>,
      preview: false,
    },
    {
      key: "status",
      label: "Status",
      render: (o) => <StatusBadge status={o.status} tone={statusTone(o.status) as StatusTone} />,
    },
    {
      key: "created",
      label: "Created",
      render: (o) => (
        <span className="text-[11px] text-[var(--admin-text-dim)]">{formatTimestamp(o.created_at)}</span>
      ),
      preview: false,
    },
  ]

  return (
    <div className="space-y-4">
      <AdminPageHeader title="Orders" subtitle="Market and limit order book" />

      <div className="flex flex-wrap items-center gap-3">
        <AdminTabs>
          {STATUS_FILTERS.map((s) => (
            <AdminTab key={s} active={status === s} onClick={() => setStatus(s)}>
              {s}
            </AdminTab>
          ))}
        </AdminTabs>
        <span className="h-6 w-px bg-[var(--admin-border)]" />
        <AdminTabs>
          {SIDE_FILTERS.map((s) => (
            <AdminTab key={s} active={side === s} onClick={() => setSide(s)}>
              {s === "all" ? "All sides" : s}
            </AdminTab>
          ))}
        </AdminTabs>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.orders}
        loading={isLoading}
        emptyMessage="No orders match your filters"
        actions={
          canEdit || canDelete
            ? (o) => (
                <RowActions
                  url="/api/admin/finance/orders"
                  id={o.id}
                  canEdit={canEdit}
                  canDelete={canDelete}
                  row={{ id: o.id, status: o.status, fee: o.fee, margin_kes: o.margin_kes }}
                  fields={[
                    {
                      key: "status",
                      label: "Status",
                      type: "select",
                      options: [
                        { value: "open", label: "open" },
                        { value: "filled", label: "filled" },
                        { value: "partial", label: "partial" },
                        { value: "cancelled", label: "cancelled" },
                      ],
                    },
                    { key: "fee", label: "Fee (USD)", type: "number" },
                    { key: "margin_kes", label: "Margin (KES)", type: "number" },
                  ]}
                />
              )
            : undefined
        }
      />
    </div>
  )
}