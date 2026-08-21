// GET /api/platform/config
//
// Public display/bounds configuration resolved from the existing
// platform_settings store. The browser uses this ONLY to render fee labels and
// pre-validate inputs — every financial decision is re-derived server-side.

import { createServiceClient } from '@/lib/admin/service'
import { getPlatformSetting, SETTING_KEYS, SETTING_DEFAULTS, type PlatformConfig } from '@/lib/admin/settings'
import { DEFAULT_TRADING_FEE_RATE } from '@/lib/market/execution'

export async function loadPlatformConfig(service: ReturnType<typeof createServiceClient>): Promise<PlatformConfig> {
  const [tradingFeeRate, withdrawalFeeRate, minTradeUsd, maxTradeUsd] = await Promise.all([
    getPlatformSetting<number>(service, SETTING_KEYS.TRADING_FEE_PCT, DEFAULT_TRADING_FEE_RATE),
    getPlatformSetting<number>(service, SETTING_KEYS.WITHDRAWAL_FEE_RATE, SETTING_DEFAULTS.withdrawal_fee_rate as number),
    getPlatformSetting<number>(service, SETTING_KEYS.MIN_TRADE_USD, SETTING_DEFAULTS.min_trade_usd as number),
    getPlatformSetting<number>(service, SETTING_KEYS.MAX_TRADE_USD, SETTING_DEFAULTS.max_trade_usd as number),
  ])

  const normalizeFee = (value: number, fallback: number): number => {
    if (!Number.isFinite(value) || value < 0) return fallback
    // Normalize legacy whole-percent rows ("2" meant 2%).
    return value > 1 ? value / 100 : value
  }

  return {
    tradingFeeRate: normalizeFee(tradingFeeRate, DEFAULT_TRADING_FEE_RATE),
    withdrawalFeeRate: normalizeFee(withdrawalFeeRate, SETTING_DEFAULTS.withdrawal_fee_rate as number),
    minTradeUsd: Number.isFinite(minTradeUsd) && minTradeUsd >= 0 ? minTradeUsd : (SETTING_DEFAULTS.min_trade_usd as number),
    maxTradeUsd: Number.isFinite(maxTradeUsd) && maxTradeUsd > 0 ? maxTradeUsd : (SETTING_DEFAULTS.max_trade_usd as number),
  }
}

export async function GET() {
  const service = createServiceClient()
  const config = await loadPlatformConfig(service)
  return Response.json(config, { headers: { 'Cache-Control': 'no-store' } })
}
