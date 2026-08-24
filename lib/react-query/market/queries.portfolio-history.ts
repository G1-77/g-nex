'use client'

// lib/react-query/market/queries.portfolio-history.ts
// 24-hour portfolio performance, derived ONLY from authoritative inputs:
//   • holdings (user_holdings via the existing query channel)
//   • live prices + provider 24h change (shared useMarketPrices cache)
//   • hourly candle closes for held symbols (existing /api/market/ohlc route)
//
// No wallet-PNL history table exists in GNEX, so nothing here "replays"
// fabricated history: the PNL figure is the exact arithmetic implication of
// the authoritative 24h price changes applied to current holdings (KES cash
// is flat by definition and excluded from market PNL), and the sparkline
// series rebuilds portfolio VALUE from real hourly closes. When real candles
// are unavailable the series is null and the UI hides it — never a fake line.

import { useMemo } from 'react'

import { useOHLCcloses } from '@/lib/react-query/market/queries.history'
import {
  useGetUserHoldingsQuery,
  useGetUserWalletQuery,
  useUsdKesRate,
} from '@/lib/react-query/market/queries.market'
import { useMarketPrices } from '@/lib/react-query/market/queries.prices'

export interface PortfolioPnl24h {
  pnlKes: number | null
  pnlPct: number | null
}

/**
 * 24h PNL over market holdings: Σ units × (priceNow − price24hAgo), where
 * price24hAgo = priceNow / (1 + change24h/100) comes straight from the
 * provider-supplied change already in the shared ticker cache.
 */
export function usePortfolioPnl24h(userId: string | null): PortfolioPnl24h {
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: tickers = [] } = useMarketPrices()
  const { data: usdKes = 130 } = useUsdKesRate()

  return useMemo<PortfolioPnl24h>(() => {
    if (holdings.length === 0) return { pnlKes: null, pnlPct: null }

    const bySymbol = new Map(tickers.map((t) => [t.symbol, t]))
    let pnlUsd = 0
    let valueAgoUsd = 0
    let counted = false

    for (const holding of holdings) {
      const ticker = bySymbol.get(holding.assetSymbol)
      if (!ticker || !Number.isFinite(ticker.priceUsd)) continue
      const frac = ticker.change24h / 100
      // A -100% change cannot be inverted into an honest "yesterday" price.
      if (frac <= -1 || !Number.isFinite(frac)) continue

      counted = true
      const valueNowUsd = holding.units * ticker.priceUsd
      const valueAgoAssetUsd = valueNowUsd / (1 + frac)
      pnlUsd += valueNowUsd - valueAgoAssetUsd
      valueAgoUsd += valueAgoAssetUsd
    }

    if (!counted) return { pnlKes: null, pnlPct: null }

    return {
      pnlKes: pnlUsd * usdKes,
      pnlPct: valueAgoUsd > 0 ? (pnlUsd / valueAgoUsd) * 100 : null,
    }
  }, [holdings, tickers, usdKes])
}

/**
 * Trailing ~24h portfolio value series (hourly resolution): cash + Σ units ×
 * real hourly closes × FX. Gold has no honest intraday bars upstream, so XAU
 * holdings contribute to the PNL figure above but not to this series; with no
 * series-capable holdings the hook returns null and the UI hides the chart.
 */
export function usePortfolioValueSeries(userId: string | null): number[] | null {
  const { data: wallet } = useGetUserWalletQuery(userId)
  const { data: holdings = [] } = useGetUserHoldingsQuery(userId)
  const { data: usdKes = 130 } = useUsdKesRate()

  // Symbols eligible for hourly candles — gold's daily-only history is
  // deliberately excluded rather than mislabeled (matches OHLC route policy).
  const seriesSymbols = useMemo(
    () =>
      [...new Set(holdings.filter((h) => h.units > 0 && h.assetSymbol !== 'XAU').map((h) => h.assetSymbol))],
    [holdings]
  )

  const { data: closes } = useOHLCcloses(
    seriesSymbols.length > 0 ? { symbols: seriesSymbols, timeframe: '1H', points: 25 } : null
  )

  return useMemo<number[] | null>(() => {
    if (!closes) return null

    const relevant = holdings.filter(
      (h) => h.units > 0 && h.assetSymbol !== 'XAU' && (closes[h.assetSymbol]?.length ?? 0) >= 2
    )
    if (relevant.length === 0) return null

    const cashKes = (wallet?.balanceKes ?? 0) + (wallet?.lockedKes ?? 0)

    // Per-symbol time→close maps plus carry-forward of the last known close
    // across sparse timestamps (last traded price — never interpolated data).
    const closeMaps = new Map<string, Map<number, number>>(
      relevant.map((h) => [h.assetSymbol, new Map(closes[h.assetSymbol].map((p) => [p.time, p.close]))])
    )

    const allTimes = new Set<number>()
    let firstCommon = 0
    for (const map of closeMaps.values()) {
      for (const time of map.keys()) allTimes.add(time)
      const earliest = Math.min(...map.keys())
      firstCommon = Math.max(firstCommon, earliest)
    }

    const sortedTimes = [...allTimes].filter((t) => t >= firstCommon).sort((a, b) => a - b)
    if (sortedTimes.length < 2) return null

    const lastKnown = new Map<string, number>()
    const series: number[] = []

    for (const time of sortedTimes) {
      let valueKes = cashKes
      for (const h of relevant) {
        const exact = closeMaps.get(h.assetSymbol)?.get(time)
        if (exact !== undefined) lastKnown.set(h.assetSymbol, exact)
        const known = lastKnown.get(h.assetSymbol)
        if (known !== undefined) valueKes += h.units * known * usdKes
      }
      series.push(valueKes)
    }

    return series.length >= 2 ? series : null
  }, [closes, holdings, wallet, usdKes])
}
