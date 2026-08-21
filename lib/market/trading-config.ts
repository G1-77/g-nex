// lib/market/trading-config.ts
// Server-only trading configuration. Resolves the admin-controlled platform
// settings that gate the trading ecosystem and re-derives the tradable asset
// list from the authoritative `assets` table. The frontend never decides any
// of this — every order route resolves fresh config per request.

import type { SupabaseClient } from '@supabase/supabase-js'
import { getPlatformSetting, SETTING_KEYS } from '@/lib/admin/settings'
import { TRADABLE_SYMBOLS } from '@/lib/market/execution'
export interface TradingConfig {
  tradingEnabled: boolean
  quickTradeEnabled: boolean
  spotEnabled: boolean
  fttEnabled: boolean
  minTradeUsd: number
  maxTradeUsd: number
  maxLeverage: number
}

export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  tradingEnabled: true,
  quickTradeEnabled: true,
  spotEnabled: true,
  fttEnabled: false,
  minTradeUsd: 1,
  maxTradeUsd: 50_000,
  maxLeverage: 100,
}

export async function getTradingConfig(service: SupabaseClient): Promise<TradingConfig> {
  const [tradingEnabled, quickTradeEnabled, spotEnabled, fttEnabled, minTradeUsd, maxTradeUsd, maxLeverage] =
    await Promise.all([
      getPlatformSetting<boolean>(service, SETTING_KEYS.TRADING_ENABLED, DEFAULT_TRADING_CONFIG.tradingEnabled),
      getPlatformSetting<boolean>(service, SETTING_KEYS.QUICK_TRADE_ENABLED, DEFAULT_TRADING_CONFIG.quickTradeEnabled),
      getPlatformSetting<boolean>(service, SETTING_KEYS.SPOT_ENABLED, DEFAULT_TRADING_CONFIG.spotEnabled),
      getPlatformSetting<boolean>(service, SETTING_KEYS.FTT_ENABLED, DEFAULT_TRADING_CONFIG.fttEnabled),
      getPlatformSetting<number>(service, SETTING_KEYS.MIN_TRADE_USD, DEFAULT_TRADING_CONFIG.minTradeUsd),
      getPlatformSetting<number>(service, SETTING_KEYS.MAX_TRADE_USD, DEFAULT_TRADING_CONFIG.maxTradeUsd),
      getPlatformSetting<number>(service, SETTING_KEYS.MAX_LEVERAGE, DEFAULT_TRADING_CONFIG.maxLeverage),
    ])

  return {
    tradingEnabled: tradingEnabled === true,
    quickTradeEnabled: quickTradeEnabled === true,
    spotEnabled: spotEnabled === true,
    fttEnabled: fttEnabled === true,
    minTradeUsd: typeof minTradeUsd === 'number' && minTradeUsd >= 0 ? minTradeUsd : DEFAULT_TRADING_CONFIG.minTradeUsd,
    maxTradeUsd: typeof maxTradeUsd === 'number' && maxTradeUsd > 0 ? maxTradeUsd : DEFAULT_TRADING_CONFIG.maxTradeUsd,
    maxLeverage:
      typeof maxLeverage === 'number' && maxLeverage >= 1 && maxLeverage <= 100
        ? Math.floor(maxLeverage)
        : DEFAULT_TRADING_CONFIG.maxLeverage,
  }
}

export function productAllowed(config: TradingConfig, product: 'quick_trade' | 'spot' | 'ftt'): boolean {
  if (!config.tradingEnabled) return false
  if (product === 'quick_trade') return config.quickTradeEnabled
  if (product === 'spot') return config.spotEnabled
  return config.fttEnabled
}

/**
 * Authoritative tradable symbols: active rows in the assets table.
 * Falls back to the static catalogue only when the table is unreachable or
 * empty so a data outage cannot silently disable the whole exchange.
 */
export async function getTradableSymbols(service: SupabaseClient): Promise<string[]> {
  try {
    const { data, error } = await service
      .from('assets')
      .select('symbol')
      .eq('is_active', true)

    if (!error && data && data.length > 0) {
      return data.map((row) => String(row.symbol).toUpperCase())
    }
  } catch {
    // fall through to the static catalogue
  }
  return [...TRADABLE_SYMBOLS]
}

export async function isSymbolTradable(service: SupabaseClient, symbol: string): Promise<boolean> {
  const symbols = await getTradableSymbols(service)
  return symbols.includes(symbol.toUpperCase())
}
