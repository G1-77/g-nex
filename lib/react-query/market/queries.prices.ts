'use client'

// lib/react-query/market/queries.prices.ts
// Client price channel. Polls the authoritative server snapshot
// (GET /api/market/prices → CoinGecko/xaus/FX, cached server-side) and
// overlays the Binance WS stream for real-time crypto ticks. No provider is
// ever contacted from the browser, and every ticker carries provenance.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { MarketPriceSnapshot } from '@/types/market'
import type { AssetSymbol } from '@/lib/supabase/types'

function toTickers(snapshot: MarketPriceSnapshot, watchlist: AssetSymbol[], receivedAt: number): MarketTicker[] {
  return snapshot.quotes.map((quote) => {
    const asset = MARKET_ASSETS[quote.symbol as AssetSymbol]
    const change = quote.change24h

    // Sparkline: honest linear path between the 24h-ago close implied by the
    // real change% and the current real price. Endpoints are market data;
    // only the intermediate shape is interpolated.
    const prevPrice = change === -100 ? quote.priceUsd : quote.priceUsd / (1 + change / 100)
    const sparkline = Array.from({ length: 6 }, (_, i) =>
      prevPrice + ((quote.priceUsd - prevPrice) * i) / 5
    )

    const bullishPercent = change >= 0 ? Math.min(70 + change * 2, 90) : Math.max(30 + change * 2, 10)

    return {
      symbol: quote.symbol as AssetSymbol,
      name: asset?.name || quote.symbol,
      logo: asset?.logo || '',
      priceUsd: quote.priceUsd,
      change24h: change,
      bullishPercent: Math.round(bullishPercent),
      watcherCount: 0,
      isWatching: watchlist.includes(quote.symbol as AssetSymbol),
      sparkline,
      marketCap: quote.marketCap,
      volume24h: quote.volume24h,
      high24h: quote.high24h,
      low24h: quote.low24h,
      lastUpdatedAt: quote.lastUpdatedAt,
      receivedAt,
      provider: quote.provider,
    }
  })
}

export function useMarketPrices(watchlist: AssetSymbol[] = []) {
  const liveTickers = useBinanceRealtime()

  const { data, ...queryResult } = useQuery({
    queryKey: ['market-prices'],
    queryFn: async (): Promise<MarketTicker[]> => {
      const res = await fetch('/api/market/prices')
      if (!res.ok) {
        const message = await res.text()
        throw new Error(message || 'Market data unavailable')
      }
      const snapshot = (await res.json()) as MarketPriceSnapshot
      return toTickers(snapshot, [], Date.now())
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30, // baseline; the Binance WS drives sub-second updates
  })

  // Overlay live Binance prices over the polling baseline. The overlay keeps
  // the baseline's provenance fields but stamps its own receipt time so
  // staleness guards evaluate the freshest honest signal.
  const liveData = useMemo(() => {
    if (!data) return data
    return data.map((ticker) => {
      const live = liveTickers.get(ticker.symbol)
      if (!live) return ticker
      const sparkline = [...ticker.sparkline.slice(0, -1), live.priceUsd]
      return {
        ...ticker,
        priceUsd: live.priceUsd,
        change24h: live.change24h,
        sparkline,
        high24h: live.high24h || ticker.high24h,
        low24h: live.low24h || ticker.low24h,
        lastUpdatedAt: live.lastUpdated,
        receivedAt: live.receivedAt,
        provider: 'binance' as const,
      }
    })
  }, [data, liveTickers])

  const withWatchlist = useMemo(() => {
    if (!liveData) return liveData
    if (watchlist.length === 0) return liveData
    return liveData.map((ticker) => ({
      ...ticker,
      isWatching: watchlist.includes(ticker.symbol),
    }))
  }, [liveData, watchlist])

  return { ...queryResult, data: withWatchlist }
}
