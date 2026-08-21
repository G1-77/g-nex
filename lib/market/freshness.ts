// lib/market/freshness.ts
// Price-staleness guards. A trade surface must refuse to execute against an
// obviously stale market-data snapshot. Thresholds reflect real provider
// cadence, measured where possible from OUR receipt clock so device clock
// skew can never permanently freeze trading:
//
//   Binance miniTicker WS  ~1s cadence   → ceiling 90s from local RECEIPT time
//   REST baseline snapshot (CoinGecko / xaus via /api/market/prices, cached
//                          server-side ≤60s) → ceiling 120s from snapshot ts
//   Gold (xaus upstream updates lag behind spot) → ceiling 300s
//
// The safety policy is unchanged: execution pauses on DELAYED/UNAVAILABLE.
// What changed is only the accuracy of the inputs feeding the decision.

/** Live-stream ceiling: anything with no tick for this long is treated as stale. */
export const PRICE_STALE_MS = 90_000

/** Server REST baseline snapshots refresh every ~30s; allow two missed cycles. */
export const BASELINE_STALE_MS = 120_000

/** Gold upstream publishes on a slower cadence than crypto feeds. */
export const GOLD_STALE_MS = 300_000

/** Ceiling for a REST-baseline-only symbol (no live stream overlay). */
export function baselineCeilingFor(symbol: string): number {
  return symbol.toUpperCase() === 'XAU' ? GOLD_STALE_MS : BASELINE_STALE_MS
}

export type PriceStatus = 'live' | 'delayed' | 'unavailable'

/**
 * The two independent clocks we can trust for freshness:
 *  - lastUpdatedAt: provider/event timestamp (catches stale cached payloads)
 *  - receivedAt: when WE observed it locally (immune to clock skew)
 * Age is the most optimistic of the available signals: a skewed-ahead device
 * clock must not fake staleness, and a genuinely old payload fails both.
 */
export interface PriceProvenance {
  lastUpdatedAt?: number
  receivedAt?: number
}

export function priceAgeMs(provenance: PriceProvenance | number | undefined, now = Date.now()): number | null {
  if (typeof provenance === 'number') {
    if (!Number.isFinite(provenance) || provenance <= 0) return null
    return Math.max(0, now - provenance)
  }
  const signals = [provenance?.lastUpdatedAt, provenance?.receivedAt].filter(
    (t): t is number => typeof t === 'number' && Number.isFinite(t) && t > 0
  )
  if (signals.length === 0) return null
  return Math.min(...signals.map((t) => Math.max(0, now - t)))
}

/**
 * True when the snapshot is missing provenance or older than the ceiling.
 * Unknown age counts as stale — never pretend freshness we cannot prove.
 */
export function isPriceStale(
  provenance: PriceProvenance | number | undefined,
  now = Date.now(),
  ceilingMs: number = PRICE_STALE_MS
): boolean {
  const age = priceAgeMs(provenance, now)
  if (age === null) return true
  return age > ceilingMs
}

/** Three-state status for UI pills. Missing/invalid data is UNAVAILABLE. */
export function getPriceStatus(
  provenance: PriceProvenance | number | undefined,
  now = Date.now(),
  ceilingMs: number = PRICE_STALE_MS
): PriceStatus {
  const age = priceAgeMs(provenance, now)
  if (age === null) return 'unavailable'
  return age > ceilingMs ? 'delayed' : 'live'
}
