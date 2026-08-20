"use client"

import { useState, type ReactNode } from "react"
import { X, BarChart3, TrendingUp, Clock3, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"

export interface AdminColumn<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  /** Whether the column appears in the compact mobile card (all still show in the detail sheet). */
  preview?: boolean
}

interface AdminTableProps<T extends { id: string }> {
  columns: AdminColumn<T>[]
  rows: T[] | undefined
  actions?: (row: T) => ReactNode
  emptyMessage?: string
  loading?: boolean
}

/**
 * Responsive admin table. Desktop: classic column table. Mobile: stacked cards
 * with a bottom-sheet detail view (per the Phase 4 spec).
 */
export function AdminTable<T extends { id: string }>({
  columns,
  rows,
  actions,
  emptyMessage = "No records found",
  loading = false,
}: AdminTableProps<T>) {
  const [detail, setDetail] = useState<T | null>(null)

  if (loading) {
    return (
      <div className="admin-panel space-y-2 overflow-hidden p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-12 animate-pulse rounded-xl bg-gradient-to-r from-white/[0.02] via-white/[0.06] to-white/[0.02]"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>
    )
  }

  const list = rows ?? []

  return (
    <>
      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-panel)] shadow-[var(--admin-shadow-sm)] backdrop-blur-md md:block">
        <div className="premium-scrollbar overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[var(--admin-border)] bg-[rgba(148,163,184,0.03)] text-[10px] uppercase tracking-[0.12em] text-[var(--admin-text-dim)]">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 font-bold">
                    {col.label}
                  </th>
                ))}
                {actions && <th className="px-4 py-3 text-right font-bold">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {list.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--admin-border)]/60 transition-colors duration-100 last:border-0 hover:bg-[rgba(141,255,69,0.03)]"
                >
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3 align-middle">
                      {col.render(row)}
                    </td>
                  ))}
                  {actions && <td className="px-4 py-3 text-right align-middle">{actions(row)}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {list.length === 0 && (
          <p className="px-4 py-8 text-center text-xs text-[var(--admin-text-dim)]">{emptyMessage}</p>
        )}
      </div>

      {/* Mobile cards + detail sheet */}
      <div className="space-y-2 md:hidden">
        {list.map((row) => (
          <button
            key={row.id}
            onClick={() => setDetail(row)}
            className="admin-panel block w-full cursor-pointer p-3 text-left transition-all active:scale-[0.99]"
          >
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
              {columns
                .filter((c) => c.preview !== false)
                .slice(0, 4)
                .map((col) => (
                  <div key={col.key} className="min-w-0">
                    <p className="text-[9px] uppercase tracking-wider text-[var(--admin-text-dim)]">{col.label}</p>
                    <div className="mt-0.5 truncate text-xs font-medium text-slate-100">{col.render(row)}</div>
                  </div>
                ))}
            </div>
            <p className="mt-2 text-[10px] font-semibold text-[var(--admin-green)]">View details</p>
          </button>
        ))}
        {list.length === 0 && (
          <p className="admin-panel px-4 py-8 text-center text-xs text-[var(--admin-text-dim)]">
            {emptyMessage}
          </p>
        )}
      </div>

      {/* Mobile detail sheet */}
      {detail && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            aria-label="Close details"
            onClick={() => setDetail(null)}
            className="absolute inset-0 cursor-pointer bg-black/70 backdrop-blur-sm"
          />
          <div className="absolute inset-x-0 bottom-0 max-h-[80vh] overflow-y-auto rounded-t-3xl border-t border-[var(--admin-border)] bg-[var(--admin-panel-elevated)] p-5 pb-8 shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/10" />
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-100">Details</p>
              <button
                aria-label="Close"
                onClick={() => setDetail(null)}
                className="rounded-lg p-1.5 text-[var(--admin-text-dim)] hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3">
              {columns.map((col) => (
                <div key={col.key}>
                  <p className="text-[10px] uppercase tracking-wider text-[var(--admin-text-dim)]">{col.label}</p>
                  <div className="mt-1 text-sm font-medium text-slate-100">{col.render(detail)}</div>
                </div>
              ))}
              {actions && <div className="flex flex-wrap gap-2 pt-2">{actions(detail)}</div>}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const METRIC_TONE = {
  default: {
    chip: "bg-white/5 text-slate-100",
    value: "text-slate-100",
    icon: BarChart3,
  },
  green: {
    chip: "bg-[rgba(141,255,69,0.12)] text-[var(--admin-green)]",
    value: "text-[var(--admin-green)]",
    icon: TrendingUp,
  },
  amber: {
    chip: "bg-[rgba(251,191,36,0.12)] text-amber-300",
    value: "text-amber-300",
    icon: Clock3,
  },
  red: {
    chip: "bg-[rgba(244,63,94,0.12)] text-rose-300",
    value: "text-rose-300",
    icon: AlertTriangle,
  },
} as const

export function AdminMetricCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string
  value: ReactNode
  sub?: string
  tone?: "default" | "green" | "amber" | "red"
}) {
  const t = METRIC_TONE[tone]
  const Icon = t.icon

  return (
    <div className="admin-panel group p-4 transition-all duration-150 hover:border-[var(--admin-border-strong)] hover:shadow-[var(--admin-shadow-glow)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--admin-text-dim)]">
          {label}
        </p>
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-transform duration-150 group-hover:scale-105", t.chip)}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={cn("mt-3 font-mono text-2xl font-black leading-none tracking-tight", t.value)}>
        {value}
      </p>
      {sub && (
        <p className="mt-2 text-[11px] text-[var(--admin-text-dim)]">{sub}</p>
      )}
    </div>
  )
}