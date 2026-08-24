// Platform settings. DB-backed key/value store read server-side with the
// existing constants as code fallbacks — settings are only ever wired to code
// paths that actually consume them.

import type { SupabaseClient } from "@supabase/supabase-js"

export const SETTING_KEYS = {
  TRADING_FEE_PCT: "trading_fee_pct",
  MAX_WITHDRAW_PCT: "max_withdraw_pct",
  WITHDRAWAL_FEE_RATE: "withdrawal_fee_rate",
  DEPOSIT_MIN_KES: "deposit_min_kes",
  DEPOSIT_MAX_KES: "deposit_max_kes",
  MAINTENANCE_MODE: "maintenance_mode",
  PAYMENT_PROVIDERS: "payment_providers",
  SUPPORTED_ASSETS: "supported_assets",
  TRADING_ENABLED: "trading_enabled",
  QUICK_TRADE_ENABLED: "quick_trade_enabled",
  SPOT_ENABLED: "spot_enabled",
  FTT_ENABLED: "ftt_enabled",
  MIN_TRADE_USD: "min_trade_usd",
  MAX_TRADE_USD: "max_trade_usd",
  MAX_LEVERAGE: "max_leverage",
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

/** Public display/bounds config served by GET /api/platform/config. */
export interface PlatformConfig {
  /** Trading fee as a fraction of notional (0.02 = 2%). */
  tradingFeeRate: number
  /** Withdrawal fee as a fraction of the withdrawn amount (0.03 = 3%). */
  withdrawalFeeRate: number
  minTradeUsd: number
  maxTradeUsd: number
}

/**
 * Defaults mirror the code constants so the platform behaves the same with no
 * rows. Fee convention (unified): every fee/rate is stored as a FRACTION —
 * trading_fee_pct 0.02 = 2%, withdrawal_fee_rate 0.03 = 3%.
 */
export const SETTING_DEFAULTS: Record<SettingKey, unknown> = {
  trading_fee_pct: 0.02,
  max_withdraw_pct: 0.7,
  withdrawal_fee_rate: 0.03,
  deposit_min_kes: 100,
  deposit_max_kes: 500_000,
  maintenance_mode: false,
  payment_providers: ["mpesa", "airtel"],
  supported_assets: ["BTC", "ETH", "SOL", "XRP", "USDT", "XAU", "DOGE", "TRUMP", "USDC", "ACE"],
  trading_enabled: true,
  quick_trade_enabled: true,
  spot_enabled: true,
  ftt_enabled: false,
  min_trade_usd: 1,
  max_trade_usd: 50_000,
  max_leverage: 100,
}

/**
 * Read one setting with a code fallback. Server-only (service client).
 * Returns the fallback when the key is missing or the query fails — the caller
 * decides how to surface errors, never pretending a failed query is a value.
 */
export async function getPlatformSetting<T>(
  service: SupabaseClient,
  key: SettingKey,
  fallback: T
): Promise<T> {
  const { data, error } = await service
    .from("platform_settings")
    .select("value")
    .eq("key", key)
    .maybeSingle()

  if (error || !data) return fallback
  return (data.value as T) ?? fallback
}

/** Read several settings in one round trip. */
export async function getPlatformSettings(
  service: SupabaseClient
): Promise<Record<string, unknown>> {
  const { data, error } = await service.from("platform_settings").select("key, value")
  if (error || !data) return {}

  const out: Record<string, unknown> = {}
  for (const row of data) out[row.key as string] = row.value
  return out
}

/** Upsert a setting with validation + audit performed by the caller. */
export async function upsertPlatformSetting(
  service: SupabaseClient,
  key: SettingKey,
  value: unknown,
  updatedBy: string
): Promise<{ error: string | null }> {
  const { error } = await service.from("platform_settings").upsert(
    { key, value: JSON.parse(JSON.stringify(value)), updated_by: updatedBy, updated_at: new Date().toISOString() },
    { onConflict: "key" }
  )
  return { error: error?.message ?? null }
}