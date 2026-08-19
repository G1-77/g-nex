"use client"

import { useState } from "react"
import { useAdminQuery } from "@/components/admin/useAdminQuery"
import { AdminTable, AdminColumn } from "@/components/admin/AdminTable"
import { StatusBadge, StatusTone } from "@/components/admin/status"
import { formatNumber, formatTimestamp, statusTone } from "@/lib/admin/format"

interface OrdersData {
  orders: Array<{
    id: string
    username: string | null
    asset_symbol: string | null
    order_type: string
    side: string
    quantity: number
    price: number | null
    filled_quantity: number
    status: string
    fee: number
    created_at: string
  }>
}

export default function AdminOrdersPage() {
  const [status, setStatus] = useState("all")
  const [side, setSide] = useState("all")

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
      <div className="flex flex-wrap gap-2">
        {["all", "open", "filled", "partial", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={
              status === s
                ? "rounded-lg bg-[var(--admin-green)]/10 px-3 py-1.5 text-xs font-semibold text-[var(--admin-green)]"
                : "rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
            }
          >
            {s}
          </button>
        ))}
        <span className="mx-1 w-px bg-[var(--admin-border)]" />
        {["all", "buy", "sell"].map((s) => (
          <button
            key={s}
            onClick={() => setSide(s)}
            className={
              side === s
                ? "rounded-lg bg-sky-500/10 px-3 py-1.5 text-xs font-semibold text-sky-300"
                : "rounded-lg border border-[var(--admin-border)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text-dim)] hover:text-slate-100"
            }
          >
            {s === "all" ? "All sides" : s}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
      )}

      <AdminTable
        columns={columns}
        rows={data?.orders}
        loading={isLoading}
        emptyMessage="No orders match your filters"
      />
    </div>
  )
}