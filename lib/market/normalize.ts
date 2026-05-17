// lib/market/normalize.ts

import type { CoinGeckoMarket, MarketPrice } from '@/types/market'

export function normalizeCrypto(
  data: CoinGeckoMarket,
  usdKes: number
): MarketPrice {
  return {
    symbol: data.symbol.toUpperCase(),

    price_usd: data.current_price,
    price_kes: data.current_price * usdKes,

    change_24h: data.price_change_percentage_24h,

    volume_24h: data.total_volume,
    market_cap: data.market_cap,

    high_24h: data.high_24h,
    low_24h: data.low_24h,

    last_updated: data.last_updated
  }
}