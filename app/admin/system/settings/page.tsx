"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { SETTING_KEYS } from "@/lib/admin/settings"

interface SettingsData {
  settings: Record<string, unknown>
}

const SETTING_LABELS: Record<string, string> = {
  trading_fee_pct: "Trading fee (%)",
  max_withdraw_pct: "Max withdrawal cap (fraction of account)",
  withdrawal_fee_rate: "Withdrawal fee rate (fraction)",
  deposit_min_kes: "Minimum deposit (KES)",
  deposit_max_kes: "Maximum deposit (KES)",
  maintenance_mode: "Maintenance mode",
}

const PROVIDERS = ["mpesa", "airtel"]
const ASSETS = ["BTC", "ETH", "SOL", "XRP", "USDT", "XAU"]

export default function AdminSettingsPage() {
  const { isSuperAdmin, can } = useAuth()
  const canManage = isSuperAdmin || can("settings.manage")
  const queryClient = useQueryClient()

  const { data, isLoading, error } = useAdminQuery<SettingsData>("/api/admin/settings")
  const [form, setForm] = useState<Record<string, unknown> | null>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const settings = form ?? data?.settings ?? {}

  function setField(key: string, value: unknown) {
    setForm((prev) => ({ ...(prev ?? data?.settings ?? {}), [key]: value }))
    setSaved(false)
  }

  async function save() {
    if (!form) return
    setSaving(true)
    try {
      await adminAction("/api/admin/settings", "PATCH", { settings: form })
      setSaved(true)
      await queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] })
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  if (!canManage) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-6 text-sm text-rose-300">
        You need the settings.manage permission to view or change settings.
      </div>
    )
  }

  if (isLoading) {
    return <div className="h-40 animate-pulse rounded-xl bg-white/5" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
    )
  }

  const num = (key: string) => Number(settings[key] ?? 0)

  return (
    <div className="max-w-3xl space-y-6">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.trading_fee_pct}</span>
          <input
            type="number"
            step="0.01"
            value={num("trading_fee_pct")}
            onChange={(e) => setField(SETTING_KEYS.TRADING_FEE_PCT, Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-[var(--admin-green)]/50"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Consumed by the market order execution engine (default 0.5).
          </p>
        </label>

        <label className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.max_withdraw_pct}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={num("max_withdraw_pct")}
            onChange={(e) => setField(SETTING_KEYS.MAX_WITHDRAW_PCT, Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-[var(--admin-green)]/50"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Consumed by the withdrawal availability calculator (default 0.7).
          </p>
        </label>

        <label className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.withdrawal_fee_rate}</span>
          <input
            type="number"
            step="0.001"
            min="0"
            max="1"
            value={num("withdrawal_fee_rate")}
            onChange={(e) => setField(SETTING_KEYS.WITHDRAWAL_FEE_RATE, Number(e.target.value))}
            className="mt-2 w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-[var(--admin-green)]/50"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Consumed by the withdrawal fee calculation (default 0.02).
          </p>
        </label>

        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Deposit limits (KES)</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={num("deposit_min_kes")}
              onChange={(e) => setField(SETTING_KEYS.DEPOSIT_MIN_KES, Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-[var(--admin-green)]/50"
            />
            <span className="text-[var(--admin-text-dim)]">–</span>
            <input
              type="number"
              min="0"
              value={num("deposit_max_kes")}
              onChange={(e) => setField(SETTING_KEYS.DEPOSIT_MAX_KES, Number(e.target.value))}
              className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-bg)] px-3 py-2 font-mono text-sm text-slate-100 outline-none focus:border-[var(--admin-green)]/50"
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Enforced by the deposit route (defaults 100 – 500,000).
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
        <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Maintenance mode</span>
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => setField(SETTING_KEYS.MAINTENANCE_MODE, !Boolean(settings.maintenance_mode))}
            className={`relative h-6 w-11 rounded-full transition-colors ${
              settings.maintenance_mode ? "bg-[var(--admin-green)]" : "bg-white/10"
            }`}
            aria-pressed={Boolean(settings.maintenance_mode)}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                settings.maintenance_mode ? "translate-x-5" : "translate-x-0.5"
              }`}
            />
          </button>
          <span className="text-sm text-slate-200">
            {settings.maintenance_mode ? "Active — non-staff traffic is blocked" : "Off"}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
          Enforced in the edge proxy; staff keep access while it is on.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Supported payment providers</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {PROVIDERS.map((p) => {
              const current = Array.isArray(settings.payment_providers)
                ? (settings.payment_providers as string[])
                : []
              const active = current.includes(p)
              return (
                <button
                  key={p}
                  onClick={() =>
                    setField(
                      SETTING_KEYS.PAYMENT_PROVIDERS,
                      active ? current.filter((x) => x !== p) : [...current, p]
                    )
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize ${
                    active
                      ? "border-[var(--admin-green)]/40 bg-[var(--admin-green)]/10 text-[var(--admin-green)]"
                      : "border-[var(--admin-border)] text-[var(--admin-text-dim)]"
                  }`}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-panel)] p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Supported trading assets</span>
          <div className="mt-2 flex flex-wrap gap-2">
            {ASSETS.map((a) => {
              const current = Array.isArray(settings.supported_assets)
                ? (settings.supported_assets as string[])
                : []
              const active = current.includes(a)
              return (
                <button
                  key={a}
                  onClick={() =>
                    setField(
                      SETTING_KEYS.SUPPORTED_ASSETS,
                      active ? current.filter((x) => x !== a) : [...current, a]
                    )
                  }
                  className={`rounded-lg border px-3 py-1.5 font-mono text-xs font-bold ${
                    active
                      ? "border-[var(--admin-green)]/40 bg-[var(--admin-green)]/10 text-[var(--admin-green)]"
                      : "border-[var(--admin-border)] text-[var(--admin-text-dim)]"
                  }`}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {saved && (
        <p className="text-xs font-semibold text-emerald-300">Settings saved and audited.</p>
      )}

      <button
        onClick={save}
        disabled={saving || !form}
        className="rounded-lg bg-[var(--admin-green)] px-6 py-2.5 text-xs font-bold text-black hover:brightness-110 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save settings"}
      </button>
    </div>
  )
}