'use client'

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getMarketPrices } from '@/lib/market/price-service'
import { useBinanceRealtime } from '@/lib/market/binance-realtime'
import { MARKET_ASSETS } from '@/lib/constants/market-assets'
import type { MarketTicker } from '@/lib/supabase/market.types'
import type { MarketPrice } from '@/types/market'
import type { AssetSymbol } from '@/lib/supabase/types'

// Convert API price data to MarketTicker format
function convertToMarketTickers(priceData: MarketPrice[], watchlist: AssetSymbol[] = []): MarketTicker[] {
  return priceData.map((price) => {
    const asset = MARKET_ASSETS[price.symbol as AssetSymbol]
    
    // Generate simple sparkline from price changes (mock for now)
    const currentPrice = price.price_usd
    const change = price.change_24h
    const prevPrice = currentPrice / (1 + change / 100)
    const sparkline = [
      prevPrice * 0.99,
      prevPrice * 1.01,
      prevPrice * 0.98,
      prevPrice * 1.02,
      currentPrice * 0.99,
      currentPrice
    ]

    // Calculate bullish sentiment (simplified - based on positive change)
    const bullishPercent = change >= 0 ? Math.min(70 + change * 2, 90) : Math.max(30 + change * 2, 10)

    return {
      symbol: price.symbol as AssetSymbol,
      name: asset?.name || price.symbol,
      logo: asset?.logo || '',
      priceUsd: price.price_usd,
      change24h: price.change_24h,
      bullishPercent: Math.round(bullishPercent),
      watcherCount: Math.floor(Math.random() * 2000) + 100, // Mock for now
      isWatching: watchlist.includes(price.symbol as AssetSymbol),
      sparkline
    }
  })
}

export function useMarketPrices(watchlist: AssetSymbol[] = []) {
  const liveTickers = useBinanceRealtime()

  const { data, ...queryResult } = useQuery({
    queryKey: ['market-prices', watchlist],
    queryFn: async () => {
      const assets = Object.values(MARKET_ASSETS).map(asset => ({
        symbol: asset.symbol,
        type: (asset.assetType === 'stable' ? 'crypto' : asset.assetType) as 'crypto' | 'gold',
        coingecko_id: {
          BTC: 'bitcoin',
          ETH: 'ethereum',
          SOL: 'solana',
          XRP: 'ripple',
          USDT: 'tether',
          XAU: null
        }[asset.symbol] as string | null
      }))

      const prices = await getMarketPrices(assets)
      return convertToMarketTickers(prices, watchlist)
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 30, // fallback baseline; Binance WS drives live updates
  })

  // Overlay live Binance prices over the polling baseline
  const liveData = useMemo(() => {
    if (!data) return data
    return data.map((ticker) => {
      const live = liveTickers.get(ticker.symbol)
      if (!live) return ticker
      const change = live.change24h
      const sparkline = [...ticker.sparkline.slice(0, -1), live.priceUsd]
      return {
        ...ticker,
        priceUsd: live.priceUsd,
        change24h: change,
        sparkline
      }
    })
  }, [data, liveTickers])

  return { ...queryResult, data: liveData }
}