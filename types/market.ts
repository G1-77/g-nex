// types/market.ts

export type CoinGeckoMarket = {
  id: string
  symbol: string
  name: string
  image: string

  current_price: number
  market_cap: number
  market_cap_rank: number

  total_volume: number

  high_24h: number
  low_24h: number

  price_change_24h: number
  price_change_percentage_24h: number

  circulating_supply: number
  total_supply: number | null
  max_supply: number | null

  ath: number
  ath_change_percentage: number
  ath_date: string

  atl: number
  atl_change_percentage: number
  atl_date: string

  last_updated: string
}

export type MarketPrice = {
  symbol: string

  price_usd: number
  price_kes: number

  change_24h: number

  volume_24h?: number
  market_cap?: number

  high_24h?: number
  low_24h?: number

  last_updated: string
}

export type GoldPrice = {
  symbol: 'XAU'
  price_usd: number
  change_24h: number
  high_usd?: number
  low_usd?: number
  market_cap_usd?: number | null
  last_updated: string
}

export type FxResponse = {
  rates: {
    KES: number
  }
}

// ---------------------------------------------------------------------------
// Authoritative market-price snapshot (server → client via /api/market/prices)
// Every tradable asset carries full provenance: provider, provider symbol,
// currency, timestamps and freshness inputs.
// ---------------------------------------------------------------------------

export type PriceProvider = 'binance' | 'coingecko' | 'xaus' | 'exchangerate-api'

export interface MarketPriceQuote {
  symbol: string
  /** Data source for this quote. */
  provider: PriceProvider
  /** Provider-native symbol/id, e.g. 'bitcoin', 'btcusdt', 'XAU'. */
  providerSymbol: string
  /** Quote currency of `priceUsd`. */
  currency: 'USD'
  priceUsd: number
  /** Derived server-side with the authoritative USD/KES rate. */
  priceKes: number
  change24h: number
  high24h?: number
  low24h?: number
  volume24h?: number
  marketCap?: number
  /** Provider epoch ms — freshness signal #1. */
  lastUpdatedAt: number
}

export interface MarketPriceSnapshot {
  quotes: MarketPriceQuote[]
  usdKes: number
  fxProvider: PriceProvider
  /** Server epoch ms when this snapshot was assembled. */
  generatedAt: number
}