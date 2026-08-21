// lib/market/price-service.ts
// Server-side authoritative market snapshot. Assembles crypto (CoinGecko),
// gold (xaus) and the USD/KES rate into provenance-carrying quotes. The
// browser never talks to providers directly — it consumes this through
// GET /api/market/prices.

import type {
  CoinGeckoMarket,
  MarketPrice,
  MarketPriceQuote,
  MarketPriceSnapshot,
  PriceProvider,
} from '@/types/market'

import { fetchCryptoPrices } from './coingecko'
import { fetchGoldPrice } from './gold'
import { fetchUsdKesRate } from './fx'
import { normalizeCrypto } from './normalize'
import { SYMBOL_COINGECKO_ID, TRADABLE_SYMBOLS } from './execution'

type Asset = {
  symbol: string
  type: 'crypto' | 'gold'
  coingecko_id: string | null
}

function providerFor(symbol: string): PriceProvider {
  if (symbol === 'XAU') return 'xaus'
  return 'coingecko'
}

function providerSymbolFor(symbol: string): string {
  if (symbol === 'XAU') return 'XAU'
  return SYMBOL_COINGECKO_ID[symbol] ?? symbol.toLowerCase()
}

/** Static catalogue → provider asset descriptors for the tradable universe. */
export function tradableAssets(symbols?: string[]): Asset[] {
  const wanted = (symbols?.length ? symbols : [...TRADABLE_SYMBOLS]).map((s) => s.toUpperCase())
  return wanted.map((symbol) => ({
    symbol,
    type: symbol === 'XAU' ? ('gold' as const) : ('crypto' as const),
    coingecko_id: SYMBOL_COINGECKO_ID[symbol] ?? null,
  }))
}

/**
 * Full authoritative snapshot: one quote per requested asset plus the FX rate
 * used for KES derivation. A gold outage degrades only the gold row.
 */
export async function getMarketPriceSnapshot(symbols?: string[]): Promise<MarketPriceSnapshot> {
  const assets = tradableAssets(symbols)
  const cryptoAssets = assets.filter(
    (a): a is Asset & { coingecko_id: string } =>
      a.type === 'crypto' && a.coingecko_id !== null
  )

  const ids = cryptoAssets.map((a) => a.coingecko_id)

  const [cryptoData, goldResult, usdKes] = await Promise.all([
    ids.length > 0
      ? fetchCryptoPrices(ids)
      : Promise.resolve<CoinGeckoMarket[]>([]),
    assets.some((a) => a.symbol === 'XAU')
      ? fetchGoldPrice().catch((err) => {
          // A gold provider outage degrades the gold row, never the whole market.
          console.error('Gold price unavailable for market snapshot:', err)
          return null
        })
      : Promise.resolve(null),
    fetchUsdKesRate(),
  ])

  const quotes: MarketPriceQuote[] = []

  for (const c of cryptoData) {
    const normalized: MarketPrice = normalizeCrypto(c, usdKes)
    const providerTs = Date.parse(normalized.last_updated)
    quotes.push({
      symbol: normalized.symbol,
      provider: providerFor(normalized.symbol),
      providerSymbol: providerSymbolFor(normalized.symbol),
      currency: 'USD',
      priceUsd: normalized.price_usd,
      priceKes: normalized.price_kes,
      change24h: normalized.change_24h,
      high24h: normalized.high_24h,
      low24h: normalized.low_24h,
      volume24h: normalized.volume_24h,
      marketCap: normalized.market_cap,
      lastUpdatedAt: Number.isFinite(providerTs) && providerTs > 0 ? providerTs : Date.now(),
    })
  }

  if (goldResult) {
    const providerTs = Date.parse(goldResult.last_updated)
    quotes.push({
      symbol: 'XAU',
      provider: 'xaus',
      providerSymbol: 'XAU',
      currency: 'USD',
      priceUsd: goldResult.price_usd,
      priceKes: goldResult.price_usd * usdKes,
      change24h: goldResult.change_24h,
      high24h: goldResult.high_usd,
      low24h: goldResult.low_usd,
      marketCap: goldResult.market_cap_usd ?? undefined,
      lastUpdatedAt: Number.isFinite(providerTs) && providerTs > 0 ? providerTs : Date.now(),
    })
  }

  return {
    quotes,
    usdKes,
    fxProvider: 'exchangerate-api',
    generatedAt: Date.now(),
  }
}

interface LegacyAsset {
  symbol: string
  type: 'crypto' | 'gold'
  coingecko_id: string | null
}

/** Legacy flat-snapshot shape kept for existing server-side consumers. */
export async function getMarketPrices(assets: LegacyAsset[]): Promise<MarketPrice[]> {
  const symbols = assets.map((a) => a.symbol)
  const snapshot = await getMarketPriceSnapshot(symbols)

  // Preserve the legacy contract: requested-but-failed rows are simply absent.
  const bySymbol = new Map(snapshot.quotes.map((q) => [q.symbol.toUpperCase(), q]))
  return assets
    .map((asset) => {
      const quote = bySymbol.get(asset.symbol.toUpperCase())
      if (!quote) return null
      return {
        symbol: quote.symbol,
        price_usd: quote.priceUsd,
        price_kes: quote.priceKes,
        change_24h: quote.change24h,
        volume_24h: quote.volume24h,
        market_cap: quote.marketCap,
        high_24h: quote.high24h,
        low_24h: quote.low24h,
        last_updated: new Date(quote.lastUpdatedAt).toISOString(),
      } satisfies MarketPrice
    })
    .filter((p): p is MarketPrice => p !== null)
}
