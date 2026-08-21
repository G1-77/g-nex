"use client"

import { useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useAuth } from "@/components/providers/AuthProvider"
import { useAdminQuery, adminAction } from "@/components/admin/useAdminQuery"
import { AdminButton, AdminPageHeader, AdminPanel, AdminSectionLabel } from "@/components/admin/ui"
import { SETTING_KEYS } from "@/lib/admin/settings"

interface SettingsData {
  settings: Record<string, unknown>
}

const SETTING_LABELS: Record<string, string> = {
  trading_fee_pct: "Trading fee (fraction — 0.02 = 2%)",
  max_withdraw_pct: "Max withdrawal cap (fraction of account)",
  withdrawal_fee_rate: "Withdrawal fee (fraction — 0.03 = 3%)",
  deposit_min_kes: "Minimum deposit (KES)",
  deposit_max_kes: "Maximum deposit (KES)",
  maintenance_mode: "Maintenance mode",
  trading_enabled: "Trading master switch",
  quick_trade_enabled: "Quick Trade product",
  spot_enabled: "Spot Pro product",
  ftt_enabled: "FTT product",
  min_trade_usd: "Minimum trade (USD)",
  max_trade_usd: "Maximum trade (USD)",
  max_leverage: "Max leverage (x)",
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
    return <div className="admin-panel h-40 animate-pulse p-4" />
  }

  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-300">{error.message}</div>
    )
  }

  const num = (key: string) => Number(settings[key] ?? 0)

  const chip = (active: boolean) =>
    active
      ? "border-[rgba(141,255,69,0.4)] bg-[rgba(141,255,69,0.1)] text-[var(--admin-green)]"
      : "border-[var(--admin-border)] bg-transparent text-[var(--admin-text-dim)]"

  return (
    <div className="max-w-3xl space-y-6">
      <AdminPageHeader title="Settings" subtitle="Platform-wide trading and deposit configuration" />

      <div className="grid gap-3 md:grid-cols-2">
        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.trading_fee_pct}</span>
          <input
            type="number"
            step="0.001"
            min="0"
            max="0.2"
            value={num("trading_fee_pct")}
            onChange={(e) => setField(SETTING_KEYS.TRADING_FEE_PCT, Number(e.target.value))}
            className="admin-input mt-2 w-full font-mono text-sm"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Fraction of notional, charged on every BUY/SELL (default 0.02 = 2%).
          </p>
        </AdminPanel>

        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.max_withdraw_pct}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            max="1"
            value={num("max_withdraw_pct")}
            onChange={(e) => setField(SETTING_KEYS.MAX_WITHDRAW_PCT, Number(e.target.value))}
            className="admin-input mt-2 w-full font-mono text-sm"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Consumed by the withdrawal availability calculator (default 0.7).
          </p>
        </AdminPanel>

        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.withdrawal_fee_rate}</span>
          <input
            type="number"
            step="0.001"
            min="0"
            max="0.2"
            value={num("withdrawal_fee_rate")}
            onChange={(e) => setField(SETTING_KEYS.WITHDRAWAL_FEE_RATE, Number(e.target.value))}
            className="admin-input mt-2 w-full font-mono text-sm"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Fraction of the withdrawn amount, KES cash-outs only (default 0.03 = 3%). Never applied to trades.
          </p>
        </AdminPanel>

        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Deposit limits (KES)</span>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={num("deposit_min_kes")}
              onChange={(e) => setField(SETTING_KEYS.DEPOSIT_MIN_KES, Number(e.target.value))}
              className="admin-input w-full font-mono text-sm"
            />
            <span className="text-[var(--admin-text-dim)]">–</span>
            <input
              type="number"
              min="0"
              value={num("deposit_max_kes")}
              onChange={(e) => setField(SETTING_KEYS.DEPOSIT_MAX_KES, Number(e.target.value))}
              className="admin-input w-full font-mono text-sm"
            />
          </div>
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">
            Enforced by the deposit route (defaults 100 – 500,000).
          </p>
        </AdminPanel>
      </div>

      <AdminPanel className="p-4">
        <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Maintenance mode</span>
        <div className="mt-2 flex items-center gap-3">
          <button
            onClick={() => setField(SETTING_KEYS.MAINTENANCE_MODE, !Boolean(settings.maintenance_mode))}
            className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
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
      </AdminPanel>

      <AdminPanel className="p-4">
        <span className="text-xs font-semibold text-[var(--admin-text-dim)]">Trading availability</span>
        <div className="mt-3 space-y-3">
          {(
            [
              ["trading_enabled", SETTING_KEYS.TRADING_ENABLED],
              ["quick_trade_enabled", SETTING_KEYS.QUICK_TRADE_ENABLED],
              ["spot_enabled", SETTING_KEYS.SPOT_ENABLED],
              ["ftt_enabled", SETTING_KEYS.FTT_ENABLED],
            ] as const
          ).map(([key, settingKey]) => (
            <div key={key} className="flex items-center gap-3">
              <button
                onClick={() => setField(settingKey, !Boolean(settings[key]))}
                className={`relative h-6 w-11 cursor-pointer rounded-full transition-colors ${
                  settings[key] ? "bg-[var(--admin-green)]" : "bg-white/10"
                }`}
                aria-pressed={Boolean(settings[key])}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                    settings[key] ? "translate-x-5" : "translate-x-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-slate-200">{SETTING_LABELS[key]}</span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[10px] text-[var(--admin-text-dim)]">
          Enforced server-side on every order route: master switch gates all execution;
          product switches gate Quick Trade, Spot Pro and FTT independently.
        </p>
      </AdminPanel>

      <div className="grid gap-3 md:grid-cols-3">
        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.min_trade_usd}</span>
          <input
            type="number"
            step="0.01"
            min="0"
            value={num("min_trade_usd")}
            onChange={(e) => setField(SETTING_KEYS.MIN_TRADE_USD, Number(e.target.value))}
            className="admin-input mt-2 w-full font-mono text-sm"
          />
        </AdminPanel>

        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.max_trade_usd}</span>
          <input
            type="number"
            step="1"
            min="1"
            value={num("max_trade_usd")}
            onChange={(e) => setField(SETTING_KEYS.MAX_TRADE_USD, Number(e.target.value))}
            className="admin-input mt-2 w-full font-mono text-sm"
          />
        </AdminPanel>

        <AdminPanel className="p-4">
          <span className="text-xs font-semibold text-[var(--admin-text-dim)]">{SETTING_LABELS.max_leverage}</span>
          <input
            type="number"
            step="1"
            min="1"
            max="100"
            value={num("max_leverage")}
            onChange={(e) => setField(SETTING_KEYS.MAX_LEVERAGE, Math.floor(Number(e.target.value)))}
            className="admin-input mt-2 w-full font-mono text-sm"
          />
          <p className="mt-1 text-[10px] text-[var(--admin-text-dim)]">Hard ceiling 100x.</p>
        </AdminPanel>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <AdminPanel className="p-4">
          <AdminSectionLabel className="mb-2">Supported payment providers</AdminSectionLabel>
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
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${chip(active)}`}
                >
                  {p}
                </button>
              )
            })}
          </div>
        </AdminPanel>

        <AdminPanel className="p-4">
          <AdminSectionLabel className="mb-2">Supported trading assets</AdminSectionLabel>
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
                  className={`cursor-pointer rounded-lg border px-3 py-1.5 font-mono text-xs font-bold transition-colors ${chip(active)}`}
                >
                  {a}
                </button>
              )
            })}
          </div>
        </AdminPanel>
      </div>

      {saved && (
        <p className="text-xs font-semibold text-emerald-300">Settings saved and audited.</p>
      )}

      <AdminButton
        variant="primary"
        onClick={save}
        disabled={saving || !form}
      >
        {saving ? "Saving…" : "Save settings"}
      </AdminButton>
    </div>
  )
}