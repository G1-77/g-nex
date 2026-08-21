// lib/market/freshness.ts
// Price-staleness guards. A trade surface must refuse to execute against an
// obviously stale market-data snapshot. Thresholds reflect provider cadence:
// Binance miniTicker streams ~1s, CoinGecko baseline polls every 30s (60s
// server cache), gold refreshes on a 60s cache against a slower upstream.

/** Universal ceiling: anything older than this is treated as stale everywhere. */
export const PRICE_STALE_MS = 90_000

export function priceAgeMs(lastUpdatedAt: number | undefined, now = Date.now()): number | null {
  if (!lastUpdatedAt || !Number.isFinite(lastUpdatedAt) || lastUpdatedAt <= 0) return null
  return Math.max(0, now - lastUpdatedAt)
}

/**
 * True when the snapshot is missing provenance or older than the ceiling.
 * Unknown age counts as stale — never pretend freshness we cannot prove.
 */
export function isPriceStale(lastUpdatedAt: number | undefined, now = Date.now()): boolean {
  const age = priceAgeMs(lastUpdatedAt, now)
  if (age === null) return true
  return age > PRICE_STALE_MS
}
