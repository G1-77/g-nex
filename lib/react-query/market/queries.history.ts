'use client'

// lib/react-query/market/queries.history.ts
// Real price-history channel for sparklines. Wraps the EXISTING authoritative
// server-proxied OHLC endpoint (GET /api/market/ohlc → Binance klines /
// xaus gold history). No browser-to-provider calls, no synthetic series: when
// a symbol's candles cannot be fetched the symbol is simply omitted and the
// consuming UI degrades by hiding the sparkline instead of drawing a fake one.

import { useQuery } from '@tanstack/react-query'
import type { Timeframe } from '@/lib/market/ohlc'

export interface HistoryPoint {
  time: number
  close: number
}

export interface HistoryClosesParams {
  symbols: string[]
  timeframe: Timeframe
  /** Max trailing candles per symbol. */
  points: number
}

/** symbol → ascending [{ time, close }] */
export type SymbolCloses = Record<string, HistoryPoint[]>

async function fetchSymbolCloses(
  symbol: string,
  timeframe: Timeframe,
  points: number
): Promise<HistoryPoint[]> {
  const res = await fetch(`/api/market/ohlc?symbol=${encodeURIComponent(symbol)}&timeframe=${timeframe}`)
  if (!res.ok) throw new Error(`OHLC unavailable for ${symbol}`)
  const payload = (await res.json()) as { candles?: { time: number; close: number }[] }
  return (payload.candles ?? [])
    .slice(-points)
    .filter((c) => Number.isFinite(c.close))
    .map((c) => ({ time: c.time, close: c.close }))
}

/**
 * Fetch trailing closes for a fixed set of symbols through one cached query.
 * Per-symbol failures are tolerated (allSettled) so one flaky provider never
 * blanks an entire section. Pass `null` to disable.
 */
export function useOHLCcloses(params: HistoryClosesParams | null) {
  const symbolsKey = params?.symbols.join(',') ?? ''

  return useQuery({
    queryKey: ['market', 'ohlc-closes', symbolsKey, params?.timeframe, params?.points],
    queryFn: async (): Promise<SymbolCloses> => {
      if (!params) return {}
      const results = await Promise.allSettled(
        params.symbols.map((symbol) => fetchSymbolCloses(symbol, params.timeframe, params.points))
      )
      const out: SymbolCloses = {}
      results.forEach((result, i) => {
        if (result.status === 'fulfilled' && result.value.length >= 2) {
          out[params.symbols[i]] = result.value
        }
      })
      return out
    },
    enabled: Boolean(params && params.symbols.length > 0),
    staleTime: 1000 * 60 * 5,
    refetchInterval: 1000 * 60 * 5,
    retry: 1,
  })
}
